import * as THREE from "three";

export function createScene() {
  const scene = new THREE.Scene();
  // Background handled by CSS — scene is transparent
  return scene;
}

export function createCamera() {
  const viewHeight = 7;
  const aspect = window.innerWidth / window.innerHeight;
  const viewWidth = viewHeight * aspect;
  const camera = new THREE.OrthographicCamera(
    -viewWidth / 2,  // left
    viewWidth / 2,    // right
    viewHeight / 2,   // top
    -viewHeight / 2,  // bottom
    0.1,
    100
  );
  camera.position.set(1, 2.0, 8);
  camera.lookAt(1, 0.0, 0);
  return camera;
}

export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
  return renderer;
}

export function createLights(scene) {
  const ambient = new THREE.AmbientLight(0xfff5e6, 1.0);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffeedd, 1.0);
  directional.position.set(5, 8, 5);
  directional.castShadow = true;
  scene.add(directional);

  const fill = new THREE.DirectionalLight(0xffe8cc, 0.4);
  fill.position.set(-3, 2, -2);
  scene.add(fill);
}

export function setupResize(camera, renderer) {
  window.addEventListener("resize", () => {
    const aspect = window.innerWidth / window.innerHeight;
    const viewHeight = 7;
    const viewWidth = viewHeight * aspect;
    camera.left = -viewWidth / 2;
    camera.right = viewWidth / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
