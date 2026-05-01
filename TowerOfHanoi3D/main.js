import * as THREE from "three";
import { createScene, createCamera, createRenderer, createLights, setupResize } from "./src/scene.js";
import { computePegX } from "./src/constants.js";
import { initGame, updateGame } from "./src/game.js";

const scene = createScene();
const camera = createCamera();
const renderer = createRenderer();

computePegX(camera);
createLights(scene);
setupResize(camera, renderer);

initGame(scene, camera, renderer);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  updateGame(dt);

  renderer.render(scene, camera);
}

animate();
