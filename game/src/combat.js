// Combat, ballistics, explosions, particles, tire skid marks, floating 3D popups,
// and collectible world pickups (cash briefcases, armor vests, medkits).

import { collideWorldBuildings } from './city.js';
import { triggerCameraShake } from './camera.js';
import { WEAPON_SPECS } from './config.js';
import { alertNearbyPedestrians } from './pedestrians.js';

export function createCombatSystem() {
  const projectiles = [];
  const particles = [];
  const skids = [];
  const popups = [];
  const pickups = [
    { x: 1925, y: 2210, kind: 'cash', amount: 2500, active: true, timer: 0 },
    { x: 1255, y: 970, kind: 'cash', amount: 5000, active: true, timer: 0 },
    { x: 1890, y: 910, kind: 'armor', amount: 50, active: true, timer: 0 },
    { x: 660, y: 920, kind: 'cash', amount: 2000, active: true, timer: 0 },
    { x: 980, y: 310, kind: 'health', amount: 50, active: true, timer: 0 },
  ];

  function spawnBurstParticles(x, y, z, color, count = 10, speedScale = 1) {
    for (let i = 0; i < count; i += 1) {
      const ang = (i / count) * Math.PI * 2 + (i % 3) * 0.3;
      const spd = (28 + (i % 5) * 18) * speedScale;
      particles.push({
        x,
        y,
        z: z + (i % 3) * 2,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        vz: (18 + (i % 4) * 12) * speedScale,
        size: 3.5 + (i % 3) * 2.2,
        color,
        alpha: 1,
        ttl: 0.45 + (i % 4) * 0.14,
        maxTtl: 0.65,
      });
    }
    if (particles.length > 180) particles.splice(0, particles.length - 180);
  }

  function spawnFloatingText(x, y, z, label, color = '#fbbf24') {
    popups.push({
      x,
      y,
      z,
      label,
      color,
      ttl: 2.1,
      maxTtl: 2.1,
    });
    if (popups.length > 24) popups.shift();
  }

  function spawnCashPickup(x, y, amount = 250) {
    pickups.push({
      x,
      y,
      kind: 'cash',
      amount,
      active: true,
      timer: 0,
    });
    if (pickups.length > 32) pickups.shift();
  }

  function fireProjectile(fromX, fromY, targetX, targetY, weapon, isPlayer, ownerRole = 'player') {
    const baseAngle = Math.atan2(targetY - fromY, targetX - fromX);
    const pellets = weapon.pellets || 1;
    for (let p = 0; p < pellets; p += 1) {
      const spreadOffset = pellets > 1
        ? ((p / (pellets - 1)) - 0.5) * weapon.spread * 2
        : (Math.sin(projectiles.length * 1.7 + p) * 0.5) * weapon.spread;
      const angle = baseAngle + spreadOffset;
      projectiles.push({
        x: fromX + Math.cos(angle) * 12,
        y: fromY + Math.sin(angle) * 12,
        z: 12,
        vx: Math.cos(angle) * weapon.speed,
        vy: Math.sin(angle) * weapon.speed,
        damage: weapon.damage,
        color: weapon.color || '#fde047',
        ttl: weapon.range / weapon.speed,
        isPlayer,
        ownerRole,
      });
    }
    spawnBurstParticles(
      fromX + Math.cos(baseAngle) * 14,
      fromY + Math.sin(baseAngle) * 14,
      12,
      '#fde047',
      4,
      0.5,
    );
  }

  function triggerExplosion(x, y, camera, vehicles, pedestrians, player, police, audio) {
    spawnBurstParticles(x, y, 10, '#ff5400', 22, 1.9);
    spawnBurstParticles(x, y, 16, '#fde047', 14, 1.4);
    spawnBurstParticles(x, y, 22, '#475569', 12, 1.1);
    spawnFloatingText(x, y, 32, 'BOOM! VEHICLE DESTROYED', '#ff7b54');
    if (camera) triggerCameraShake(camera, 11, 0.45);
    if (audio) audio.playSfx('explosion');
    if (police) police.reportCrime('explosion', x, y);
    if (pedestrians) alertNearbyPedestrians(pedestrians, x, y, 340);

    for (let i = 0; i < pedestrians.length; i += 1) {
      const ped = pedestrians[i];
      if (!ped.alive) continue;
      const d = Math.hypot(ped.x - x, ped.y - y);
      if (d < 85) {
        ped.health = 0;
        ped.alive = false;
        ped.respawnTimer = 10;
        spawnCashPickup(ped.x, ped.y, ped.role === 'syndicate' ? 600 : 150);
      }
    }

    for (let i = 0; i < vehicles.length; i += 1) {
      const v = vehicles[i];
      const d = Math.hypot(v.x - x, v.y - y);
      if (d < 90 && d > 5) {
        v.health = Math.max(0, v.health - 95);
      }
    }

    const dPlayer = Math.hypot(player.x - x, player.y - y);
    if (dPlayer < 75 && !player.vehicle) {
      const dmg = Math.round((1 - dPlayer / 75) * 35);
      applyPlayerDamage(player, dmg);
    }
  }

  return {
    projectiles,
    particles,
    skids,
    popups,
    pickups,
    spawnBurstParticles,
    spawnFloatingText,
    spawnCashPickup,
    fireProjectile,
    triggerExplosion,
  };
}

