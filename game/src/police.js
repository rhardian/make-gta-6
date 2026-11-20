// 5-Star Wanted Level & Solaris Metro Police Department (SMPD) Tactical Pursuit System:
// crime reporting, patrol & SWAT interceptor spawning, pursuit AI, helicopter spotlight, and heat evasion.

import { findNearestRoadCoord } from './city.js';
import { createPedestrian } from './pedestrians.js';
import { createVehicleInstance, updateVehiclePhysics } from './vehicles.js';

const CRIME_HEAT = {
  gunfire: 18,
  carjack: 42,
  hit_and_run: 48,
  police_theft: 95,
  police_assault: 85,
  bank_heist: 165,
  explosion: 90,
};

const DISPATCH_LINES = [
  'ALL UNITS: Code 4 across Solaris Bay.',
  'DISPATCH ★: 10-31 Reported vehicle theft in progress. Patrol unit responding.',
  'DISPATCH ★★: High-speed suspect on Ocean Drive! SMPD Interceptors engage pursuit!',
  'DISPATCH ★★★: Code 3 Tactical Alert! Armed suspect — deploy interceptors & air spotlight!',
  'DISPATCH ★★★★: SWAT ENFORCER DEPLOYED! Set roadblocks & authorize lethal force!',
  'DISPATCH ★★★★★: CITYWIDE LOCKDOWN! All SMPD Tactical & Air Units converge on Elena Vega!',
];

function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function createWantedSystem() {
  const state = {
    stars: 0,
    heat: 0,
    cooldown: 0,
    maxCooldown: 16,
    evading: false,
    sirenTimer: 0,
    heliAngle: 0,
    heliX: 1800,
    heliY: 960,
    spawnTimer: 0,
    dispatchText: DISPATCH_LINES[0],
    crimeFlash: 0,
  };

  function syncStarsFromHeat() {
    let nextStars = 0;
    if (state.heat >= 260) nextStars = 5;
    else if (state.heat >= 180) nextStars = 4;
    else if (state.heat >= 115) nextStars = 3;
    else if (state.heat >= 60) nextStars = 2;
    else if (state.heat >= 22) nextStars = 1;

    if (nextStars !== state.stars) {
      state.stars = nextStars;
      state.dispatchText = DISPATCH_LINES[nextStars] || DISPATCH_LINES[0];
      state.maxCooldown = 12 + nextStars * 4;
      state.cooldown = state.maxCooldown;
    }
  }

  function reportCrime(crimeType, x, y) {
    const added = CRIME_HEAT[crimeType] || 30;
    state.heat = Math.min(340, state.heat + added);
    syncStarsFromHeat();
    state.cooldown = state.maxCooldown;
    state.evading = false;
    state.crimeFlash = 1.0;
    state.heliX = x;
    state.heliY = y;
  }

  function setWantedStars(stars) {
    const thresholds = [0, 32, 75, 135, 205, 285];
    state.heat = thresholds[Math.max(0, Math.min(5, stars))];
    syncStarsFromHeat();
    state.cooldown = state.maxCooldown;
    state.evading = false;
  }

  function clearWanted() {
    state.stars = 0;
    state.heat = 0;
    state.cooldown = 0;
    state.evading = false;
    state.dispatchText = DISPATCH_LINES[0];
  }

  return {
    state,
    get stars() {
      return state.stars;
    },
    reportCrime,
    setWantedStars,
    clearWanted,
  };
}

export function spawnPoliceUnitNearPlayer(vehicles, player, city, stars, nextId = 900) {
  const specKey = stars >= 4 ? 'smpd_enforcer' : 'smpd_interceptor';
  const offsetDist = 230 + (nextId % 3) * 55;
  const spawnAngle = player.angle + (nextId % 2 === 0 ? 0.35 : -0.35);
  const rawX = player.x + Math.cos(spawnAngle) * offsetDist;
  const rawY = player.y + Math.sin(spawnAngle) * offsetDist;
  const rx = findNearestRoadCoord(city.roadsX, rawX);
  const dirToPlayer = Math.atan2(player.y - rawY, player.x - rx);

  const cruiser = createVehicleInstance(nextId, specKey, rx, rawY, dirToPlayer, 'police');
  cruiser.sirenOn = true;
  cruiser.driverType = 'police';
  cruiser.speed = 155;
  cruiser.vx = Math.cos(dirToPlayer) * cruiser.speed;
  cruiser.vy = Math.sin(dirToPlayer) * cruiser.speed;
  vehicles.push(cruiser);
  return cruiser;
}

