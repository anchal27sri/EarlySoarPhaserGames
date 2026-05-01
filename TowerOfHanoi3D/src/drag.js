import * as THREE from "three";
import {
  GROUND_Y, PEG_X,
  RING_OUTER_RADIUS, RING_TUBE_RADIUS,
  ROD_TOP_Y, BASE_RADIUS, BASE_TOP_Y,
  THREADED_MAX_X, OUTSIDE_MIN_X,
  RING_HALF_W, RING_HALF_H,
} from "./constants.js";

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const intersection = new THREE.Vector3();
const offset = new THREE.Vector3();

let isDragging = false;
let draggedRing = null;
let dragSide = 0; // -1 = left of rod, +1 = right of rod, 0 = undetermined
let enabled = true;

let boundDown = null;
let boundMove = null;
let boundUp = null;

export function getDraggedRing() {
  return draggedRing;
}

export function teardownDrag() {
  if (boundDown) {
    document.removeEventListener("pointerdown", boundDown, true);
    document.removeEventListener("pointermove", boundMove, true);
    window.removeEventListener("pointerup", boundUp);
    boundDown = null;
    boundMove = null;
    boundUp = null;
  }
  isDragging = false;
  draggedRing = null;
  dragSide = 0;
}

function toNDC(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function clampDragPosition(ring, newX, newY, rings) {
  // Ground
  if (newY < GROUND_Y) newY = GROUND_Y;

  const distXToPeg = newX - PEG_X;
  const absDistX = Math.abs(distXToPeg);

  // Rod collision — threaded vs outside
  if (newY < ROD_TOP_Y) {
    if (ring.threaded) {
      // Threaded: lock X to peg center, only allow vertical movement
      newX = PEG_X;
    } else {
      // Lock to the side the ring started on — prevent teleporting through
      if (dragSide !== 0 && absDistX < OUTSIDE_MIN_X) {
        newX = PEG_X + dragSide * OUTSIDE_MIN_X;
      } else if (absDistX < OUTSIDE_MIN_X) {
        newX = PEG_X + (distXToPeg >= 0 ? OUTSIDE_MIN_X : -OUTSIDE_MIN_X);
      }
    }
  } else {
    // Above the rod — free to cross sides, update dragSide
    if (absDistX < THREADED_MAX_X) {
      ring.threaded = true;
    } else if (absDistX > OUTSIDE_MIN_X) {
      ring.threaded = false;
    }
    // If threaded above the rod, still lock to center
    if (ring.threaded) {
      newX = PEG_X;
    }
    // Reset side tracking when above the rod so ring can land on either side
    dragSide = distXToPeg >= 0 ? 1 : -1;
  }

  // Base collision
  const ringOuterEdge = RING_OUTER_RADIUS + RING_TUBE_RADIUS;
  if (
    Math.abs(newX - PEG_X) < ringOuterEdge + BASE_RADIUS &&
    newY - RING_TUBE_RADIUS < BASE_TOP_Y &&
    newY + RING_TUBE_RADIUS > 0
  ) {
    if (ring.mesh.position.y >= BASE_TOP_Y + RING_TUBE_RADIUS - 0.01) {
      newY = BASE_TOP_Y + RING_TUBE_RADIUS;
    } else {
      const pushDist = ringOuterEdge + BASE_RADIUS;
      newX = PEG_X + (distXToPeg >= 0 ? pushDist : -pushDist);
    }
  }

  // Ring-to-ring AABB collision
  for (const other of rings) {
    if (other === ring) continue;
    const dx = newX - other.mesh.position.x;
    const dy = newY - other.mesh.position.y;
    const overlapX = 2 * RING_HALF_W - Math.abs(dx);
    const overlapY = 2 * RING_HALF_H - Math.abs(dy);
    if (overlapX > 0 && overlapY > 0) {
      if (overlapX < overlapY) {
        newX += dx >= 0 ? overlapX : -overlapX;
      } else {
        newY += dy >= 0 ? overlapY : -overlapY;
      }
      if (newY < GROUND_Y) newY = GROUND_Y;
    }
  }

  return { x: newX, y: newY };
}

export function setupDrag(renderer, camera, rings, worldGroup) {
  const groupOffsetY = worldGroup ? worldGroup.position.y : 0;

  boundDown = (event) => {
    event.preventDefault();
    toNDC(event);
    raycaster.setFromCamera(mouse, camera);

    const meshes = rings.map((r) => r.mesh);
    const hits = raycaster.intersectObjects(meshes, true); // recursive for hit areas
    if (hits.length > 0) {
      // Map hit to parent ring mesh (hit could be on child hit area)
      let hitObj = hits[0].object;
      while (hitObj.parent && !rings.some((r) => r.mesh === hitObj)) {
        hitObj = hitObj.parent;
      }
      draggedRing = rings.find((r) => r.mesh === hitObj);
      isDragging = true;
      draggedRing.onPeg = false;
      // Record which side of the rod the ring starts on
      const startDistX = draggedRing.mesh.position.x - PEG_X;
      dragSide = startDistX >= 0 ? 1 : -1;
      renderer.domElement.style.cursor = "grabbing";
      raycaster.ray.intersectPlane(dragPlane, intersection);
      // Convert to local group space
      intersection.y -= groupOffsetY;
      offset.copy(intersection).sub(draggedRing.mesh.position);
    }
  };

  boundMove = (event) => {
    if (!isDragging || !draggedRing) return;
    event.preventDefault();
    toNDC(event);
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(dragPlane, intersection);
    // Convert to local group space
    intersection.y -= groupOffsetY;

    const rawX = intersection.x - offset.x;
    const rawY = intersection.y - offset.y;
    const clamped = clampDragPosition(draggedRing, rawX, rawY, rings);

    draggedRing.mesh.position.x = clamped.x;
    draggedRing.mesh.position.y = clamped.y;
  };

  boundUp = () => {
    if (isDragging && draggedRing) {
      isDragging = false;
      renderer.domElement.style.cursor = "default";
      draggedRing.velocityY = 0;
      draggedRing.onPeg = draggedRing.threaded;
      draggedRing = null;
      dragSide = 0;
    }
  };

  renderer.domElement.addEventListener("pointerdown", boundDown);
  renderer.domElement.addEventListener("pointermove", boundMove);
  window.addEventListener("pointerup", boundUp);
}
