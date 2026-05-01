import * as THREE from "three";

export function createGround(scene) {
  const geometry = new THREE.PlaneGeometry(20, 20);
  const material = new THREE.MeshStandardMaterial({
    color: 0x3a3a50,
    roughness: 0.8,
    metalness: 0.2,
    transparent: true,
    opacity: 0,
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  return ground;
}
