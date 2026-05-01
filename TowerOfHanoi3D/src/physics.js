import {
  GRAVITY, GROUND_Y, PEG_REST_Y, PEG_X,
  RING_HALF_W, RING_HALF_H,
} from "./constants.js";

export function applyGravity(rings, draggedRing, dt) {
  for (const r of rings) {
    if (r === draggedRing) continue;

    const restY = r.onPeg ? PEG_REST_Y : GROUND_Y;

    r.velocityY += GRAVITY * dt;
    r.mesh.position.y += r.velocityY * dt;

    if (r.mesh.position.y <= restY) {
      r.mesh.position.y = restY;
      r.velocityY = 0;
    }

    if (r.onPeg) {
      r.mesh.position.x = PEG_X;
    }
  }
}

export function resolveRingCollisions(rings, draggedRing) {
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < rings.length; i++) {
      for (let j = i + 1; j < rings.length; j++) {
        const a = rings[i];
        const b = rings[j];
        const dx = a.mesh.position.x - b.mesh.position.x;
        const dy = a.mesh.position.y - b.mesh.position.y;
        const overlapX = 2 * RING_HALF_W - Math.abs(dx);
        const overlapY = 2 * RING_HALF_H - Math.abs(dy);

        if (overlapX <= 0 || overlapY <= 0) continue;

        if (overlapX < overlapY) {
          const push = overlapX / 2;
          const sign = dx >= 0 ? 1 : -1;
          if (a !== draggedRing) a.mesh.position.x += sign * push;
          if (b !== draggedRing) b.mesh.position.x -= sign * push;
        } else {
          if (a !== draggedRing && b !== draggedRing) {
            const push = overlapY / 2;
            const sign = dy >= 0 ? 1 : -1;
            a.mesh.position.y += sign * push;
            a.velocityY = 0;
            b.mesh.position.y -= sign * push;
            b.velocityY = 0;
          } else if (a !== draggedRing) {
            const sign = dy >= 0 ? 1 : -1;
            a.mesh.position.y += sign * overlapY;
            a.velocityY = 0;
          } else if (b !== draggedRing) {
            const sign = dy >= 0 ? 1 : -1;
            b.mesh.position.y -= sign * overlapY;
            b.velocityY = 0;
          }
          if (a.mesh.position.y < GROUND_Y) a.mesh.position.y = GROUND_Y;
          if (b.mesh.position.y < GROUND_Y) b.mesh.position.y = GROUND_Y;
        }
      }
    }
  }
}
