import {
  GRAVITY, GROUND_Y, PEG_REST_Y, PEG_X,
  RING_HALF_W, RING_HALF_H, BASE_RADIUS, BASE_TOP_Y,
  RING_TUBE_RADIUS, THREADED_MAX_X,
} from "./constants.js";

export function applyGravity(rings, draggedRing, dt) {
  for (const r of rings) {
    if (r === draggedRing) continue;

    r.velocityY += GRAVITY * dt;
    r.mesh.position.y += r.velocityY * dt;

    const distToPeg = Math.abs(r.mesh.position.x - PEG_X);

    // Check if ring overlaps the base horizontally
    const overlapsBase = distToPeg < RING_HALF_W + BASE_RADIUS;
    // Check if ring is threaded (rod goes through the hole)
    const isThreaded = r.onPeg || r.threaded || distToPeg < THREADED_MAX_X;

    let restY = GROUND_Y;
    if (isThreaded) {
      // Threaded rings rest on top of the base
      restY = PEG_REST_Y;
    } else if (overlapsBase) {
      // Non-threaded rings that overlap the base land on top of it
      restY = BASE_TOP_Y + RING_TUBE_RADIUS;
    }

    if (r.mesh.position.y <= restY) {
      r.mesh.position.y = restY;
      r.velocityY = 0;
      if (isThreaded) {
        r.onPeg = true;
        r.threaded = true;
      }
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
