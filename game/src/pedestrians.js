// Pedestrian simulation: tropical citizens, beachgoers, armed Kestrel Syndicate guards,
// and on-foot SMPD officers with sidewalk navigation, panic fleeing, shootouts, and cash drops.

import { collideWorldBuildings, findNearestRoadCoord } from './city.js';
import { WEAPON_SPECS, WORLD } from './config.js';
import { randomChoice, randomRange } from './random.js';

const CIVILIAN_OUTFITS = [
  { shirt: '#ff70a6', pants: '#1e293b', hair: '#2b1d0e', skin: '#f1c27d' },
  { shirt: '#00f5d4', pants: '#f8fafc', hair: '#111827', skin: '#e0ac69' },
  { shirt: '#ffd166', pants: '#1d4ed8', hair: '#7c2d12', skin: '#ffdbac' },
  { shirt: '#c084fc', pants: '#0f172a', hair: '#facc15', skin: '#c68642' },
  { shirt: '#38bdf8', pants: '#334155', hair: '#1f2937', skin: '#8d5524' },
  { shirt: '#fb7185', pants: '#fef3c7', hair: '#451a03', skin: '#f1c27d' },
];

export function createPedestrian(id, x, y, role = 'civilian', outfit = null) {
  const isPolice = role === 'police';
  const isSyndicate = role === 'syndicate';
  const style = outfit || (isPolice
    ? { shirt: '#1e3a8a', pants: '#0f172a', hair: '#111827', skin: '#e0ac69' }
    : isSyndicate
      ? { shirt: '#be123c', pants: '#18181b', hair: '#09090b', skin: '#d2996c' }
      : CIVILIAN_OUTFITS[id % CIVILIAN_OUTFITS.length]);

  return {
    id,
    role,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: (id * 1.57) % (Math.PI * 2),
    speed: isSyndicate || isPolice ? 68 : 44,
    health: isSyndicate || isPolice ? 85 : 45,
    maxHealth: isSyndicate || isPolice ? 85 : 45,
    alive: true,
    respawnTimer: 0,
    state: 'walk',
    alertTimer: 0,
    fireCooldown: 0.4 + (id % 5) * 0.2,
    walkPhase: id * 0.8,
    shirtColor: style.shirt,
    pantsColor: style.pants,
    hairColor: style.hair,
    skinColor: style.skin,
    armed: isPolice || isSyndicate,
    missionTarget: false,
  };
}

export function createPedestrianPool(random, city) {
  const peds = [];
  let nextId = 1;

  for (let i = 0; i < 52; i += 1) {
    const rx = randomChoice(random, city.roadsX);
    const side = random() < 0.5 ? -54 : 54;
    const x = Math.min(WORLD.coastX + 60, Math.max(120, rx + side));
    const y = randomRange(random, 240, WORLD.height - 240);
    const outfit = randomChoice(random, CIVILIAN_OUTFITS);
    peds.push(createPedestrian(nextId++, x, y, 'civilian', outfit));
  }

  // Beach promenade pedestrians along Palms Beach & Ocean Drive
  for (let y = 300; y <= 1560; y += 140) {
    const outfit = randomChoice(random, CIVILIAN_OUTFITS);
    peds.push(createPedestrian(nextId++, WORLD.coastX + 56, y, 'civilian', outfit));
  }

  return peds;
}

export function alertNearbyPedestrians(pedestrians, x, y, radius = 260) {
  for (let i = 0; i < pedestrians.length; i += 1) {
    const p = pedestrians[i];
    if (!p.alive) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= radius) {
      if (p.role === 'civilian') {
        p.state = 'flee';
        p.alertTimer = 5.5;
        p.angle = Math.atan2(p.y - y, p.x - x);
      } else {
        p.state = 'attack';
        p.alertTimer = 8;
      }
    }
  }
}

export function updatePedestrians(pedestrians, player, vehicles, police, combat, city, audio, random, dt) {
  const pistolSpec = WEAPON_SPECS[1];

  for (let i = 0; i < pedestrians.length; i += 1) {
    const p = pedestrians[i];

    if (!p.alive) {
      if (p.missionTarget) continue;
      p.respawnTimer -= dt;
      if (p.respawnTimer <= 0) {
        const rx = findNearestRoadCoord(city.roadsX, player.x + randomRange(random, -520, 520));
        p.x = rx + (random() < 0.5 ? -54 : 54);
        p.y = Math.max(180, Math.min(WORLD.height - 180, player.y + randomRange(random, -480, 480)));
        p.alive = true;
        p.health = p.maxHealth;
        p.role = 'civilian';
        p.armed = false;
        p.state = 'walk';
      }
      continue;
    }

    const dxPlayer = player.x - p.x;
    const dyPlayer = player.y - p.y;
    const distPlayer = Math.hypot(dxPlayer, dyPlayer);

    if (p.alertTimer > 0) {
      p.alertTimer = Math.max(0, p.alertTimer - dt);
      if (p.alertTimer === 0 && !p.missionTarget) p.state = 'walk';
    }

    if (p.role === 'syndicate' || (p.role === 'police' && police.stars > 0)) {
      if (distPlayer < 310) {
        p.state = 'attack';
        p.angle = Math.atan2(dyPlayer, dxPlayer);
        p.fireCooldown -= dt;
        if (p.fireCooldown <= 0 && distPlayer < 265) {
          p.fireCooldown = p.role === 'syndicate' ? 0.72 : 0.85;
          combat.fireProjectile(p.x, p.y, player.x, player.y, pistolSpec, false, p.role);
          if (audio && distPlayer < 220) audio.playSfx('gunshot');
        }
      }
    }

    let moveSpeed = p.speed;
    if (p.state === 'flee') {
      moveSpeed = p.speed * 1.85;
    } else if (p.state === 'attack') {
      moveSpeed = distPlayer > 115 ? p.speed * 1.15 : 0;
    } else if (random() < 0.012) {
      p.angle += (random() < 0.5 ? 1 : -1) * Math.PI * 0.5;
    }

    p.vx = Math.cos(p.angle) * moveSpeed;
    p.vy = Math.sin(p.angle) * moveSpeed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (moveSpeed > 5) p.walkPhase += dt * (moveSpeed * 0.16);

    const col = collideWorldBuildings(city, p.x, p.y, 7);
    if (col.hitBuilding) {
      p.x = col.x;
      p.y = col.y;
      p.angle += Math.PI * 0.5;
    }

    // Check collisions with moving vehicles
    for (let j = 0; j < vehicles.length; j += 1) {
      const v = vehicles[j];
      if (v.speed < 48) continue;
      const distV = Math.hypot(v.x - p.x, v.y - p.y);
      if (distV < v.spec.width * 0.72) {
        p.health = 0;
        p.alive = false;
        p.respawnTimer = 8;
        combat.spawnCashPickup(p.x, p.y, p.role === 'syndicate' ? 450 : 120);
        combat.spawnBurstParticles(p.x, p.y, 10, '#f43f5e', 8);
        if (v === player.vehicle) {
          police.reportCrime(p.role === 'police' ? 'police_assault' : 'hit_and_run', p.x, p.y);
          combat.spawnFloatingText(p.x, p.y, 20, p.role === 'syndicate' ? '+$450 ENFORCER DOWN' : 'HIT & RUN ★', '#f43f5e');
        }
        break;
      }
    }
  }
}
