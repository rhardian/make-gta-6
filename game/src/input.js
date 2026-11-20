// Keyboard and mouse input controller for Solaris Bay: Heatwave.
// Supports WASD/Arrows driving & walking, mouse 3D ground aiming & shooting,
// E/F carjacking & garage interaction, Space handbrake drift, Shift nitro/sprint,
// 1-5/Q weapon select, R radio station cycle, M tactical city map, F5 quick-save, and P pause.

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_RADIO = 8;
export const ACTION_MAP = 16;
export const ACTION_SAVE = 32;
export const ACTION_NEXT_WEAPON = 64;

const UP_KEYS = new Set(['KeyW', 'ArrowUp']);
const DOWN_KEYS = new Set(['KeyS', 'ArrowDown']);
const LEFT_KEYS = new Set(['KeyA', 'ArrowLeft']);
const RIGHT_KEYS = new Set(['KeyD', 'ArrowRight']);
const INTERACT_KEYS = new Set(['KeyE', 'KeyF']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const MAP_KEYS = new Set(['KeyM', 'Tab']);
const SAVE_KEYS = new Set(['F5', 'KeyK']);

export function createInput(canvas) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let space = false;
  let shift = false;
  let pointerDown = false;
  let pointerX = FIELD.width * 0.52;
  let pointerY = FIELD.height * 0.44;
  let weaponSlot = 0;
  let actions = 0;

  function updatePointerCoords(event) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * scale) * 0.5;
    const offsetY = (rect.height - FIELD.height * scale) * 0.5;
    pointerX = Math.max(0, Math.min(FIELD.width, (event.clientX - rect.left - offsetX) / scale));
    pointerY = Math.max(0, Math.min(FIELD.height, (event.clientY - rect.top - offsetY) / scale));
  }

  window.addEventListener('keydown', (event) => {
    const code = event.code;
    if (UP_KEYS.has(code)) up = true;
    else if (DOWN_KEYS.has(code)) down = true;
    else if (LEFT_KEYS.has(code)) left = true;
    else if (RIGHT_KEYS.has(code)) right = true;
    else if (code === 'Space') {
      space = true;
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (code === 'ShiftLeft' || code === 'ShiftRight') {
      shift = true;
    } else if (code === 'Enter') {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (INTERACT_KEYS.has(code)) {
      if (!event.repeat) actions |= ACTION_INTERACT;
    } else if (PAUSE_KEYS.has(code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MAP_KEYS.has(code)) {
      if (!event.repeat) actions |= ACTION_MAP;
    } else if (SAVE_KEYS.has(code)) {
      if (!event.repeat) actions |= ACTION_SAVE;
    } else if (code === 'KeyR') {
      if (!event.repeat) actions |= ACTION_RADIO;
    } else if (code === 'KeyQ') {
      if (!event.repeat) actions |= ACTION_NEXT_WEAPON;
    } else if (code >= 'Digit1' && code <= 'Digit5') {
      weaponSlot = Number(code.slice(5));
    } else {
      return;
    }
    event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    const code = event.code;
    if (UP_KEYS.has(code)) up = false;
    else if (DOWN_KEYS.has(code)) down = false;
    else if (LEFT_KEYS.has(code)) left = false;
    else if (RIGHT_KEYS.has(code)) right = false;
    else if (code === 'Space') space = false;
    else if (code === 'ShiftLeft' || code === 'ShiftRight') shift = false;
  });

  window.addEventListener('blur', () => {
    up = false;
    down = false;
    left = false;
    right = false;
    space = false;
    shift = false;
    pointerDown = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    updatePointerCoords(event);
  });

  canvas.addEventListener('pointerdown', (event) => {
    updatePointerCoords(event);
    pointerDown = true;
    actions |= ACTION_CONFIRM;
  });

  window.addEventListener('pointerup', () => {
    pointerDown = false;
  });

  return {
    sampleControls() {
      const pickedSlot = weaponSlot;
      weaponSlot = 0;
      return {
        throttle: (up ? 1 : 0) - (down ? 1 : 0),
        steer: (right ? 1 : 0) - (left ? 1 : 0),
        moveX: (right ? 1 : 0) - (left ? 1 : 0),
        moveY: (up ? 1 : 0) - (down ? 1 : 0),
        handbrake: space,
        boost: shift,
        sprint: shift,
        firing: pointerDown || space,
        pointerX,
        pointerY,
        weaponSlot: pickedSlot,
      };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