export function applyPlayerDamage(player, amount) {
  if (player.invulnerable > 0) return;
  let remaining = amount;
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, remaining * 0.7);
    player.armor = Math.max(0, player.armor - absorbed);
    remaining -= absorbed;
  }
  player.health = Math.max(0, player.health - remaining);
}

export function fireEquippedWeapon(combat, player, targetX, targetY, pedestrians, police, audio) {
  const weapon = WEAPON_SPECS[player.weaponIndex] || WEAPON_SPECS[1];
  if (player.fireTimer > 0) return false;
  if (weapon.ammoMax > 0 && player.ammo[weapon.id] <= 0) {
    player.weaponIndex = 1;
    return false;
  }

  player.fireTimer = weapon.cooldown;
  player.muzzleFlash = 0.09;
  player.angle = Math.atan2(targetY - player.y, targetX - player.x);
  if (weapon.ammoMax > 0) {
    player.ammo[weapon.id] = Math.max(0, player.ammo[weapon.id] - 1);
  }

  combat.fireProjectile(player.x, player.y, targetX, targetY, weapon, true, 'player');
  if (weapon.id !== 'fists') {
    police.reportCrime('gunfire', player.x, player.y);
    alertNearbyPedestrians(pedestrians, player.x, player.y, 280);
  }
  if (audio) audio.playSfx(weapon.id === 'cayo_shotgun' ? 'shotgun' : 'gunshot');
  return true;
}

