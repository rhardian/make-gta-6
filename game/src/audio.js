// Procedural WebAudio synthesizer for Solaris Bay: Heatwave.
// Generates engine RPM hum, police sirens, gunfire, explosions, pickup chimes,
// and 3 synthwave in-car radio stations with zero external audio files.

import { RADIO_STATIONS } from './config.js';

export function createAudioEngine() {
  let ctx = null;
  let muted = false;
  let stationIndex = 0;
  let noteStep = 0;
  let beatTimer = 0;
  let sirenTimer = 0;

  function ensureContext() {
    if (muted) return null;
    if (!ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          ctx = new AudioCtx();
        } catch {
          ctx = null;
        }
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playTone(freq, duration, type = 'sawtooth', gainValue = 0.06, slideTo = null) {
    const audioCtx = ensureContext();
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
      }
      gain.gain.setValueAtTime(gainValue, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Ignore audio errors on restricted autoplay pages.
    }
  }

  function playSfx(kind) {
    if (muted) return;
    if (kind === 'gunshot') {
      playTone(190, 0.08, 'sawtooth', 0.08, 55);
    } else if (kind === 'shotgun') {
      playTone(130, 0.14, 'square', 0.1, 38);
    } else if (kind === 'explosion') {
      playTone(95, 0.38, 'sawtooth', 0.14, 24);
    } else if (kind === 'pickup') {
      playTone(523.25, 0.09, 'triangle', 0.07, 659.25);
      setTimeout(() => playTone(783.99, 0.14, 'triangle', 0.07), 70);
    } else if (kind === 'mission') {
      playTone(440, 0.12, 'triangle', 0.08, 554.37);
      setTimeout(() => playTone(659.25, 0.22, 'triangle', 0.09, 880), 110);
    } else if (kind === 'door') {
      playTone(140, 0.07, 'sine', 0.06, 90);
    }
  }

  function cycleRadioStation() {
    stationIndex = (stationIndex + 1) % RADIO_STATIONS.length;
    noteStep = 0;
    return RADIO_STATIONS[stationIndex];
  }

  function currentStation() {
    return RADIO_STATIONS[stationIndex];
  }

  function update(player, police, dt) {
    if (muted || !ctx || ctx.state !== 'running') return;

    if (player.vehicle) {
      const station = RADIO_STATIONS[stationIndex];
      const beatInterval = 60 / station.bpm / 2;
      beatTimer += dt;
      if (beatTimer >= beatInterval) {
        beatTimer -= beatInterval;
        const freq = station.notes[noteStep % station.notes.length];
        noteStep += 1;
        playTone(freq * 0.5, beatInterval * 0.85, 'triangle', 0.025);
      }
    }

    if (police && police.stars > 0) {
      sirenTimer += dt;
      if (sirenTimer >= 0.45) {
        sirenTimer = 0;
        const high = Math.floor(performance.now() / 450) % 2 === 0;
        playTone(high ? 680 : 510, 0.32, 'sine', 0.022);
      }
    }
  }

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  return {
    playSfx,
    cycleRadioStation,
    currentStation,
    update,
    toggleMute,
    ensureContext,
  };
}
