import type { PedalInstance } from '../../types/pedal';

// Stompbox enclosure dimensions and side jack offsets
export const PEDAL_WIDTH = 204;
export const JACK_Y_OFFSET = 57;

export function getPedalDimensions(type: string): { w: number; h: number } {
  const isWide = type === 'od-klon' || type === 'klon-centaur';
  const isMini = type === 'od-tsmini' || type === 'ts-mini' || type === 'boost-spark-mini' || type === 'boost-xotic-ep';
  const isToneBender = type === 'fuzz-tonebender';
  const isFuzzFactory = type === 'fuzz-fuzzfactory';
  const isFlatiron = type === 'fuzz-flatiron';
  const isHoof = type === 'fuzz-hoof';
  const isGe7 = type === 'eq-boss-ge7' || type === 'boss-ge7';
  const isMxrFlanger = type === 'flanger-mxr';
  const isSupaTrem = type === 'tremolo-fulltone-supatrem';
  const isAw3 = type === 'wah-boss-aw3' || type === 'boss-aw3';
  const isVb2 = type === 'vibrato-boss-vb2' || type === 'boss-vb2';
  const isRv6 = type === 'reverb-boss-rv6' || type === 'boss-rv6';
  const isHolyGrail = type === 'reverb-ehx-holygrail' || type === 'ehx-holy-grail';
  const isJhsHall = type === 'reverb-jhs-hall';
  const isTcDrip = type === 'reverb-tc-drip';
  const w = isWide ? 260 : isMini ? 140 : isToneBender ? 186 : isFuzzFactory ? 250 : isFlatiron ? 148 : isHoof ? 164 : isGe7 ? 248 : isSupaTrem ? 360 : isMxrFlanger ? 256 : isAw3 || isVb2 || isRv6 ? 228 : isHolyGrail ? 192 : isJhsHall ? 196 : isTcDrip ? 172 : PEDAL_WIDTH;
  const h = isMini ? 290 : isFuzzFactory ? 176 : isSupaTrem ? 232 : isMxrFlanger ? 195 : isHolyGrail ? 336 : isJhsHall ? 344 : isTcDrip ? 290 : 360;
  return { w, h };
}

export function doBoxesOverlap(
  boxA: { x: number; y: number; w: number; h: number },
  boxB: { x: number; y: number; w: number; h: number }
): boolean {
  return (
    boxA.x < boxB.x + boxB.w &&
    boxA.x + boxA.w > boxB.x &&
    boxA.y < boxB.y + boxB.h &&
    boxA.y + boxA.h > boxB.y
  );
}

export function isPositionColliding(
  targetId: string,
  targetType: string,
  pos: { x: number; y: number },
  pedalList: PedalInstance[],
  allPositions: Record<string, { x: number; y: number }>
): boolean {
  const targetDims = getPedalDimensions(targetType);
  const targetBox = {
    x: pos.x,
    y: pos.y,
    w: targetDims.w + 16,
    h: targetDims.h + 20,
  };

  for (const other of pedalList) {
    if (other.id === targetId) continue;
    const otherPos = allPositions[other.id];
    if (!otherPos) continue;
    const otherDims = getPedalDimensions(other.type);
    const otherBox = {
      x: otherPos.x,
      y: otherPos.y,
      w: otherDims.w + 16,
      h: otherDims.h + 20,
    };
    if (doBoxesOverlap(targetBox, otherBox)) {
      return true;
    }
  }
  return false;
}

export function findNearestFreePosition(
  targetId: string,
  targetType: string,
  preferredPos: { x: number; y: number },
  pedalList: PedalInstance[],
  allPositions: Record<string, { x: number; y: number }>,
  surfaceWidth: number
): { x: number; y: number } {
  if (!isPositionColliding(targetId, targetType, preferredPos, pedalList, allPositions)) {
    return preferredPos;
  }

  const targetDims = getPedalDimensions(targetType);
  const minX = 110;
  const maxX = Math.max(minX, surfaceWidth - targetDims.w - 110);

  // Search outward in concentric diamond/spiral steps of 20px
  const step = 20;
  for (let radius = 1; radius <= 40; radius++) {
    const candidates = [
      { x: preferredPos.x - radius * step, y: preferredPos.y }, // Left first
      { x: preferredPos.x + radius * step, y: preferredPos.y }, // Right
      { x: preferredPos.x, y: preferredPos.y + radius * step }, // Down (next row)
      { x: preferredPos.x, y: preferredPos.y - radius * step }, // Up
      { x: preferredPos.x - radius * step, y: preferredPos.y + radius * step },
      { x: preferredPos.x + radius * step, y: preferredPos.y + radius * step },
      { x: preferredPos.x - radius * step, y: preferredPos.y - radius * step },
      { x: preferredPos.x + radius * step, y: preferredPos.y - radius * step },
    ];

    for (const cand of candidates) {
      if (cand.x < minX || cand.x > maxX || cand.y < 20) continue;
      if (!isPositionColliding(targetId, targetType, cand, pedalList, allPositions)) {
        return cand;
      }
    }
  }

  return preferredPos;
}

export function calculateNextPedalPosition(
  newPedal: PedalInstance,
  existingPedals: PedalInstance[],
  allPositions: Record<string, { x: number; y: number }>,
  surfaceWidth: number
): { x: number; y: number } {
  const newDims = getPedalDimensions(newPedal.type);
  const minX = 120;
  const rightStartX = Math.max(minX, surfaceWidth - 140 - newDims.w);

  // If no other pedals exist on the board, place at top right near BOARD_INPUT
  const otherPedals = existingPedals.filter((p) => p.id !== newPedal.id && allPositions[p.id]);
  if (otherPedals.length === 0) {
    return { x: rightStartX, y: 40 };
  }

  // Find the last pedal placed
  const lastPedal = otherPedals[otherPedals.length - 1];
  const lastPos = allPositions[lastPedal.id];

  // Start immediately after the last pedal (flowing right-to-left)
  let candidateX = lastPos.x - (newDims.w + 40);
  let candidateY = lastPos.y;

  // Wrap to next row if past left boundary
  if (candidateX < minX) {
    candidateX = rightStartX;
    candidateY = lastPos.y + 410;
  }

  // Step through slots to find the first completely non-overlapping position
  for (let attempt = 0; attempt < 80; attempt++) {
    const candidate = { x: Math.max(minX, candidateX), y: candidateY };
    if (!isPositionColliding(newPedal.id, newPedal.type, candidate, otherPedals, allPositions)) {
      return candidate;
    }

    candidateX -= (newDims.w + 40);
    if (candidateX < minX) {
      candidateX = rightStartX;
      candidateY += 410;
    }
  }

  return findNearestFreePosition(newPedal.id, newPedal.type, { x: candidateX, y: candidateY }, otherPedals, allPositions, surfaceWidth);
}