export function updateCombatSystem(combat, player, vehicles, pedestrians, police, city, camera, audio, dt) {
  // Update projectiles
  for (let i = combat.projectiles.length - 1; i >= 0; i -= 1) {
    const b = combat.projectiles[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.ttl -= dt;

    if (b.ttl <= 0) {
      combat.projectiles.splice(i, 1);
      continue;
    }

    const col = collideWorldBuildings(city, b.x, b.y, 2);
    if (col.hitBuilding) {
      combat.spawnBurstParticles(b.x, b.y, b.z, '#fde047', 4, 0.45);
      combat.projectiles.splice(i, 1);
      continue;
    }

    let hit = false;
    if (b.isPlayer) {
      // Check hit against pedestrians / enemies
      for (let j = 0; j < pedestrians.length; j += 1) {
        const p = pedestrians[j];
        if (!p.alive) continue;
        if (Math.hypot(p.x - b.x, p.y - b.y) < 13) {
          p.health -= b.damage;
          combat.spawnBurstParticles(p.x, p.y, 12, '#f43f5e', 6, 0.7);
          hit = true;
          if (p.health <= 0) {
            p.alive = false;
            p.respawnTimer = 10;
            const bounty = p.role === 'syndicate' ? 650 : p.role === 'police' ? 350 : 120;
            player.cash += bounty;
            player.respect += p.role === 'syndicate' ? 35 : 10;
            combat.spawnCashPickup(p.x, p.y, bounty);
            combat.spawnFloatingText(
              p.x,
              p.y,
              22,
              p.role === 'syndicate' ? `+$${bounty} SYNDICATE ELIMINATED` : `+$${bounty}`,
              p.role === 'syndicate' ? '#22c55e' : '#fbbf24',
            );
            if (p.role === 'police') police.reportCrime('police_assault', p.x, p.y);
          }
          break;
        }
      }

      // Check hit against vehicles
      if (!hit) {
        for (let j = 0; j < vehicles.length; j += 1) {
          const v = vehicles[j];
          if (v === player.vehicle || v.destroyed) continue;
          if (Math.hypot(v.x - b.x, v.y - b.y) < v.spec.width * 0.75) {
            v.health -= b.damage;
            combat.spawnBurstParticles(b.x, b.y, 12, '#fbbf24', 5, 0.6);
            hit = true;
            if (v.health <= 0 && !v.destroyed) {
              v.destroyed = true;
              v.bodyColor = '#1e293b';
              player.cash += 1200;
              combat.triggerExplosion(v.x, v.y, camera, vehicles, pedestrians, player, police, audio);
            }
            break;
          }
        }
      }
    } else {
      // Enemy projectile checking against player
      if (Math.hypot(player.x - b.x, player.y - b.y) < 14) {
        hit = true;
        if (player.vehicle) {
          player.vehicle.health = Math.max(15, player.vehicle.health - b.damage * 0.4);
          combat.spawnBurstParticles(b.x, b.y, 12, '#fbbf24', 4, 0.5);
        } else {
          applyPlayerDamage(player, b.damage * 0.35);
          combat.spawnBurstParticles(player.x, player.y, 12, '#f43f5e', 4, 0.5);
        }
      }
    }

    if (hit) {
      combat.projectiles.splice(i, 1);
    }
  }

  // Update particles
  for (let i = combat.particles.length - 1; i >= 0; i -= 1) {
    const pt = combat.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.z = Math.max(0, pt.z + pt.vz * dt);
    pt.vz -= 42 * dt;
    pt.ttl -= dt;
    pt.alpha = Math.max(0, pt.ttl / pt.maxTtl);
    if (pt.ttl <= 0) combat.particles.splice(i, 1);
  }

  // Update skids
  for (let i = combat.skids.length - 1; i >= 0; i -= 1) {
    const sk = combat.skids[i];
    sk.ttl -= dt;
    sk.alpha = Math.min(0.55, sk.ttl * 0.2);
    if (sk.ttl <= 0) combat.skids.splice(i, 1);
  }

  // Update 3D floating popups
  for (let i = combat.popups.length - 1; i >= 0; i -= 1) {
    const pop = combat.popups[i];
    pop.z += 12 * dt;
    pop.ttl -= dt;
    if (pop.ttl <= 0) combat.popups.splice(i, 1);
  }

  // Check world pickups
  for (let i = 0; i < combat.pickups.length; i += 1) {
    const pk = combat.pickups[i];
    if (!pk.active) {
      pk.timer -= dt;
      if (pk.timer <= 0) pk.active = true;
      continue;
    }
    if (Math.hypot(pk.x - player.x, pk.y - player.y) < 28) {
      pk.active = false;
      pk.timer = 18;
      if (pk.kind === 'cash') {
        player.cash += pk.amount;
        combat.spawnFloatingText(pk.x, pk.y, 20, `+$${pk.amount.toLocaleString()} CASH`, '#22c55e');
      } else if (pk.kind === 'armor') {
        player.armor = Math.min(100, player.armor + pk.amount);
        combat.spawnFloatingText(pk.x, pk.y, 20, '+50 TACTICAL ARMOR', '#38bdf8');
      } else {
        player.health = Math.min(100, player.health + pk.amount);
        combat.spawnFloatingText(pk.x, pk.y, 20, '+50 MEDKIT RESTORED', '#22c55e');
      }
      if (audio) audio.playSfx('pickup');
    }
  }
}
