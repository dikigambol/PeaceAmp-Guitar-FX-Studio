import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { PedalInstance } from '../../types/pedal';
import { PEDAL_DEFINITIONS } from '../../audio/pedals/registry';
import { Stompbox } from './Stompbox';
import { Plus, SlidersHorizontal, Cable, Magnet, Unplug, RotateCcw } from 'lucide-react';

export interface PatchConnection {
  id: string;
  fromNodeId: string; // 'BOARD_INPUT' or pedalId
  toNodeId: string;   // 'BOARD_OUTPUT' or pedalId
  cableColor?: 'bone-ivory' | 'tweed' | 'oxblood' | 'rubber';
}

interface PedalboardProps {
  pedals: PedalInstance[];
  onToggleEnabled: (id: string) => void;
  onChangeParam: (id: string, paramId: string, val: number) => void;
  onRemovePedal: (id: string) => void;
  onMovePedal: (id: string, direction: 'left' | 'right') => void;
  onAddPedal: (type: string) => void;
  onActiveChainChange?: (activePedals: PedalInstance[]) => void;
  isEngineRunning: boolean;
}

interface Position {
  x: number;
  y: number;
}

// Stompbox enclosure dimensions and side jack offsets
const PEDAL_WIDTH = 204;
const JACK_Y_OFFSET = 57;

