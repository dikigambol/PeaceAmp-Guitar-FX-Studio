import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { PedalInstance } from '../../types/pedal';
import { PEDAL_DEFINITIONS } from '../../audio/pedals/registry';
import { Stompbox } from './Stompbox';
import {
  PEDAL_WIDTH,
  JACK_Y_OFFSET,
  getPedalDimensions,
  findNearestFreePosition,
  calculateNextPedalPosition,
} from './pedalLayout';
import { Plus, SlidersHorizontal, Cable, Magnet, Unplug, RotateCcw, Search, X } from 'lucide-react';

export interface PatchConnection {
  id: string;
  fromNodeId: string; // 'BOARD_INPUT' or pedalId
  toNodeId: string;   // 'BOARD_OUTPUT' or pedalId
  cableColor?: 'bone-ivory' | 'tweed' | 'oxblood' | 'rubber';
}

interface PedalboardProps {
  pedals: PedalInstance[];
  positions?: Record<string, Position>;
  onPositionsChange?: (positions: Record<string, Position>) => void;
  connections?: PatchConnection[];
  onConnectionsChange?: (connections: PatchConnection[]) => void;
  onToggleEnabled: (id: string) => void;
  onChangeParam: (id: string, paramId: string, val: number) => void;
  onRemovePedal: (id: string) => void;
  onAddPedal: (type: string) => void;
  onLoadCustomIR?: (pedalId: string, file: File) => void;
  onActiveChainChange?: (activePedals: PedalInstance[], activeConnections: PatchConnection[]) => void;
}

interface Position {
  x: number;
  y: number;
}

