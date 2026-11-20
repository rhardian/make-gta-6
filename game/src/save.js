// Safehouse & localStorage persistence: saves player cash, street respect, mission progress,
// unlocked arsenal, and best score offline across browser visits.

import { BEST_KEY, PLAYER_CONFIG, SAVE_KEY } from './config.js';

export function readBestScore() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(Math.floor(value)));
  } catch {
    // Storage may be disabled in private windows.
  }
}

export function loadGameProgress() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      cash: Number.isFinite(parsed.cash) ? parsed.cash : PLAYER_CONFIG.startingCash,
      respect: Number.isFinite(parsed.respect) ? parsed.respect : 0,
      missionIndex: Number.isInteger(parsed.missionIndex) ? parsed.missionIndex : 0,
      armor: Number.isFinite(parsed.armor) ? parsed.armor : 50,
      x: Number.isFinite(parsed.x) ? parsed.x : 1840,
      y: Number.isFinite(parsed.y) ? parsed.y : 960,
      savedAt: parsed.savedAt || 'Miramar Safehouse',
    };
  } catch {
    return null;
  }
}

export function saveGameProgress(state) {
  const payload = {
    cash: Math.floor(state.player.cash),
    respect: Math.floor(state.player.respect),
    missionIndex: state.missions.currentIndex,
    armor: Math.floor(state.player.armor),
    x: Math.round(state.player.x),
    y: Math.round(state.player.y),
    savedAt: 'Miramar Villa Safehouse',
  };
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors in sandboxed contexts.
  }
  const totalScore = payload.cash + payload.respect * 25;
  if (totalScore > readBestScore()) saveBestScore(totalScore);
  return payload;
}

export function clearSavedProgress() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore if unavailable.
  }
}