export const Pedalboard: React.FC<PedalboardProps> = ({
  pedals,
  onToggleEnabled,
  onChangeParam,
  onRemovePedal,
  onMovePedal: _onMovePedal,
  onAddPedal,
  onActiveChainChange,
  isEngineRunning: _isEngineRunning,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showCables, setShowCables] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(() => {
    return localStorage.getItem('web_guitar_snap_grid') !== 'false';
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);

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
    try {
      const saved = localStorage.getItem('web_guitar_pedal_coords');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Drag tracking ref
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Calculate default position for a newly added pedal that fits within available width
  const getDefaultPos = useCallback(
    (index: number): Position => {
      const availableW = Math.max(480, surfaceWidth - 240);
      const maxCols = Math.max(1, Math.min(4, Math.floor(availableW / 235)));
      const col = index % maxCols;
      const row = Math.floor(index / maxCols);
      return {
        x: 120 + col * 230,
        y: 40 + row * 410,
      };
    },
    [surfaceWidth]
  );

  // Auto-arrange all pedals into neat rows and columns
  const autoArrangePedals = useCallback(
    (pedalList: PedalInstance[]) => {
      if (pedalList.length === 0) {
        setPositions({});
        try {
          localStorage.removeItem('web_guitar_pedal_coords');
        } catch { }
        return;
      }

      const availableW = Math.max(480, surfaceWidth - 240);
      const maxCols = Math.max(1, Math.min(4, Math.floor(availableW / 235)));

      const nextPos: Record<string, Position> = {};
      pedalList.forEach((p, idx) => {
        const col = idx % maxCols;
        const row = Math.floor(idx / maxCols);
        nextPos[p.id] = {
          x: 120 + col * 230,
          y: 40 + row * 410,
        };
      });

      setPositions(nextPos);
      try {
        localStorage.setItem('web_guitar_pedal_coords', JSON.stringify(nextPos));
      } catch { }
    },
    [surfaceWidth]
  );

  // Ensure all existing pedals have a valid position
  useEffect(() => {
    let hasNew = false;
    const next = { ...positions };
    pedals.forEach((p, idx) => {
      if (!next[p.id]) {
        next[p.id] = getDefaultPos(idx);
        hasNew = true;
      }
    });
    if (hasNew) {
      setPositions(next);
      try {
        localStorage.setItem('web_guitar_pedal_coords', JSON.stringify(next));
      } catch { }
    }
  }, [pedals, getDefaultPos, positions]);

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

  const [connections, setConnections] = useState<PatchConnection[]>(() => {
    try {
      const saved = localStorage.getItem('web_guitar_patch_cables');
      if (saved) return JSON.parse(saved);
    } catch { }
    return generateDefaultConnections(pedals);
  });

  // Track previous pedal IDs to automatically rewire cables and auto-arrange layout when presets change
  const prevPedalIdsKeyRef = useRef<string>(pedals.map((p) => p.id).join(','));

  // Auto-connect patch cables and auto-arrange layout whenever preset changes or cables become orphaned
  useEffect(() => {
    const currentKey = pedals.map((p) => p.id).join(',');
    const pedalSetChanged = prevPedalIdsKeyRef.current !== currentKey;
    prevPedalIdsKeyRef.current = currentKey;

    if (pedals.length === 0) {
      if (connections.length !== 1 || connections[0].id !== 'conn-direct-bypass') {
        setConnections(generateDefaultConnections([]));
      }
      return;
    }

    const currentPedalIdSet = new Set(pedals.map((p) => p.id));
    const hasOrphanedConnection = connections.some(
      (c) =>
        (c.fromNodeId !== 'BOARD_INPUT' && !currentPedalIdSet.has(c.fromNodeId)) ||
        (c.toNodeId !== 'BOARD_OUTPUT' && !currentPedalIdSet.has(c.toNodeId))
    );

    // If preset or pedal set changed, or if existing cables are broken/orphaned:
    if (pedalSetChanged || hasOrphanedConnection) {
      autoArrangePedals(pedals);
      const fresh = generateDefaultConnections(pedals);
      setConnections(fresh);
      try {
        localStorage.setItem('web_guitar_patch_cables', JSON.stringify(fresh));
      } catch { }
    }
  }, [pedals, connections, generateDefaultConnections, autoArrangePedals]);

  // Save connections on change
  useEffect(() => {
    try {
      localStorage.setItem('web_guitar_patch_cables', JSON.stringify(connections));
    } catch { }
  }, [connections]);

  // Calculate dynamic vertical height based on lowest pedal
  const surfaceHeight = useMemo(() => {
    let maxY = 450;
    Object.values(positions).forEach((pos) => {
      if (pos.y + 360 > maxY) maxY = pos.y + 360;
    });
    return Math.max(600, maxY + 70);
  }, [positions]);

  // Jack center coordinates lookup (INPUT and OUTPUT boxes stay permanently pinned)
  const getJackCoords = useCallback(
    (nodeId: string, port: 'in' | 'out'): { x: number; y: number } => {
      if (nodeId === 'BOARD_INPUT') {
        // Fixed at left: 20px, top: 40px -> nut center is (20 + 36, 40 + 47)
        return { x: 56, y: 87 };
      }
      if (nodeId === 'BOARD_OUTPUT') {
        // Fixed at right: 20px, top: 40px -> nut center is (surfaceWidth - 20 - 36, 40 + 47)
        return { x: surfaceWidth - 56, y: 87 };
      }

      const pos = positions[nodeId] || { x: 120, y: 40 };
      if (port === 'in') {
        // Left side jack
        return { x: pos.x - 2, y: pos.y + JACK_Y_OFFSET };
      } else {
        // Right side jack
        return { x: pos.x + PEDAL_WIDTH + 2, y: pos.y + JACK_Y_OFFSET };
      }
    },
    [surfaceWidth, positions]
  );

  // Compute active signal chain from BOARD_INPUT to BOARD_OUTPUT
  const activeChain = useMemo(() => {
    const chain: PedalInstance[] = [];
    const visited = new Set<string>();
    let currNodeId = 'BOARD_INPUT';

    while (currNodeId !== 'BOARD_OUTPUT') {
      const nextConn = connections.find((c) => c.fromNodeId === currNodeId);
      if (!nextConn) break;

      currNodeId = nextConn.toNodeId;
      if (currNodeId === 'BOARD_OUTPUT') break;

      if (visited.has(currNodeId)) break; // Prevent cyclic loops
      visited.add(currNodeId);

      const pedal = pedals.find((p) => p.id === currNodeId);
      if (pedal) chain.push(pedal);
    }

    return chain;
  }, [connections, pedals]);

  // Notify parent of active audio chain
  useEffect(() => {
    onActiveChainChange?.(activeChain);
  }, [activeChain, onActiveChainChange]);

  // Handle Drag Pointer Down
  const handlePedalPointerDown = (id: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;

    // Do not initiate pedal movement if user interacted with knobs, buttons, jacks, or inputs
    if (
      target.closest('.stompbox-side-jack') ||
      target.closest('.knob-dial-wrapper') ||
      target.closest('.knob-container') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('label')
    ) {
      return;
    }

    e.preventDefault();
    const curr = positions[id] || getDefaultPos(pedals.findIndex((p) => p.id === id));
    setDraggingId(id);
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: curr.x,
      origY: curr.y,
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Handle Drag Pointer Move (Clamped horizontally to prevent any right-side scroll)
  const handlePedalPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || dragRef.current.id !== draggingId) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    const rawX = dragRef.current.origX + deltaX;
    const rawY = dragRef.current.origY + deltaY;

    const targetX = snapToGrid ? Math.round(rawX / 20) * 20 : rawX;
    const targetY = snapToGrid ? Math.round(rawY / 20) * 20 : rawY;

    // Constrain X strictly between left input box and right output box so no horizontal scroll can ever occur
    const minX = 110;
    const maxX = Math.max(minX, surfaceWidth - PEDAL_WIDTH - 110);
    const newX = Math.max(minX, Math.min(maxX, targetX));
    const newY = Math.max(20, targetY);

    const activeId = dragRef.current.id; // Safely captured
    setPositions((prev) => ({
      ...prev,
      [activeId]: { x: newX, y: newY },
    }));
  };

  // Handle Drag Pointer Up
  const handlePedalPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch { }
      dragRef.current = null;
      setDraggingId(null);
      setPositions((latest) => {
        try {
          localStorage.setItem('web_guitar_pedal_coords', JSON.stringify(latest));
        } catch { }
        return latest;
      });
    }
  };

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

    setConnections((prev) => {
      // Remove any existing cable attached to the destination 'in' jack or source 'out' jack
      const filtered = prev.filter((c) => c.fromNodeId !== fromId && c.toNodeId !== toId);
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
    setConnections((prev) => prev.filter((c) => c.id !== connId));
  };

  // Restore default sequential wiring AND auto-arrange layout
  const handleResetDefaultWiring = () => {
    autoArrangePedals(pedals);
    setConnections(generateDefaultConnections(pedals));
    setPendingJack(null);
  };

  // Unplug all cables
  const handleUnplugAll = () => {
    setConnections([]);
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

    if (dx < 0) {
      // Loop downward across rows or backward along the deck floor
      const loopY = Math.max(endY + 20, startY + Math.max(380, dy + 20));
      const cx1 = startX + 70;
      const cy1 = loopY;
      const cx2 = endX - 70;
      const cy2 = loopY;
      return `M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`;
    }

    // Natural catenary sag between left and right
    const sag = Math.max(24, Math.min(85, dx * 0.16 + Math.abs(dy) * 0.15));
    const cx1 = startX + Math.max(30, dx * 0.42);
    const cy1 = startY + sag;
    const cx2 = endX - Math.max(30, dx * 0.42);
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

  const handleSelectAdd = (type: string) => {
    onAddPedal(type);
    setShowAddMenu(false);
  };

  const isRigActive = activeChain.length > 0;

  return (
    <section className="pedalboard-deck canvas-mode">
      {/* Canvas Top Bar */}
      <div className="pedalboard-header-bar">
        <div className="pedalboard-title-group">
          <SlidersHorizontal size={15} strokeWidth={1.5} className="text-brass" />
          <div className="title-texts">
            <h3>VIRTUAL PEDALBOARD CANVAS</h3>
            <span>Manual Patching Modular Studio Deck • {pedals.length} stompboxes loaded</span>
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

          {/* Add Stompbox Dropdown */}
          <div className="add-pedal-wrapper">
            <button
              className="btn-add-pedal"
              onClick={() => setShowAddMenu((prev) => !prev)}
            >
              <Plus size={14} strokeWidth={1.5} />
              <span>ADD STOMPBOX</span>
            </button>

            {showAddMenu && (
              <div className="add-pedal-dropdown">
                <div className="dropdown-header">SELECT ANALOG PEDAL</div>
                {availablePedals.map((def) => (
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
                      <strong className="item-name">{def.name}</strong>
                      <span className="item-desc">{def.subtitle}</span>
                    </div>
                  </button>
                ))}
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
              🔌 Patching from {pendingJack.nodeId === 'BOARD_INPUT' ? 'GUITAR INPUT' : pendingJack.nodeId}... Click any {pendingJack.port === 'out' ? 'INPUT (IN)' : 'OUTPUT (OUT)'} jack to plug in, or click canvas to cancel.
            </strong>
          ) : (
            'Click any side jack to plug in a cable. Click an existing cable to unplug it.'
          )}
        </span>
        <span className={`hint-status-badge ${isRigActive ? 'active-rig' : 'open-chain'}`}>
          {pedals.length === 0
            ? 'CLEAN GUITAR DIRECT PASSTHROUGH (NO PEDALS)'
            : isRigActive
              ? `● PATCHED: ${activeChain.length} PEDAL${activeChain.length > 1 ? 'S' : ''} ACTIVE IN SIGNAL PATH`
              : '○ SIGNAL PATH OPEN (CLEAN BYPASS)'}
        </span>
      </div>

      {/* Free Canvas Area: Vertical Scrolling Only, No Horizontal Scroll */}
      <div className="pedalboard-canvas-viewport" ref={canvasRef}>
        <div
          className="pedalboard-canvas-surface"
          ref={surfaceRef}
          style={{
            width: '100%',
            height: `${surfaceHeight}px`,
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
            title="Amplifier Output Jack - Click to plug final cable from pedals to amplifier"
          >
            <div className="io-box-label">OUTPUT</div>
            <div className="jack-nut io-jack-nut" />
            <div className="io-box-sub">TO AMPLIFIER</div>
          </div>

          {/* SVG Patch Cables Layer */}
          {showCables && (
            <svg
              className="canvas-cables-svg"
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
                      : renderStompboxJackPlug(start.x, start.y, 'right')}

                    {conn.toNodeId === 'BOARD_OUTPUT'
                      ? renderBoardJackPlug(end.x, end.y, conn.id)
                      : renderStompboxJackPlug(end.x, end.y, 'left')}
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
                <span>NO STOMPBOX</span>
              </div>
            </div>
          )}

          {/* Stompboxes on Canvas */}
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
                onPointerMove={handlePedalPointerMove}
                onPointerUp={handlePedalPointerUp}
              >
                <Stompbox
                  instance={instance}
                  metadata={metadata}
                  index={idx + 1}
                  onToggleEnabled={onToggleEnabled}
                  onChangeParam={onChangeParam}
                  onRemove={(id) => {
                    // Also clean up any connections with this pedal
                    setConnections((prev) => prev.filter((c) => c.fromNodeId !== id && c.toNodeId !== id));
                    onRemovePedal(id);
                  }}
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
