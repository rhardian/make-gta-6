// Vehicle pool, arcade-drift driving physics, nitro boost, collision damage, carjacking,
// and Chrome Customs respray & repair service.

import { collideWorldBuildings } from './city.js';
import { PLAYER_CONFIG, VEHICLE_SPECS } from './config.js';
import { randomChoice } from './random.js';

const CIVILIAN_ARCHETYPES = [
  'aurelia_gt',
  'mako_roadster',
  'solstice_coupe',
  'cabrillo_cruiser',
  'veloce_interceptor',
];

export function createVehicleInstance(id, specKey, x, y, angle, role = 'traffic') {
  const spec = VEHICLE_SPECS[specKey] || VEHICLE_SPECS.cabrillo_cruiser;
  return {
    id,
    specKey: spec.id,
    spec,
    role,
    x,
    y,
    vx: 0,
    vy: 0,
    angle,
    angularVel: 0,
    speed: 0,
    steer: 0,
    throttle: 0,
    braking: false,
    drifting: false,
    boosting: false,
    nitro: 100,
    health: spec.maxHealth,
    maxHealth: spec.maxHealth,
    destroyed: false,
    driverType: role === 'parked' ? 'none' : role === 'police' ? 'police' : 'civilian',
    sirenOn: Boolean(spec.police),
    sirenPhase: 0,
    headlightsOn: true,
    bodyColor: spec.bodyColor,
    accentColor: spec.accentColor,
    aiTargetLane: 0,
    aiTurnCooldown: 0,
  };
}

export function createVehiclePool(random, city) {
  const vehicles = [];
  let nextId = 1;

  // Featured hero vehicles parked at iconic Solaris Bay landmarks
  vehicles.push(
    createVehicleInstance(nextId++, 'aurelia_gt', 1920, 935, 0, 'parked'),
    createVehicleInstance(nextId++, 'mako_roadster', 1900, 2225, 0, 'parked'),
    createVehicleInstance(nextId++, 'solstice_coupe', 640, 935, Math.PI * 0.5, 'parked'),
    createVehicleInstance(nextId++, 'titan_armored', 1280, 995, 0, 'parked'),
    createVehicleInstance(nextId++, 'veloce_interceptor', 960, 345, 0, 'parked'),
    createVehicleInstance(nextId++, 'smpd_interceptor', 640, 1895, 0, 'parked'),
  );

  // Active city traffic along avenues and boulevards
  for (let i = 0; i < city.roadsX.length; i += 1) {
    const rx = city.roadsX[i];
    for (let y = 420; y <= 2380; y += 480) {
      const specKey = randomChoice(random, CIVILIAN_ARCHETYPES);
      const dir = (i + y) % 2 === 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      const laneOffset = dir > 0 ? -18 : 18;
      const v = createVehicleInstance(nextId++, specKey, rx + laneOffset, y, dir, 'traffic');
      v.speed = 95;
      v.vx = Math.cos(dir) * v.speed;
      v.vy = Math.sin(dir) * v.speed;
      vehicles.push(v);
    }
  }

  for (let i = 0; i < city.roadsY.length; i += 2) {
    const ry = city.roadsY[i];
    for (let x = 500; x <= 2050; x += 520) {
      const specKey = randomChoice(random, CIVILIAN_ARCHETYPES);
      const dir = (i + x) % 2 === 0 ? 0 : Math.PI;
      const laneOffset = dir === 0 ? 18 : -18;
      const v = createVehicleInstance(nextId++, specKey, x, ry + laneOffset, dir, 'traffic');
      v.speed = 90;
      v.vx = Math.cos(dir) * v.speed;
      v.vy = Math.sin(dir) * v.speed;
      vehicles.push(v);
    }
  }

  return vehicles;
}

