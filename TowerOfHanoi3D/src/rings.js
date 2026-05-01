import * as THREE from "three";
import { RING_OUTER_RADIUS, RING_TUBE_RADIUS, RING_COLORS, GROUND_Y, PEG_X, RING_HALF_W } from "./constants.js";

export function createRings(scene, camera) {
  const count = Math.floor(Math.random() * 7) + 1; // 1–7 rings
  const geometry = new THREE.TorusGeometry(RING_OUTER_RADIUS, RING_TUBE_RADIUS, 32, 100);
  const rings = [];

  for (let i = 0; i < count; i++) {
    const material = new THREE.MeshStandardMaterial({
      color: RING_COLORS[i % RING_COLORS.length],
      roughness: 0.25,
      metalness: 0.2,
      emissive: RING_COLORS[i % RING_COLORS.length],
      emissiveIntensity: 0.15,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;

    // Add invisible hit area for easier touch/drag (larger than visual ring)
    const hitGeo = new THREE.CylinderGeometry(
      RING_OUTER_RADIUS + RING_TUBE_RADIUS + 0.25,
      RING_OUTER_RADIUS + RING_TUBE_RADIUS + 0.25,
      RING_TUBE_RADIUS * 4,
      32
    );
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.rotation.x = Math.PI / 2; // undo parent rotation
    mesh.add(hitMesh);

    // Place rings centered in the area left of the peg
    const gap = 1.5; // gap between peg and nearest ring
    const areaRight = PEG_X - gap; // right boundary of ring area
    const areaLeft = camera.left + camera.position.x + 0.5; // left edge with padding
    const areaCenter = (areaLeft + areaRight) / 2;
    const minSpacing = RING_HALF_W * 2 + 0.05;
    const idealSpacing = 1.5;
    const spacing = count > 1 ? Math.min(idealSpacing, (areaRight - areaLeft) / (count - 1)) : 0;
    const finalSpacing = Math.max(spacing, minSpacing);
    const totalWidth = (count - 1) * finalSpacing;
    const startX = areaCenter - totalWidth / 2;
    mesh.position.set(startX + i * finalSpacing, GROUND_Y, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    rings.push({ mesh, velocityY: 0, onPeg: false, threaded: false });
  }

  return rings;
}
