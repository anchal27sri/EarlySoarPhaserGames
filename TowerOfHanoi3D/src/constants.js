export const RING_OUTER_RADIUS = 0.6;
export const RING_TUBE_RADIUS = 0.1;
export const ROD_RADIUS = 0.12;
export const ROD_HEIGHT = 3.6;
export const ROD_TOP_Y = ROD_HEIGHT;
export const BASE_RADIUS = 0.9;
export const BASE_HEIGHT = 0.16;
export const BASE_TOP_Y = BASE_HEIGHT;

export const TUBE_ROD_SUM = RING_TUBE_RADIUS + ROD_RADIUS;
export const THREADED_MAX_X = RING_OUTER_RADIUS - TUBE_ROD_SUM;
export const OUTSIDE_MIN_X = RING_OUTER_RADIUS + TUBE_ROD_SUM;

export const GRAVITY = -9.8;
export const GROUND_Y = RING_TUBE_RADIUS;
export const PEG_REST_Y = BASE_HEIGHT + RING_TUBE_RADIUS;

export const RING_HALF_W = RING_OUTER_RADIUS + RING_TUBE_RADIUS;
export const RING_HALF_H = RING_TUBE_RADIUS;

export const RING_COLORS = [
  0xffd700, 0xff4d4d, 0x4db8ff, 0x4dffa6,
  0xd94dff, 0xffb84d, 0xff4d93, 0x4dffd9,
  0xff8c1a,
];

// PEG_X is computed dynamically — see computePegX()
export let PEG_X = 4; // default fallback

export function computePegX(camera) {
  // For orthographic camera, use the right/left bounds directly
  const rightEdge = camera.right + camera.position.x;
  const leftEdge = camera.left + camera.position.x;
  const totalWidth = rightEdge - leftEdge;
  PEG_X = rightEdge - totalWidth * 0.2;
}