export function updateVehiclePhysics(vehicle, controls, city, combat, dt) {
  if (vehicle.destroyed) {
    vehicle.vx *= Math.pow(0.15, dt);
    vehicle.vy *= Math.pow(0.15, dt);
    vehicle.x += vehicle.vx * dt;
    vehicle.y += vehicle.vy * dt;
    vehicle.speed = Math.hypot(vehicle.vx, vehicle.vy);
    return;
  }

  const spec = vehicle.spec;
  const forwardX = Math.cos(vehicle.angle);
  const forwardY = Math.sin(vehicle.angle);
  const rightX = -forwardY;
  const rightY = forwardX;

  let forwardSpeed = vehicle.vx * forwardX + vehicle.vy * forwardY;
  let lateralSpeed = vehicle.vx * rightX + vehicle.vy * rightY;

  const throttle = controls ? controls.throttle : 0;
  const steer = controls ? controls.steer : 0;
  const handbrake = Boolean(controls && controls.handbrake);
  const boost = Boolean(controls && controls.boost && vehicle.nitro > 4 && throttle > 0.1);

  vehicle.throttle = throttle;
  vehicle.steer = steer;
  vehicle.braking = throttle < -0.1 && forwardSpeed > 15;
  vehicle.drifting = handbrake && Math.abs(forwardSpeed) > 65;
  vehicle.boosting = boost;

  if (boost) {
    vehicle.nitro = Math.max(0, vehicle.nitro - 28 * dt);
  } else {
    vehicle.nitro = Math.min(100, vehicle.nitro + 9 * dt);
  }

  const maxSpeed = spec.topSpeed * (boost ? 1.26 : 1);
  const accelRate = spec.accel * (boost ? 1.45 : 1);

  if (throttle > 0) {
    forwardSpeed += throttle * accelRate * dt;
  } else if (throttle < 0) {
    if (forwardSpeed > 12) {
      forwardSpeed += throttle * spec.brake * dt;
    } else {
      forwardSpeed += throttle * spec.accel * 0.55 * dt;
    }
  } else {
    forwardSpeed *= Math.pow(0.45, dt);
  }

  if (handbrake) {
    forwardSpeed *= Math.pow(0.32, dt);
  }

  forwardSpeed = Math.max(-spec.topSpeed * 0.42, Math.min(maxSpeed, forwardSpeed));

  const speedFactor = Math.min(1, Math.abs(forwardSpeed) / 75);
  const reverseSign = forwardSpeed >= -2 ? 1 : -1;
  const driftTurnBonus = vehicle.drifting ? 1.28 : 1;
  vehicle.angularVel = steer * spec.turnRate * speedFactor * reverseSign * driftTurnBonus;
  vehicle.angle += vehicle.angularVel * dt;

  const grip = vehicle.drifting ? 0.965 : spec.driftGrip;
  lateralSpeed *= Math.pow(1 - grip, dt * 10);

  const newForwardX = Math.cos(vehicle.angle);
  const newForwardY = Math.sin(vehicle.angle);
  const newRightX = -newForwardY;
  const newRightY = newForwardX;

  vehicle.vx = newForwardX * forwardSpeed + newRightX * lateralSpeed;
  vehicle.vy = newForwardY * forwardSpeed + newRightY * lateralSpeed;
  vehicle.x += vehicle.vx * dt;
  vehicle.y += vehicle.vy * dt;
  vehicle.speed = Math.hypot(vehicle.vx, vehicle.vy);

  if (vehicle.sirenOn) {
    vehicle.sirenPhase = (vehicle.sirenPhase + dt * 7.5) % (Math.PI * 2);
  }

  // Emit drift skid marks & nitro exhaust smoke
  if (combat && (vehicle.drifting || Math.abs(lateralSpeed) > 38) && vehicle.speed > 60) {
    combat.skids.push({
      x: vehicle.x - newForwardX * (spec.length * 0.36) + newRightX * (spec.width * 0.36),
      y: vehicle.y - newForwardY * (spec.length * 0.36) + newRightY * (spec.width * 0.36),
      angle: vehicle.angle,
      alpha: 0.55,
      ttl: 4.5,
    });
    combat.skids.push({
      x: vehicle.x - newForwardX * (spec.length * 0.36) - newRightX * (spec.width * 0.36),
      y: vehicle.y - newForwardY * (spec.length * 0.36) - newRightY * (spec.width * 0.36),
      angle: vehicle.angle,
      alpha: 0.55,
      ttl: 4.5,
    });
    if (combat.skids.length > 90) combat.skids.shift();
  }

  const col = collideWorldBuildings(city, vehicle.x, vehicle.y, spec.width * 0.55);
  if (col.hitBuilding) {
    vehicle.x = col.x;
    vehicle.y = col.y;
    if (vehicle.speed > 110) {
      vehicle.health = Math.max(15, vehicle.health - (vehicle.speed - 100) * 0.08);
    }
    vehicle.vx *= -0.35;
    vehicle.vy *= -0.35;
  }
}

