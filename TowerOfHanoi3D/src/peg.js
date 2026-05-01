import * as THREE from "three";
import { PEG_X, ROD_RADIUS, ROD_HEIGHT, BASE_RADIUS, BASE_HEIGHT } from "./constants.js";

export function createPeg(scene) {
  const rodGeo = new THREE.CylinderGeometry(ROD_RADIUS, ROD_RADIUS, ROD_HEIGHT, 32);
  const rodMat = new THREE.MeshStandardMaterial({
    color: 0xf0c87a,
    roughness: 0.4,
    metalness: 0.1,
    emissive: 0xf0c87a,
    emissiveIntensity: 0.1,
  });
  const rod = new THREE.Mesh(rodGeo, rodMat);
  rod.position.set(PEG_X, ROD_HEIGHT / 2, 0);
  rod.castShadow = true;
  scene.add(rod);

  const baseGeo = new THREE.CylinderGeometry(BASE_RADIUS, BASE_RADIUS, BASE_HEIGHT, 32);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0xe8b86d,
    roughness: 0.4,
    metalness: 0.1,
    emissive: 0xe8b86d,
    emissiveIntensity: 0.1,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(PEG_X, BASE_HEIGHT / 2, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  scene.add(base);

  return { rod, base };
}