export function updatePolicePursuit(police, vehicles, pedestrians, player, combat, city, audio, dt) {
  const state = police.state;
  if (state.crimeFlash > 0) state.crimeFlash = Math.max(0, state.crimeFlash - dt * 1.8);

  if (state.stars === 0) return;

  state.sirenTimer += dt * 6.5;
  state.heliAngle = (state.heliAngle + dt * 1.4) % (Math.PI * 2);
  state.heliX += (player.x + Math.cos(state.heliAngle) * 36 - state.heliX) * Math.min(1, dt * 3.5);
  state.heliY += (player.y + Math.sin(state.heliAngle) * 36 - state.heliY) * Math.min(1, dt * 3.5);

  let activePoliceCars = 0;
  let nearestPoliceDist = Infinity;

  for (let i = 0; i < vehicles.length; i += 1) {
    const v = vehicles[i];
    if (v.driverType !== 'police' || v.destroyed || v === player.vehicle) continue;

    const dx = player.x - v.x;
    const dy = player.y - v.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 960) {
      // Relocate far-behind police unit ahead/behind player
      const rx = findNearestRoadCoord(city.roadsX, player.x - Math.cos(player.angle) * 260);
      v.x = rx + (i % 2 === 0 ? -20 : 20);
      v.y = player.y - Math.sin(player.angle) * 260;
      v.angle = Math.atan2(player.y - v.y, player.x - v.x);
      continue;
    }

    activePoliceCars += 1;
    if (dist < nearestPoliceDist) nearestPoliceDist = dist;

    // Intercept steering toward player's predicted position
    const leadTime = Math.min(0.65, dist / 340);
    const targetX = player.x + (player.vehicle ? player.vehicle.vx * leadTime : 0);
    const targetY = player.y + (player.vehicle ? player.vehicle.vy * leadTime : 0);
    const desiredAngle = Math.atan2(targetY - v.y, targetX - v.x);
    const angleDiff = normalizeAngle(desiredAngle - v.angle);
    const steer = Math.max(-1, Math.min(1, angleDiff * 2.7));
    const shouldBrake = dist < 52 && (!player.vehicle || player.vehicle.speed < 25);

    updateVehiclePhysics(
      v,
      {
        throttle: shouldBrake ? -0.6 : 0.94,
        steer,
        handbrake: Math.abs(angleDiff) > 1.1 && v.speed > 120,
        boost: dist > 180 && state.stars >= 3,
      },
      city,
      combat,
      dt,
    );

    // Ram damage when colliding with player vehicle
    if (player.vehicle && dist < (v.spec.width + player.vehicle.spec.width) * 0.65) {
      const relSpeed = Math.hypot(v.vx - player.vehicle.vx, v.vy - player.vehicle.vy);
      if (relSpeed > 55) {
        player.vehicle.health = Math.max(10, player.vehicle.health - relSpeed * 0.04 * dt * 15);
        combat.spawnBurstParticles((v.x + player.x) * 0.5, (v.y + player.y) * 0.5, 10, '#fbbf24', 5);
      }
    }

    // Deploy tactical officer on foot when cruiser corners an on-foot player
    if (!player.vehicle && dist < 82 && v.speed < 25 && pedestrians.length < 75) {
      v.driverType = 'none';
      const officer = createPedestrian(
        700 + pedestrians.length,
        v.x - Math.sin(v.angle) * 20,
        v.y + Math.cos(v.angle) * 20,
        'police',
      );
      officer.state = 'attack';
      pedestrians.push(officer);
    }
  }

  // Spawn additional SMPD cruisers up to wanted star cap
  const desiredCruisers = Math.min(4, state.stars);
  state.spawnTimer -= dt;
  if (activePoliceCars < desiredCruisers && state.spawnTimer <= 0) {
    state.spawnTimer = 2.8;
    spawnPoliceUnitNearPlayer(vehicles, player, city, state.stars, 800 + vehicles.length);
  }

  // Heat cooldown when player outruns police line-of-sight
  const DetectionRadius = 290 + state.stars * 35;
  if (nearestPoliceDist > DetectionRadius) {
    state.evading = true;
    state.cooldown -= dt;
    if (state.cooldown <= 0) {
      police.clearWanted();
      player.cash += 1000;
      player.respect += 100;
      combat.spawnFloatingText(player.x, player.y, 26, 'PURSUIT EVADED! +$1,000', '#22c55e');
      if (audio) audio.playSfx('pickup');
    }
  } else {
    state.evading = false;
    state.cooldown = Math.min(state.maxCooldown, state.cooldown + dt * 0.6);
  }
}