export function findNearestInteractableVehicle(player, vehicles) {
  let best = null;
  let bestDist = PLAYER_CONFIG.enterRange;
  for (let i = 0; i < vehicles.length; i += 1) {
    const v = vehicles[i];
    if (v.destroyed) continue;
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < bestDist) {
      bestDist = d;
      best = v;
    }
  }
  return best;
}

export function tryEnterOrStealVehicle(player, vehicles, police, combat, audio) {
  const target = findNearestInteractableVehicle(player, vehicles);
  if (!target) return null;

  const wasOccupied = target.driverType !== 'none' && target.driverType !== 'player';
  const isPoliceUnit = Boolean(target.spec.police);

  player.vehicle = target;
  player.x = target.x;
  player.y = target.y;
  target.driverType = 'player';
  target.role = 'player';

  if (wasOccupied || isPoliceUnit) {
    if (police) {
      police.reportCrime(isPoliceUnit ? 'police_theft' : 'carjack', target.x, target.y);
    }
    if (combat) {
      combat.spawnFloatingText(
        target.x,
        target.y,
        24,
        isPoliceUnit ? 'SMPD CRUISER HIJACKED! ★' : `STOLE ${target.spec.name.toUpperCase()}!`,
        '#fbbf24',
      );
    }
  } else if (combat) {
    combat.spawnFloatingText(target.x, target.y, 22, `${target.spec.name.toUpperCase()}`, '#38bdf8');
  }

  if (audio) audio.playSfx('door');
  return target;
}

export function exitCurrentVehicle(player, audio) {
  const v = player.vehicle;
  if (!v) return false;
  const sideX = -Math.sin(v.angle) * (v.spec.width * 0.88);
  const sideY = Math.cos(v.angle) * (v.spec.width * 0.88);
  player.x = v.x - sideX;
  player.y = v.y - sideY;
  player.angle = v.angle;
  v.driverType = 'none';
  v.throttle = 0;
  v.steer = 0;
  player.vehicle = null;
  if (audio) audio.playSfx('door');
  return true;
}

export function resprayAndRepairVehicle(vehicle, player, police, combat, audio) {
  const cost = 500;
  if (!vehicle || player.cash < cost) return false;
  const customColors = ['#ff6224', '#00e5cf', '#ec4899', '#a855f7', '#facc15', '#38bdf8'];
  const idx = (customColors.indexOf(vehicle.bodyColor) + 1) % customColors.length;
  vehicle.bodyColor = customColors[idx];
  vehicle.health = vehicle.maxHealth;
  vehicle.nitro = 100;
  player.cash -= cost;
  if (police) police.clearWanted();
  if (combat) {
    combat.spawnFloatingText(vehicle.x, vehicle.y, 28, 'CHROME CUSTOMS RESPRAY // HEAT CLEARED!', '#22d3ee');
  }
  if (audio) audio.playSfx('pickup');
  return true;
}
