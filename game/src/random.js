// Deterministic seeded pseudo-random number generator (mulberry32) and helpers.
// Ensures city generation, traffic flows, and screenshot scenes are 100% reproducible.

export function createRandom(seed) {
  let state = seed | 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomRange(random, min, max) {
  return min + random() * (max - min);
}

export function randomInt(random, min, max) {
  return Math.floor(min + random() * (max - min + 1));
}

export function randomChoice(random, items) {
  return items[Math.floor(random() * items.length)];
}