export const Pedalboard: React.FC<PedalboardProps> = ({
  pedals,
  positions: positionsProp,
  onPositionsChange,
  connections: connectionsProp,
  onConnectionsChange,
  onToggleEnabled,
  onChangeParam,
  onRemovePedal,
  onAddPedal,
  onLoadCustomIR,
  onActiveChainChange,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [pedalSearch, setPedalSearch] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<
    'all' | 'amp' | 'cabinet' | 'gate' | 'dynamics' | 'drive' | 'distortion' | 'fuzz' | 'boost' | 'wah' | 'eq' | 'chorus' | 'delay' | 'flanger' | 'phaser' | 'pitch' | 'tremolo' | 'vibrato' | 'reverb'
  >('all');
  const addMenuRef = useRef<HTMLDivElement>(null);
  const [showCables, setShowCables] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(() => {
    return localStorage.getItem('web_guitar_snap_grid') !== 'false';
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Close add pedal dropdown on click outside
  useEffect(() => {
    if (!showAddMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddMenu]);

  // Surface measured width (tracks responsive width of dashboard canvas stage)
  const [surfaceWidth, setSurfaceWidth] = useState<number>(1200);

  // Pending Jack selection for manual cable patching
  const [pendingJack, setPendingJack] = useState<{
    nodeId: string;
    port: 'in' | 'out';
  } | null>(null);

  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Canvas refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  // Measure surface width with ResizeObserver so output jack stays pinned to right edge
  useEffect(() => {
    const updateSize = () => {
      if (surfaceRef.current) {
        const w = surfaceRef.current.clientWidth;
        if (w > 0) setSurfaceWidth(w);
      }
    };
    updateSize();

    const el = surfaceRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setSurfaceWidth(entry.contentRect.width);
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pedal free positions (keyed by pedal id)
  const [positions, setPositions] = useState<Record<string, Position>>(() => {
    if (positionsProp && Object.keys(positionsProp).length > 0) {
      return positionsProp;
    }
    try {
      const saved = localStorage.getItem('web_guitar_pedal_coords');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sync positions when updated from external preset load
  useEffect(() => {
    if (positionsProp && Object.keys(positionsProp).length > 0) {
      // Intentional sync: preset loads replace the editable canvas layout.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPositions((prev) => {
        const prevJson = JSON.stringify(prev);
        const nextJson = JSON.stringify(positionsProp);
        return prevJson !== nextJson ? positionsProp : prev;
      });
    }
  }, [positionsProp]);


  // Drag tracking ref
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Calculate default position for a newly added pedal (flowing right-to-left towards amplifier)
  const getDefaultPos = useCallback(
    (index: number): Position => {
      const availableW = Math.max(480, surfaceWidth - 240);
      const maxCols = Math.max(1, Math.min(4, Math.floor(availableW / 260)));
      const col = index % maxCols;
      const row = Math.floor(index / maxCols);
      return {
        x: Math.max(120, surfaceWidth - 140 - PEDAL_WIDTH - col * 260),
        y: 40 + row * 410,
      };
    },
    [surfaceWidth]
  );

  // Auto-arrange all pedals into neat rows and columns (flowing right-to-left following guitar signal flow)
  const autoArrangePedals = useCallback(
    (pedalList: PedalInstance[]) => {
      if (pedalList.length === 0) {
        setPositions({});
        try {
          localStorage.removeItem('web_guitar_pedal_coords');
        } catch { }
        onPositionsChange?.({});
        return;
      }

      if (pedalList.length === 1) {
        const firstDims = getPedalDimensions(pedalList[0].type);
        const nextPos: Record<string, Position> = {
          [pedalList[0].id]: {
            x: Math.round(Math.max(120, (surfaceWidth - firstDims.w) / 2)),
            y: 40,
          },
        };
        setPositions(nextPos);
        try {
          localStorage.setItem('web_guitar_pedal_coords', JSON.stringify(nextPos));
        } catch { }
        onPositionsChange?.(nextPos);
        return;
      }

      const nextPos: Record<string, Position> = {};
      const placedSoFar: PedalInstance[] = [];
      pedalList.forEach((p) => {
        nextPos[p.id] = calculateNextPedalPosition(p, placedSoFar, nextPos, surfaceWidth);
        placedSoFar.push(p);
      });

      setPositions(nextPos);
      try {
        localStorage.setItem('web_guitar_pedal_coords', JSON.stringify(nextPos));
      } catch { }
      onPositionsChange?.(nextPos);
    },
    [surfaceWidth, onPositionsChange]
  );

  // Ensure all existing pedals have a valid, non-overlapping position
  useEffect(() => {
    let hasNew = false;
    const next = { ...positions };
    pedals.forEach((p) => {
      if (!next[p.id]) {
        next[p.id] = calculateNextPedalPosition(p, pedals, next, surfaceWidth);
        hasNew = true;
      }
    });
    if (hasNew) {
      // Intentional sync: auto-place pedals that arrived without saved coordinates.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPositions(next);
      try {
        localStorage.setItem('web_guitar_pedal_coords', JSON.stringify(next));
      } catch { }
      onPositionsChange?.(next);
    }
  }, [pedals, positions, surfaceWidth, onPositionsChange]);

  // Patch Connections State (Uniform Vintage Bone-White Ivory)
  const generateDefaultConnections = useCallback((pedalList: PedalInstance[]): PatchConnection[] => {
    const list: PatchConnection[] = [];

    if (pedalList.length === 0) {
      list.push({
        id: 'conn-direct-bypass',
        fromNodeId: 'BOARD_INPUT',
        toNodeId: 'BOARD_OUTPUT',
        cableColor: 'bone-ivory' as const,
      });
      return list;
    }

    // Board IN -> Pedal 0
    list.push({
      id: `conn-in-${pedalList[0].id}`,
      fromNodeId: 'BOARD_INPUT',
      toNodeId: pedalList[0].id,
      cableColor: 'bone-ivory' as const,
    });

    // Pedal i -> Pedal i+1
    for (let i = 0; i < pedalList.length - 1; i++) {
      list.push({
        id: `conn-${pedalList[i].id}-${pedalList[i + 1].id}`,
        fromNodeId: pedalList[i].id,
        toNodeId: pedalList[i + 1].id,
        cableColor: 'bone-ivory' as const,
      });
    }

    // Last Pedal -> Board OUT
    const last = pedalList[pedalList.length - 1];
    list.push({
      id: `conn-${last.id}-out`,
      fromNodeId: last.id,
      toNodeId: 'BOARD_OUTPUT',
      cableColor: 'bone-ivory' as const,
    });

    return list;
  }, []);

  // Controlled patch connections (App.tsx is the single source of truth for rig presets)
  // Only display cables when pedals are present and endpoints exist on the board
  const connections = useMemo(() => {
    if (!connectionsProp || connectionsProp.length === 0 || pedals.length === 0) {
      return [];
    }
    const currentPedalIdSet = new Set(pedals.map((p) => p.id));
    return connectionsProp.filter((c) => {
      const fromValid = c.fromNodeId === 'BOARD_INPUT' || currentPedalIdSet.has(c.fromNodeId);
      const toValid = c.toNodeId === 'BOARD_OUTPUT' || currentPedalIdSet.has(c.toNodeId);
      return fromValid && toValid;
    });
  }, [connectionsProp, pedals]);

  // Dispatch connection updates to parent and persist to localStorage
  const updateConnections = useCallback(
    (updater: PatchConnection[] | ((prev: PatchConnection[]) => PatchConnection[])) => {
      const next = typeof updater === 'function' ? updater(connections) : updater;
      try {
        localStorage.setItem('web_guitar_patch_cables', JSON.stringify(next));
      } catch { }
      onConnectionsChange?.(next);
    },
    [connections, onConnectionsChange]
  );

  // Calculate dynamic vertical height based on lowest pedal
  const surfaceHeight = useMemo(() => {
    if (pedals.length === 0) return 0;
    let maxY = 450;
    pedals.forEach((p) => {
      const pos = positions[p.id];
      if (pos) {
        const dims = getPedalDimensions(p.type);
        if (pos.y + dims.h > maxY) maxY = pos.y + dims.h;
      }
    });
    return Math.max(600, maxY + 70);
  }, [pedals, positions]);

  // Jack center coordinates lookup (INPUT and OUTPUT boxes stay permanently pinned)
  const getJackCoords = useCallback(
    (nodeId: string, port: 'in' | 'out'): { x: number; y: number } => {
      if (nodeId === 'BOARD_INPUT') {
        // Fixed at right: 20px, top: 40px -> nut center is (surfaceWidth - 20 - 36, 40 + 47)
        return { x: surfaceWidth - 56, y: 87 };
      }
      if (nodeId === 'BOARD_OUTPUT') {
        // Fixed at left: 20px, top: 40px -> nut center is (20 + 36, 40 + 47)
        return { x: 56, y: 87 };
      }

      const pos = positions[nodeId] || { x: 120, y: 40 };
      const pedal = pedals.find((p) => p.id === nodeId);
      const curDims = pedal ? getPedalDimensions(pedal.type) : { w: PEDAL_WIDTH, h: 360 };
      const isAmpHead = pedal?.type === 'amp-head';
      const isFuzzFace = pedal?.type === 'fuzz-fuzzface';
      const isToneBender = pedal?.type === 'fuzz-tonebender';
      const isFuzzFactory = pedal?.type === 'fuzz-fuzzfactory';
      const isFlatiron = pedal?.type === 'fuzz-flatiron';
      const isHoof = pedal?.type === 'fuzz-hoof';
      const isMxrFlanger = pedal?.type === 'flanger-mxr';
      const isSupaTrem = pedal?.type === 'tremolo-fulltone-supatrem';
      const isJhsHall = pedal?.type === 'reverb-jhs-hall';
      const curWidth = curDims.w;
      const curJackY = isAmpHead ? 225 : isFuzzFace ? 86 : isToneBender ? 68 : isFuzzFactory ? 88 : isMxrFlanger ? 88 : isFlatiron ? 114 : isHoof ? 104 : isSupaTrem ? 116 : isJhsHall ? 220 : JACK_Y_OFFSET;
      if (port === 'in') {
        // Right side jack (pedal input is on the right)
        return { x: pos.x + curWidth + 2, y: pos.y + curJackY };
      } else {
        // Left side jack (pedal output is on the left)
        return { x: pos.x - 2, y: pos.y + curJackY };
      }
    },
    [surfaceWidth, positions, pedals]
  );

  // Compute active signal DAG from BOARD_INPUT to BOARD_OUTPUT (supports both serial chains and parallel Multi-Amp / Wet-Dry-Wet branches)
  // If no valid path reaches BOARD_OUTPUT, returns empty arrays so the audio engine passes through clean sound.
  const { activeChain, activeConnections } = useMemo(() => {
    if (connections.length === 0 || pedals.length === 0) {
      return { activeChain: [] as PedalInstance[], activeConnections: [] as PatchConnection[] };
    }

    const forwardAdj = new Map<string, string[]>();
    const reverseAdj = new Map<string, string[]>();
    for (const c of connections) {
      if (!forwardAdj.has(c.fromNodeId)) forwardAdj.set(c.fromNodeId, []);
      forwardAdj.get(c.fromNodeId)!.push(c.toNodeId);

      if (!reverseAdj.has(c.toNodeId)) reverseAdj.set(c.toNodeId, []);
      reverseAdj.get(c.toNodeId)!.push(c.fromNodeId);
    }

    // 1. Forward BFS from BOARD_INPUT
    const reachableFromInput = new Set<string>(['BOARD_INPUT']);
    const qFwd: string[] = ['BOARD_INPUT'];
    while (qFwd.length > 0) {
      const curr = qFwd.shift()!;
      for (const next of forwardAdj.get(curr) || []) {
        if (!reachableFromInput.has(next)) {
          reachableFromInput.add(next);
          qFwd.push(next);
        }
      }
    }

    if (!reachableFromInput.has('BOARD_OUTPUT')) {
      return { activeChain: [] as PedalInstance[], activeConnections: [] as PatchConnection[] };
    }

    // 2. Reverse BFS from BOARD_OUTPUT
    const canReachOutput = new Set<string>(['BOARD_OUTPUT']);
    const qRev: string[] = ['BOARD_OUTPUT'];
    while (qRev.length > 0) {
      const curr = qRev.shift()!;
      for (const prev of reverseAdj.get(curr) || []) {
        if (!canReachOutput.has(prev)) {
          canReachOutput.add(prev);
          qRev.push(prev);
        }
      }
    }

    // 3. Active edges lie on at least one valid path from BOARD_INPUT to BOARD_OUTPUT
    const validConns = connections.filter(
      (c) => reachableFromInput.has(c.fromNodeId) && canReachOutput.has(c.toNodeId)
    );

    // 4. Active nodes ordered by BFS discovery from BOARD_INPUT
    const orderedIds: string[] = [];
    const seenIds = new Set<string>();
    const qOrder: string[] = ['BOARD_INPUT'];
    while (qOrder.length > 0) {
      const curr = qOrder.shift()!;
      for (const next of forwardAdj.get(curr) || []) {
        if (
          next !== 'BOARD_INPUT' &&
          next !== 'BOARD_OUTPUT' &&
          reachableFromInput.has(next) &&
          canReachOutput.has(next) &&
          !seenIds.has(next)
        ) {
          seenIds.add(next);
          orderedIds.push(next);
          qOrder.push(next);
        }
      }
    }

    const pedalMap = new Map(pedals.map((p) => [p.id, p]));
    const chain = orderedIds.map((id) => pedalMap.get(id)!).filter(Boolean);

    return { activeChain: chain, activeConnections: validConns };
  }, [connections, pedals]);

  // Notify parent of active audio chain and DAG connections
  useEffect(() => {
    onActiveChainChange?.(activeChain, activeConnections);
  }, [activeChain, activeConnections, onActiveChainChange]);

  // Handle Drag Pointer Down
  const handlePedalPointerDown = (id: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;

    // Do not initiate pedal movement if user interacted with knobs, buttons, selects, jacks, switches, or LEDs
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('option') ||
      target.closest('label') ||
      target.closest('svg') ||
      target.closest('.stompbox-side-jack') ||
      target.closest('.knob-dial-wrapper') ||
      target.closest('.knob-container') ||
      target.closest('.knob-rotary-mount') ||
      target.closest('.classic-stomp-wrap') ||
      target.closest('.classic-stomp-switch') ||
      target.closest('.classic-stomp-svg') ||
      target.closest('.classic-plunger-disc') ||
      target.closest('.ts808-switch-mount') ||
      target.closest('.ts808-square-switch') ||
      target.closest('.ts808-switch-bevel') ||
      target.closest('.ts808-switch-face') ||
      target.closest('.boss-treadle-plate') ||
      target.closest('.boss-treadle-pad') ||
      target.closest('.boss-rubber-pad') ||
      target.closest('.boss-embossed-logo') ||
      target.closest('.boss-grip-lines') ||
      target.closest('.boss-grip-line') ||
      target.closest('.boss-thumb-screw') ||
      target.closest('.boss-check-led-wrap') ||
      target.closest('.boss-check-led') ||
      target.closest('.ts9-treadle-btn') ||
      target.closest('.ts9-treadle-face') ||
      target.closest('.ts9-led-mount') ||
      target.closest('.ts808-led-mount') ||
      target.closest('.klon-led-mount') ||
      target.closest('.klon-stomp-switch') ||
      target.closest('.ocd-stomp-wrap') ||
      target.closest('.ocd-stomp-switch') ||
      target.closest('.ocd-stomp-svg') ||
      target.closest('.ocd-led-mount') ||
      target.closest('.ocd-toggle-switch') ||
      target.closest('.tsmini-stomp-wrap') ||
      target.closest('.tsmini-stomp-btn') ||
      target.closest('.tsmini-led-mount') ||
      target.closest('.nobels-treadle') ||
      target.closest('.nobels-led-mount') ||
      target.closest('.nobels-mini-push') ||
      target.closest('.archer-led-mount') ||
      target.closest('.bigmuff-led-mount') ||
      target.closest('.bigmuff-stomp-wrap') ||
      target.closest('.bigmuff-switch-nut') ||
      target.closest('.pedal-footswitch-section') ||
      target.closest('.pedal-footswitch') ||
      target.closest('.pedal-led-section') ||
      target.closest('.pedal-delete-button') ||
      target.closest('.smartgate-range-btn') ||
      target.closest('.smartgate-mode-assembly') ||
      target.closest('.smartgate-status-led-bezel') ||
      target.closest('.peaceamp-rocker-switch') ||
      target.closest('.peaceamp-model-select') ||
      target.closest('.peaceamp-front-jacks') ||
      target.closest('.peaceamp-hex-jack') ||
      target.closest('.ir200-push-btn') ||
      target.closest('.ir200-footswitch') ||
      target.closest('.ir200-lcd-screen')
    ) {
      return;
    }

    e.preventDefault();
    const curr = positions[id] || getDefaultPos(pedals.findIndex((p) => p.id === id));
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: curr.x,
      origY: curr.y,
    };
    setDraggingId(id);
  };

  // High-performance window-level pointer drag listener (prevents glitching/losing capture over wired cables)
  useEffect(() => {
    if (!draggingId) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current || dragRef.current.id !== draggingId) return;

      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;

      const rawX = dragRef.current.origX + deltaX;
      const rawY = dragRef.current.origY + deltaY;

      const targetX = snapToGrid ? Math.round(rawX / 20) * 20 : rawX;
      const targetY = snapToGrid ? Math.round(rawY / 20) * 20 : rawY;

      const minX = 110;
      const pedal = pedals.find((p) => p.id === dragRef.current?.id);
      const curDims = pedal ? getPedalDimensions(pedal.type) : { w: PEDAL_WIDTH, h: 360 };
      const curWidth = curDims.w;
      const maxX = Math.max(minX, surfaceWidth - curWidth - 110);
      const newX = Math.max(minX, Math.min(maxX, targetX));
      const newY = Math.max(20, targetY);

      const activeId = dragRef.current.id;
      setPositions((prev) => {
        if (prev[activeId]?.x === newX && prev[activeId]?.y === newY) return prev;
        return {
          ...prev,
          [activeId]: { x: newX, y: newY },
        };
      });
    };

    const onPointerUp = () => {
      const activeId = dragRef.current?.id;
      dragRef.current = null;
      setDraggingId(null);
      if (!activeId) return;

      setPositions((latest) => {
        const curPos = latest[activeId];
        if (!curPos) return latest;
        const pedal = pedals.find((p) => p.id === activeId);
        // Ensure dropped position does not overlap any other pedal
        const freePos = findNearestFreePosition(
          activeId,
          pedal?.type || '',
          curPos,
          pedals,
          latest,
          surfaceWidth
        );
        const resolved = {
          ...latest,
          [activeId]: freePos,
        };
        try {
          localStorage.setItem('web_guitar_pedal_coords', JSON.stringify(resolved));
        } catch { }
        onPositionsChange?.(resolved);
        return resolved;
      });
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [draggingId, snapToGrid, surfaceWidth, pedals, onPositionsChange]);

  // Track canvas mouse position for live dragging cable
  const handleSurfacePointerMove = (e: React.PointerEvent) => {
    if (pendingJack && surfaceRef.current) {
      const rect = surfaceRef.current.getBoundingClientRect();
      setMouseCanvasPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  // Handle Clicking on Jack Ports (Manual Patching)
  const handleJackClick = (nodeId: string, port: 'in' | 'out', e?: React.MouseEvent) => {
    e?.stopPropagation();

    // 1. If clicking the exact same pending jack, cancel patching
    if (pendingJack && pendingJack.nodeId === nodeId && pendingJack.port === port) {
      setPendingJack(null);
      return;
    }

    // 2. If no jack is pending, start a new patch connection
    if (!pendingJack) {
      setPendingJack({ nodeId, port });
      const coords = getJackCoords(nodeId, port);
      setMouseCanvasPos(coords);
      return;
    }

    // 3. User clicked another jack with an active pending jack
    if (pendingJack.port === port) {
      // Same port type clicked (e.g. out to out), switch the pending source
      setPendingJack({ nodeId, port });
      const coords = getJackCoords(nodeId, port);
      setMouseCanvasPos(coords);
      return;
    }

    // Must connect from an 'out' port to an 'in' port
    const fromId = pendingJack.port === 'out' ? pendingJack.nodeId : nodeId;
    const toId = pendingJack.port === 'in' ? pendingJack.nodeId : nodeId;

    // Disallow self-connection on same pedal
    if (fromId === toId) {
      setPendingJack(null);
      return;
    }

    // All cables are uniform vintage bone-white ivory
    const assignedColor = 'bone-ivory';

    updateConnections((prev) => {
      // 1. If the exact same cable (fromId -> toId) already exists, toggle/remove it
      const existingDuplicate = prev.find((c) => c.fromNodeId === fromId && c.toNodeId === toId);
      if (existingDuplicate) {
        return prev.filter((c) => c.id !== existingDuplicate.id);
      }

      // 2. Prevent feedback cycles in the audio graph: check if toId can already reach fromId
      const canReach = (start: string, target: string, edges: PatchConnection[]): boolean => {
        const visited = new Set<string>([start]);
        const queue: string[] = [start];
        while (queue.length > 0) {
          const curr = queue.shift()!;
          if (curr === target) return true;
          for (const edge of edges) {
            if (edge.fromNodeId === curr && !visited.has(edge.toNodeId)) {
              visited.add(edge.toNodeId);
              queue.push(edge.toNodeId);
            }
          }
        }
        return false;
      };

      if (canReach(toId, fromId, prev)) {
        return prev;
      }

      // 3. Support parallel Y-splits (1 OUT -> multiple INs) and Multi-Amp summing (multiple OUTs -> 1 IN / BOARD_OUTPUT)
      // Remove direct bypass cable if present
      const filtered = prev.filter((c) => c.id !== 'conn-direct-bypass');
      return [
        ...filtered,
        {
          id: `conn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          fromNodeId: fromId,
          toNodeId: toId,
          cableColor: assignedColor,
        },
      ];
    });

    setPendingJack(null);
  };

  // Remove a specific patch cable
  const handleRemoveConnection = (connId: string) => {
    updateConnections((prev) => prev.filter((c) => c.id !== connId));
  };

  // Restore default sequential wiring AND auto-arrange layout
  const handleResetDefaultWiring = () => {
    autoArrangePedals(pedals);
    updateConnections(generateDefaultConnections(pedals));
    setPendingJack(null);
  };

  // Unplug all cables
  const handleUnplugAll = () => {
    updateConnections([]);
    setPendingJack(null);
  };

  // Helper: check if a jack port is currently the pending cable source
  const isJackPending = (nodeId: string, port: 'in' | 'out'): boolean => {
    return pendingJack?.nodeId === nodeId && pendingJack?.port === port;
  };

  // Helper: check if a jack port currently has a cable connected
  const hasJackCable = (nodeId: string, port: 'in' | 'out'): boolean => {
    if (port === 'in') {
      return connections.some((c) => c.toNodeId === nodeId);
    } else {
      return connections.some((c) => c.fromNodeId === nodeId);
    }
  };

  // Natural catenary & drape curve generator
  const getCablePath = (startX: number, startY: number, endX: number, endY: number): string => {
    const dx = endX - startX;
    const dy = endY - startY;

    if (Math.abs(dy) > 200) {
      // Loop downward across rows
      const loopY = Math.max(startY, endY) + 40;
      const cx1 = startX - 40;
      const cy1 = loopY;
      const cx2 = endX + 40;
      const cy2 = loopY;
      return `M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`;
    }

    // Natural catenary sag between adjacent jacks (works seamlessly right-to-left or left-to-right)
    const dist = Math.abs(dx);
    const sag = Math.max(26, Math.min(85, dist * 0.16 + Math.abs(dy) * 0.15));
    const cx1 = startX + (dx < 0 ? -Math.max(25, dist * 0.4) : Math.max(25, dist * 0.4));
    const cy1 = startY + sag;
    const cx2 = endX - (dx < 0 ? -Math.max(25, dist * 0.4) : Math.max(25, dist * 0.4));
    const cy2 = endY + sag;
    return `M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`;
  };

  // Render authentic 1/4" right-angle jack plug directly on pedal side jack
  const renderStompboxJackPlug = (x: number, y: number, side: 'left' | 'right') => {
    const isRight = side === 'right';
    const plugW = 12;
    const plugH = 10;
    const px = isRight ? x - 2 : x - plugW + 2;
    const py = y - plugH / 2;

    return (
      <g key={`pedal-plug-${x}-${y}-${side}`} className="cable-stompbox-plug">
        <rect
          x={px}
          y={py}
          width={plugW}
          height={plugH}
          rx={2}
          fill="url(#jackPlugMetalGrad)"
          stroke="#0f172a"
          strokeWidth={1}
        />
        <rect
          x={isRight ? px + 2 : px + plugW - 4}
          y={py - 1}
          width={2.5}
          height={plugH + 2}
          rx={0.8}
          fill="#eab308"
          stroke="#78350f"
          strokeWidth={0.5}
        />
        <circle
          cx={isRight ? px + plugW - 2 : px + 2}
          cy={y}
          r={3}
          fill="#1e293b"
          stroke="#475569"
          strokeWidth={1}
        />
      </g>
    );
  };

  // Render straight chassis jack plug on board input/output box
  const renderBoardJackPlug = (x: number, y: number, keyPrefix: string) => (
    <g key={`board-plug-${keyPrefix}-${x}-${y}`} className="cable-board-plug">
      <circle cx={x} cy={y} r={7} fill="url(#jackPlugMetalGrad)" stroke="#1e293b" strokeWidth={1.5} />
      <circle cx={x} cy={y} r={3.5} fill="#f59e0b" stroke="#78350f" strokeWidth={0.8} />
      <circle cx={x} cy={y} r={1.5} fill="#0f172a" />
    </g>
  );

  const availablePedals = Object.values(PEDAL_DEFINITIONS);

  const filteredPedals = useMemo(() => {
    const q = pedalSearch.toLowerCase().trim();
    return availablePedals.filter((def) => {
      const matchCat =
        activeCategoryTab === 'all' || def.category === activeCategoryTab;
      if (!matchCat) return false;
      if (!q) return true;
      const catLabel =
        def.category === 'amp'
          ? 'amp amplifier head preamp power amp tube vox ac30 marshall plexi jcm800 fender twin bassman deluxe mesa rectifier dumble soldano bogner evh 5150 orange engl jc120'
          : def.category === 'cabinet'
            ? 'cabinet ir impulse response speaker celestion alnico blue v30 greenback mic sm57 md421 ribbon stereo pan 2x12 4x12 1x12 custom wav'
            : def.category === 'gate'
              ? 'noise gate mxr m135 smart gate smartgate hiss hum buzz suppressor trigger full mid'
              : def.category === 'dynamics'
                ? 'compressor dynamics'
                : def.category === 'drive'
                  ? 'overdrive drive'
                  : def.category === 'distortion'
                    ? 'distortion ds1 crunch heavy'
                    : def.category === 'fuzz'
                      ? 'fuzz sustainer big muff'
                      : def.category === 'boost'
                        ? 'boost clean treble rangemaster oc44 germanium bpc spark tc electronic mini xotic ep echoplex micro amp preamp volume'
                        : def.category === 'wah'
                          ? 'auto wah filter envelope dynamic humanizer boss aw3 vocal tempo touch wah'
                          : def.category === 'eq'
                            ? 'equalizer eq graphic 7-band boss ge7 tone boost cut level frequency gyrator'
                            : def.category === 'chorus'
                              ? 'chorus bbd analog boss ce2 ch1 super chorus rate depth e level eq swirl rotary modulation ensemble lush warmth chime'
                              : def.category === 'delay'
                                ? 'delay echo analog bbd boss dm2 mn3005 mxr carbon copy m169 regen mix mod modulation shimmer repeats tape ambient space tc electronic gauss tape echo delay-boss-dm2 delay-mxr-carbon-copy delay-tce-gauss'
                                : def.category === 'flanger'
                                  ? 'flanger bbd analog boss bf2 ehx electro harmonix stereo electric mistress mxr m117r van halen evh unchained chorus depth flanger rate manual width speed regen gilmour pink floyd police whoosh sweep comb filter resonance flanger-boss-bf2 flanger-ehx-electric-mistress flanger-mxr'
                                  : def.category === 'phaser'
                                    ? 'phaser 4-stage ota jfet ehx small stone nano mxr phase 90 speed color van halen eruption pink floyd rotary swirl modulation phaser-ehx-smallstone phaser-mxr-phase90'
                                    : def.category === 'pitch'
                                      ? 'pitch octave octave divider boss oc5 oc-5 ehx pitch fork detune polyphonic harmony 12-string sub-octave pitch-boss-oc5 pitch-ehx-pitchfork'
                                      : def.category === 'vibrato'
                                        ? 'vibrato pitch bbd boss vb2 vb-2 unlatch latch rise time rate depth pitch modulation vibrato-boss-vb2 mxr univibe uni-vibe m68 chorus rotary hendrix trower gilmour vibrato-mxr-univibe'
                                        : 'reverb boss rv6 rv-6 ehx holy grail flerb spring hall plate shimmer dynamic modulate delay time space ambience drip atmospheric jhs 3 series hall dampen tc electronic drip spring reverb-boss-rv6 reverb-ehx-holygrail reverb-jhs-hall reverb-tc-drip';
      return (
        def.name.toLowerCase().includes(q) ||
        def.subtitle.toLowerCase().includes(q) ||
        catLabel.includes(q)
      );
    });
  }, [availablePedals, pedalSearch, activeCategoryTab]);

  const amps = useMemo(
    () => filteredPedals.filter((p) => p.category === 'amp'),
    [filteredPedals]
  );
  const cabinets = useMemo(
    () => filteredPedals.filter((p) => p.category === 'cabinet'),
    [filteredPedals]
  );
  const gates = useMemo(
    () => filteredPedals.filter((p) => p.category === 'gate'),
    [filteredPedals]
  );
  const compressors = useMemo(
    () => filteredPedals.filter((p) => p.category === 'dynamics'),
    [filteredPedals]
  );
  const overdrives = useMemo(
    () => filteredPedals.filter((p) => p.category === 'drive'),
    [filteredPedals]
  );
  const distortions = useMemo(
    () => filteredPedals.filter((p) => p.category === 'distortion'),
    [filteredPedals]
  );
  const fuzzes = useMemo(
    () => filteredPedals.filter((p) => p.category === 'fuzz'),
    [filteredPedals]
  );
  const boosts = useMemo(
    () => filteredPedals.filter((p) => p.category === 'boost'),
    [filteredPedals]
  );
  const wahs = useMemo(
    () => filteredPedals.filter((p) => p.category === 'wah'),
    [filteredPedals]
  );
  const eqs = useMemo(
    () => filteredPedals.filter((p) => p.category === 'eq'),
    [filteredPedals]
  );
  const choruses = useMemo(
    () => filteredPedals.filter((p) => p.category === 'chorus'),
    [filteredPedals]
  );
  const delays = useMemo(
    () => filteredPedals.filter((p) => p.category === 'delay'),
    [filteredPedals]
  );
  const flangers = useMemo(
    () => filteredPedals.filter((p) => p.category === 'flanger'),
    [filteredPedals]
  );
  const phasers = useMemo(
    () => filteredPedals.filter((p) => p.category === 'phaser'),
    [filteredPedals]
  );
  const pitches = useMemo(
    () => filteredPedals.filter((p) => p.category === 'pitch'),
    [filteredPedals]
  );
  const tremolos = useMemo(
    () => filteredPedals.filter((p) => p.category === 'tremolo'),
    [filteredPedals]
  );
  const vibratos = useMemo(
    () => filteredPedals.filter((p) => p.category === 'vibrato'),
    [filteredPedals]
  );
  const reverbs = useMemo(
    () => filteredPedals.filter((p) => p.category === 'reverb'),
    [filteredPedals]
  );

  const handleSelectAdd = (type: string) => {
    onAddPedal(type);
    setShowAddMenu(false);
    setPedalSearch('');
  };

  const isRigActive = activeChain.length > 0;

  return (
    <section className="pedalboard-deck canvas-mode">
      {/* Canvas Top Bar */}
      <div className="pedalboard-header-bar">
        <div className="pedalboard-title-group">
          <SlidersHorizontal size={15} strokeWidth={1.5} className="text-brass" />
          <div className="title-texts">
            <h3>MODULAR RIG & PEDALBOARD CANVAS</h3>
            <span>Multi-Amp, Cabinet IR & Manual Patching Studio Deck • {pedals.length} units loaded</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pedalboard-actions">
          {/* Cables Toggle Button */}
          <button
            className={`btn-canvas-action ${showCables ? 'active' : ''}`}
            onClick={() => setShowCables((prev) => !prev)}
            title="Toggle patch cables visibility"
          >
            <Cable size={14} strokeWidth={1.5} />
            <span>{showCables ? 'CABLES ON' : 'CABLES OFF'}</span>
          </button>

          {/* Grid Snap Button */}
          <button
            className={`btn-canvas-action ${snapToGrid ? 'active' : ''}`}
            onClick={() => {
              setSnapToGrid((prev) => {
                const next = !prev;
                localStorage.setItem('web_guitar_snap_grid', String(next));
                return next;
              });
            }}
            title="Snap pedals to 20px grid for neat alignment"
          >
            <Magnet size={14} strokeWidth={1.5} />
            <span>{snapToGrid ? 'GRID SNAP: ON' : 'GRID SNAP: OFF'}</span>
          </button>

          {/* Default Wiring Button */}
          <button
            className="btn-canvas-action"
            onClick={handleResetDefaultWiring}
            title="Quickly wire pedals sequentially 1 -> 2 -> 3 -> OUT"
          >
            <RotateCcw size={13} strokeWidth={1.5} />
            <span>DEFAULT WIRING</span>
          </button>

          {/* Unplug All Button */}
          <button
            className="btn-canvas-action"
            onClick={handleUnplugAll}
            title="Unplug all patch cables for a clean slate"
          >
            <Unplug size={14} strokeWidth={1.5} />
            <span>UNPLUG ALL</span>
          </button>

          {/* Add Pedal Dropdown / Modal */}
          <div className="add-pedal-wrapper" ref={addMenuRef}>
            <button
              className={`btn-add-pedal ${showAddMenu ? 'menu-open' : ''}`}
              onClick={() => {
                setShowAddMenu((prev) => !prev);
                if (!showAddMenu) setPedalSearch('');
              }}
            >
              <Plus size={14} strokeWidth={1.5} />
              <span>ADD AMP / CAB / PEDAL</span>
            </button>

            {showAddMenu && (
              <div className="add-pedal-dropdown">
                <div className="dropdown-header-bar">
                  <div className="dropdown-title">SELECT AMP, CABINET IR OR PEDAL</div>
                  <button
                    className="dropdown-close-btn"
                    onClick={() => setShowAddMenu(false)}
                    title="Close"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="dropdown-search-box">
                  <Search size={13} className="search-icon" />
                  <input
                    type="text"
                    value={pedalSearch}
                    onChange={(e) => setPedalSearch(e.target.value)}
                    placeholder="Search pedals (e.g. ts9, dyna, comp)..."
                    className="dropdown-search-input"
                    autoFocus
                  />
                  {pedalSearch && (
                    <button
                      className="search-clear-btn"
                      onClick={() => setPedalSearch('')}
                      title="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Category Filter Tabs */}
                <div className="dropdown-category-tabs">
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('all')}
                  >
                    All ({availablePedals.length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'amp' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('amp')}
                  >
                    Amp Head ({availablePedals.filter((p) => p.category === 'amp').length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'cabinet' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('cabinet')}
                  >
                    Cabinet IR ({availablePedals.filter((p) => p.category === 'cabinet').length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'gate' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('gate')}
                  >
                    Noise Gate ({availablePedals.filter((p) => p.category === 'gate').length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'dynamics' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('dynamics')}
                  >
                    Compressor ({availablePedals.filter((p) => p.category === 'dynamics').length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'drive' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('drive')}
                  >
                    Overdrive ({availablePedals.filter((p) => p.category === 'drive').length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'distortion' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('distortion')}
                  >
                    Distortion ({availablePedals.filter((p) => p.category === 'distortion').length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'fuzz' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('fuzz')}
                  >
                    Fuzz ({availablePedals.filter((p) => p.category === 'fuzz').length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'boost' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('boost')}
                  >
                    Boost ({availablePedals.filter((p) => p.category === 'boost').length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'wah' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('wah')}
                  >
                    Auto Wah ({availablePedals.filter((p) => p.category === 'wah').length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'eq' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('eq')}
                  >
                    Equalizer ({availablePedals.filter((p) => p.category === 'eq').length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'chorus' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('chorus')}
                  >
                    Chorus ({availablePedals.filter((p) => p.category === 'chorus').length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'delay' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('delay')}
                  >
                    Delay ({availablePedals.filter((p) => p.category === 'delay').length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'flanger' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('flanger')}
                  >
                    Flanger ({availablePedals.filter((p) => p.category === 'flanger').length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'phaser' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('phaser')}
                  >
                    Phaser ({availablePedals.filter((p) => p.category === 'phaser').length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'pitch' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('pitch')}
                  >
                    Pitch / Octave ({availablePedals.filter((p) => p.category === 'pitch').length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'tremolo' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('tremolo')}
                  >
                    Tremolo ({availablePedals.filter((p) => p.category === 'tremolo').length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'vibrato' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('vibrato')}
                  >
                    Vibrato ({availablePedals.filter((p) => p.category === 'vibrato').length})
                  </button>
                  <button
                    className={`cat-tab-btn ${activeCategoryTab === 'reverb' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('reverb')}
                  >
                    Reverb ({availablePedals.filter((p) => p.category === 'reverb').length})
                  </button>
                </div>

                {/* Filtered Pedals List */}
                <div className="dropdown-pedals-list">
                  {filteredPedals.length === 0 ? (
                    <div className="dropdown-empty-state">
                      <span>No pedals found</span>
                      <small>No matches found for "{pedalSearch}"</small>
                    </div>
                  ) : (
                    <>
                      {/* Category: Amplifier Heads */}
                      {amps.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag boost-tag">GUITAR AMPLIFIER HEAD (MULTI-AMP READY)</span>
                            <span className="group-count">18 Models Inside</span>
                          </div>
                          {amps.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge boost">AMP HEAD</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category: Cabinet IR Simulators */}
                      {cabinets.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag eq-tag">CABINET IR SIMULATOR (STEREO PAN & WAV LOADER)</span>
                            <span className="group-count">16 Enclosures + Custom IR</span>
                          </div>
                          {cabinets.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge eq">CABINET IR</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category: Noise Gates */}
                      {gates.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag comp-tag">NOISE GATE</span>
                            <span className="group-count">{gates.length} pedal</span>
                          </div>
                          {gates.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.chassisColor || def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge comp">NOISE GATE</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category: Compressors */}
                      {compressors.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag comp-tag">COMPRESSOR</span>
                            <span className="group-count">{compressors.length} pedals</span>
                          </div>
                          {compressors.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.chassisColor || def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge comp">COMPRESSOR</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category: Overdrives */}
                      {overdrives.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag od-tag">OVERDRIVE</span>
                            <span className="group-count">{overdrives.length} pedals</span>
                          </div>
                          {overdrives.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.chassisColor || def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge od">OVERDRIVE</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category: Distortions */}
                      {distortions.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag dist-tag">DISTORTION</span>
                            <span className="group-count">{distortions.length} pedals</span>
                          </div>
                          {distortions.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.chassisColor || def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge dist">DISTORTION</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category: Fuzz */}
                      {fuzzes.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag fuzz-tag">FUZZ</span>
                            <span className="group-count">{fuzzes.length} pedals</span>
                          </div>
                          {fuzzes.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.chassisColor || def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge fuzz">FUZZ</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category: Boost */}
                      {boosts.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag boost-tag">BOOST</span>
                            <span className="group-count">{boosts.length} pedals</span>
                          </div>
                          {boosts.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.chassisColor || def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge boost">BOOST</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category: Auto Wah / Filter */}
                      {wahs.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag wah-tag">AUTO WAH</span>
                            <span className="group-count">{wahs.length} pedals</span>
                          </div>
                          {wahs.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.chassisColor || def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge wah">AUTO WAH</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category: Equalizer */}
                      {eqs.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag eq-tag">EQUALIZER</span>
                            <span className="group-count">{eqs.length} pedals</span>
                          </div>
                          {eqs.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.chassisColor || def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge eq">EQUALIZER</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category: Chorus */}
                      {choruses.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag chorus-tag">CHORUS</span>
                            <span className="group-count">{choruses.length} pedals</span>
                          </div>
                          {choruses.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.chassisColor || def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge chorus">CHORUS</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category: Delay */}
                      {delays.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag delay-tag">DELAY</span>
                            <span className="group-count">{delays.length} pedals</span>
                          </div>
                          {delays.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.chassisColor || def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge delay">DELAY</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category: Flanger */}
                      {flangers.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag flanger-tag">FLANGER</span>
                            <span className="group-count">{flangers.length} pedals</span>
                          </div>
                          {flangers.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.chassisColor || def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge flanger">FLANGER</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category: Phaser */}
                      {phasers.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag phaser-tag">PHASER</span>
                            <span className="group-count">{phasers.length} pedals</span>
                          </div>
                          {phasers.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.chassisColor || def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge phaser">PHASER</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category: Pitch / Octave */}
                      {pitches.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag pitch-tag">PITCH / OCTAVE</span>
                            <span className="group-count">{pitches.length} pedals</span>
                          </div>
                          {pitches.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.chassisColor || def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge pitch">PITCH</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category: Tremolo */}
                      {tremolos.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag tremolo-tag">TREMOLO</span>
                            <span className="group-count">{tremolos.length} pedals</span>
                          </div>
                          {tremolos.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.chassisColor || def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge tremolo">TREMOLO</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category: Vibrato */}
                      {vibratos.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag vibrato-tag">VIBRATO</span>
                            <span className="group-count">{vibratos.length} pedals</span>
                          </div>
                          {vibratos.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.chassisColor || def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge vibrato">VIBRATO</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category: Reverb */}
                      {reverbs.length > 0 && (
                        <div className="dropdown-category-group">
                          <div className="group-header">
                            <span className="group-tag reverb-tag">REVERB</span>
                            <span className="group-count">{reverbs.length} pedals</span>
                          </div>
                          {reverbs.map((def) => (
                            <button
                              key={def.type}
                              className="dropdown-item"
                              onClick={() => handleSelectAdd(def.type)}
                            >
                              <div
                                className="dropdown-color-dot"
                                style={{ backgroundColor: def.chassisColor || def.accentColor }}
                              />
                              <div className="dropdown-item-info">
                                <div className="item-title-row">
                                  <strong className="item-name">{def.name}</strong>
                                  <span className="item-pill-badge reverb">REVERB</span>
                                </div>
                                <span className="item-desc">{def.subtitle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Patch Hint & Status Bar */}
      <div className="pedal-patch-hint-bar">
        <span>
          {pendingJack ? (
            <strong className="text-brass">
              Patching from {pendingJack.nodeId === 'BOARD_INPUT' ? 'GUITAR INPUT' : pendingJack.nodeId}... Click any {pendingJack.port === 'out' ? 'INPUT (IN)' : 'OUTPUT (OUT)'} jack to plug in, or click canvas to cancel.
            </strong>
          ) : (
            'Click any side jack to plug in a cable. Click an existing cable to unplug it.'
          )}
        </span>
        <span className={`hint-status-badge ${isRigActive ? 'active-rig' : 'open-chain'}`}>
          {pedals.length === 0
            ? 'CLEAN GUITAR DIRECT PASSTHROUGH'
            : isRigActive
              ? `● PATCHED: ${activeChain.length} PEDAL${activeChain.length > 1 ? 'S' : ''} ACTIVE IN SIGNAL PATH`
              : '○ SIGNAL PATH OPEN (CLEAN BYPASS)'}
        </span>
      </div>

      {/* Free Canvas Area: Vertical Scrolling Only, No Horizontal Scroll */}
      <div className={`pedalboard-canvas-viewport ${pedals.length === 0 ? 'is-empty' : ''}`} ref={canvasRef}>
        <div
          className="pedalboard-canvas-surface"
          ref={surfaceRef}
          style={{
            width: '100%',
            height: surfaceHeight > 0 ? `${surfaceHeight}px` : '100%',
          }}
          onPointerMove={handleSurfacePointerMove}
          onClick={() => {
            if (pendingJack) setPendingJack(null);
          }}
        >
          {/* Signal Chain Jacks: Board Input (Permanently Fixed Top-Left) */}
          <div
            className={`canvas-io-box io-input-box ${isJackPending('BOARD_INPUT', 'out') ? 'is-jack-pending' : ''}`}
            onClick={(e) => handleJackClick('BOARD_INPUT', 'out', e)}
            title="Guitar Input Jack - Click to plug cable into your pedals"
          >
            <div className="io-box-label">INPUT</div>
            <div className="jack-nut io-jack-nut" />
            <div className="io-box-sub">FROM GUITAR</div>
          </div>

          {/* Signal Chain Jacks: Board Output (Permanently Fixed Top-Right) */}
          <div
            className={`canvas-io-box io-output-box ${isJackPending('BOARD_OUTPUT', 'in') ? 'is-jack-pending' : ''}`}
            onClick={(e) => handleJackClick('BOARD_OUTPUT', 'in', e)}
            title="Master Output Jack - Click to plug final cable(s) from your rig/cabinets to Master Output"
          >
            <div className="io-box-label">OUTPUT</div>
            <div className="jack-nut io-jack-nut" />
            <div className="io-box-sub">TO MASTER OUT</div>
          </div>

          {/* SVG Patch Cables Layer */}
          {showCables && pedals.length > 0 && surfaceHeight > 0 && (
            <svg
              className={`canvas-cables-svg ${draggingId ? 'is-dragging-active' : ''}`}
              style={{
                width: '100%',
                height: `${surfaceHeight}px`,
              }}
              viewBox={`0 0 ${surfaceWidth} ${surfaceHeight}`}
            >
              <defs>
                <linearGradient id="cableGradTweed" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#453c2d" />
                  <stop offset="50%" stopColor="#8c7853" />
                  <stop offset="100%" stopColor="#3d3324" />
                </linearGradient>
                <linearGradient id="cableGradOxblood" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#541b22" />
                  <stop offset="50%" stopColor="#8b2632" />
                  <stop offset="100%" stopColor="#3d1419" />
                </linearGradient>
                <linearGradient id="jackPlugMetalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f8fafc" />
                  <stop offset="30%" stopColor="#94a3b8" />
                  <stop offset="70%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
                <filter id="cableShadow" x="-10%" y="-10%" width="120%" height="130%">
                  <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000" floodOpacity="0.75" />
                </filter>
              </defs>

              {/* Render Existing User Connections */}
              {connections.map((conn) => {
                const start = getJackCoords(conn.fromNodeId, 'out');
                const end = getJackCoords(conn.toNodeId, 'in');
                const d = getCablePath(start.x, start.y, end.x, end.y);

                return (
                  <g
                    key={conn.id}
                    className="cable-interactive-group"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveConnection(conn.id);
                    }}
                  >
                    <title>Click to unplug this cable</title>
                    <path d={d} className="cable-shadow-path" />
                    <path d={d} className="cable-main-path bone-ivory" />
                    <path d={d} className="cable-hitbox-path" />

                    {/* Jack Plugs */}
                    {conn.fromNodeId === 'BOARD_INPUT'
                      ? renderBoardJackPlug(start.x, start.y, conn.id)
                      : renderStompboxJackPlug(start.x, start.y, 'left')}

                    {conn.toNodeId === 'BOARD_OUTPUT'
                      ? renderBoardJackPlug(end.x, end.y, conn.id)
                      : renderStompboxJackPlug(end.x, end.y, 'right')}
                  </g>
                );
              })}

              {/* Render Pending / Dragging Live Cable */}
              {pendingJack && (() => {
                const start = getJackCoords(pendingJack.nodeId, pendingJack.port);
                const isOut = pendingJack.port === 'out';
                const startX = isOut ? start.x : mouseCanvasPos.x;
                const startY = isOut ? start.y : mouseCanvasPos.y;
                const endX = isOut ? mouseCanvasPos.x : start.x;
                const endY = isOut ? mouseCanvasPos.y : start.y;
                const d = getCablePath(startX, startY, endX, endY);

                return (
                  <g key="live-dragging-cable">
                    <path d={d} className="cable-live-drag-path" />
                    <circle cx={mouseCanvasPos.x} cy={mouseCanvasPos.y} r={5} fill="#f59e0b" />
                  </g>
                );
              })()}
            </svg>
          )}

          {/* Simple, clean centered empty board indicator */}
          {pedals.length === 0 && (
            <div className="canvas-simple-empty">
              <div className="empty-simple-pill">
                <span>NO CONFIGURATION</span>
              </div>
            </div>
          )}

          {/* Pedals on Canvas */}
          {pedals.map((instance, idx) => {
            const metadata = PEDAL_DEFINITIONS[instance.type];
            if (!metadata) return null;

            const pos = positions[instance.id] || getDefaultPos(idx);
            const isDragging = draggingId === instance.id;

            return (
              <div
                key={instance.id}
                className={`canvas-pedal-wrapper ${isDragging ? 'is-dragging' : ''}`}
                style={{
                  position: 'absolute',
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  zIndex: isDragging ? 100 : 10 + idx,
                }}
                onPointerDown={(e) => handlePedalPointerDown(instance.id, e)}
              >
                <Stompbox
                  instance={instance}
                  metadata={metadata}
                  index={idx + 1}
                  onToggleEnabled={onToggleEnabled}
                  onChangeParam={onChangeParam}
                  onRemove={(id) => {
                    onRemovePedal(id);
                  }}
                  onLoadCustomIR={onLoadCustomIR}
                  isDragging={isDragging}
                  onJackClick={handleJackClick}
                  isJackPending={isJackPending}
                  hasJackCable={hasJackCable}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
