import * as THREE from "three";
import { createGround } from "./ground.js";
import { createPeg } from "./peg.js";
import { createRings } from "./rings.js";
import { setupDrag, getDraggedRing, teardownDrag } from "./drag.js";
import { applyGravity, resolveRingCollisions } from "./physics.js";
import { PEG_X } from "./constants.js";
import {
  createUI, updateRound, updateScore,
  showOptions, hideOptions, showFeedback, showGameOver,
} from "./ui.js";

const TOTAL_ROUNDS = 20;

// Game phases
const PHASE_DRAG = "drag";       // Part 1: user drags rings onto peg
const PHASE_SETTLING = "settling"; // Waiting for rings to settle on peg
const PHASE_SLIDE = "slide";     // Transition: peg slides left
const PHASE_QUIZ = "quiz";       // Part 2: pick the count
const PHASE_FEEDBACK = "feedback"; // Showing correct/wrong
const PHASE_CLEANUP = "cleanup"; // Clearing for next round
const PHASE_DONE = "done";       // Game over

let state = {
  round: 1,
  score: 0,
  phase: PHASE_DRAG,
  rings: [],
  world: null,
  pegMeshes: null,
  ringCount: 0,
  slideTarget: 0,
  renderer: null,
  camera: null,
};

export function initGame(scene, camera, renderer) {
  state.camera = camera;
  state.renderer = renderer;

  createUI();

  // Create persistent world group
  state.world = new THREE.Group();
  state.world.position.y = -2.5;
  scene.add(state.world);

  createGround(state.world);

  startRound(scene);
}

function clearRound() {
  // Remove old rings
  for (const r of state.rings) {
    state.world.remove(r.mesh);
    r.mesh.geometry.dispose();
    r.mesh.material.dispose();
  }
  state.rings = [];

  // Remove old peg meshes
  if (state.pegMeshes) {
    for (const m of state.pegMeshes) {
      state.world.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    state.pegMeshes = null;
  }
}

function startRound() {
  clearRound();
  hideOptions();

  // Reset world position
  state.world.position.x = 0;

  updateRound(state.round);

  // Create peg directly in world
  const peg = createPeg(state.world);
  state.pegMeshes = [peg.rod, peg.base];

  // Create rings
  state.rings = createRings(state.world, state.camera);
  state.ringCount = state.rings.length;

  // Setup drag
  teardownDrag();
  setupDrag(state.renderer, state.camera, state.rings, state.world);

  state.phase = PHASE_DRAG;
}

export function updateGame(dt) {
  const dragged = getDraggedRing();

  if (state.phase === PHASE_DRAG) {
    applyGravity(state.rings, dragged, dt);
    resolveRingCollisions(state.rings, dragged);

    // Check if all rings are on the peg (threaded and not being dragged)
    if (!dragged) {
      const allOnPeg = state.rings.every((r) => r.onPeg || r.threaded);
      if (allOnPeg) {
        state.phase = PHASE_SETTLING;
        teardownDrag();
      }
    }
  }

  if (state.phase === PHASE_SETTLING) {
    applyGravity(state.rings, null, dt);
    resolveRingCollisions(state.rings, null);

    // Wait until all rings have zero velocity (fully settled)
    const allSettled = state.rings.every((r) => Math.abs(r.velocityY) < 0.01);
    if (allSettled) {
      state.phase = PHASE_SLIDE;
      state.slideTarget = -(PEG_X * 1.2);
    }
  }

  if (state.phase === PHASE_SLIDE) {
    applyGravity(state.rings, null, dt);
    resolveRingCollisions(state.rings, null);

    // Slide the whole world left
    const speed = 4;
    const target = state.slideTarget;
    const current = state.world.position.x;
    if (current > target) {
      state.world.position.x = Math.max(current - speed * dt, target);
    } else {
      state.world.position.x = target;
      state.phase = PHASE_QUIZ;
      showOptions(state.ringCount, handleAnswer);
    }
  }

  if (state.phase === PHASE_QUIZ) {
    // Just wait for user click — physics still runs for visual stability
    applyGravity(state.rings, null, dt);
    resolveRingCollisions(state.rings, null);
  }
}

function handleAnswer(selected) {
  hideOptions();
  const correct = selected === state.ringCount;

  if (correct) {
    state.score++;
    updateScore(state.score);
  }

  showFeedback(correct);
  state.phase = PHASE_FEEDBACK;

  setTimeout(() => {
    if (correct) {
      if (state.round >= TOTAL_ROUNDS) {
        state.phase = PHASE_DONE;
        showGameOver(state.score);
        return;
      }
      state.round++;
      startRound();
    } else {
      // Wrong answer — show options again
      state.phase = PHASE_QUIZ;
      showOptions(state.ringCount, handleAnswer);
    }
  }, 1300);
}

export function getRings() {
  return state.rings;
}
