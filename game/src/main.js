// Solaris Bay: Heatwave entrypoint and fixed-timestep 60 Hz game loop.
// Supports interactive play (title, open-world play, tactical city map, pause, respawn)
// and deterministic screenshot staging via ?shot=chase|heist|harbor|overview&seed=N.

import { STEP } from './config.js';
import {
  ACTION_CONFIRM,
  ACTION_INTERACT,
  ACTION_MAP,
  ACTION_NEXT_WEAPON,
  ACTION_PAUSE,
  ACTION_RADIO,
  ACTION_SAVE,
  createInput,
} from './input.js';
import { createRandom } from './random.js';
import {
  createRenderer,
  SCREEN_MAP,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
} from './render.js';
import { readBestScore, saveBestScore } from './save.js';
import { stageShot } from './shots.js';
import { createWorld, EVENT_OVER } from './world.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  // Stage an inviting live 3D Ocean Drive backdrop behind the title screen
  stageShot('chase', world);
  let screen = SCREEN_TITLE;
  let best = readBestScore();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    if (status) status.textContent = message;
  }

  function startGame(fromSave = true) {
    world.reset(fromSave);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Entering Solaris Bay. Explore on foot or press E near any vehicle to drive.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBestScore(best);
    }
    announce(`Neutralized in Solaris Bay. Net worth $${world.state.score}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (!actions) return;

    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame(screen === SCREEN_TITLE);
      return;
    }

    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY || screen === SCREEN_MAP) {
        screen = SCREEN_PAUSED;
        announce('Game paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Resumed Solaris Bay.');
      }
      return;
    }

    if (actions & ACTION_MAP) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_MAP;
        announce('Solaris Bay tactical GPS map and campaign dossier opened.');
      } else if (screen === SCREEN_MAP) {
        screen = SCREEN_PLAY;
        announce('Closed tactical map.');
      }
    }

    if (screen !== SCREEN_PLAY && screen !== SCREEN_MAP) return;

    if (actions & ACTION_INTERACT) {
      world.handleInteract();
    }
    if (actions & ACTION_RADIO) {
      const station = world.state.audio.cycleRadioStation();
      world.state.combat.spawnFloatingText(
        world.state.player.x,
        world.state.player.y,
        24,
        `♪ ${station.name} — ${station.track}`,
        '#f43f5e',
      );
    }
    if (actions & ACTION_NEXT_WEAPON) {
      world.cycleWeapon(0);
    }
    if (actions & ACTION_SAVE) {
      world.quickSave();
      if (world.state.score > best) {
        best = world.state.score;
        saveBestScore(best);
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;

    handleActions();
    const controls = input.sampleControls();

    if (screen === SCREEN_TITLE) {
      while (accumulator >= STEP) {
        world.step(STEP, { throttle: 0.65, steer: 0, handbrake: false, boost: false }, true);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY || screen === SCREEN_MAP) {
      while (accumulator >= STEP && (screen === SCREEN_PLAY || screen === SCREEN_MAP)) {
        const events = world.step(STEP, controls, false);
        if (events & EVENT_OVER) endGame();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }

    if (world.state.score > best) {
      best = world.state.score;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Solaris Bay: Heatwave. Press Space, Enter or Click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
