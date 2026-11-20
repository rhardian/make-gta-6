// Top-level open-world simulation state and fixed-step update loop for Solaris Bay: Heatwave.
// Coordinates city collision, Elena Vega on-foot & driving controls, traffic AI, pedestrians,
// 5-star police pursuit, ballistic combat, multi-stage story missions, and 3D chase camera.

import { createAudioEngine } from './audio.js';
import { createCamera3D, screenToWorldGround, updateCameraFollow } from './camera.js';
import { collideWorldBuildings, createCityMap, findLandmarkByKind } from './city.js';
import { createCombatSystem, fireEquippedWeapon, updateCombatSystem } from './combat.js';
import { PLAYER_CONFIG, WEAPON_SPECS } from './config.js';
import { createMissionSystem } from './missions.js';
import { createPedestrianPool, updatePedestrians } from './pedestrians.js';
import { createWantedSystem, updatePolicePursuit } from './police.js';
import { loadGameProgress, saveGameProgress } from './save.js';
import { updateTrafficAi } from './traffic.js';
import {
  createVehiclePool,
  exitCurrentVehicle,
  resprayAndRepairVehicle,
  tryEnterOrStealVehicle,
  updateVehiclePhysics,
} from './vehicles.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 4;

export function createWorld(random) {
  const city = createCityMap(random);
  const camera = createCamera3D();
  const audio = createAudioEngine();
  const police = createWantedSystem();
  const combat = createCombatSystem();
  const missions = createMissionSystem(city);

  const player = {
    x: 1865,
    y: 935,
    vx: 0,
    vy: 0,
    angle: 0,
    health: PLAYER_CONFIG.maxHealth,
    armor: 80,
    cash: PLAYER_CONFIG.startingCash,
    respect: 250,
    invulnerable: 0,
    weaponIndex: 2, // Solana Micro-SMG equipped by default
    ammo: {
      fists: 0,
      vega_pistol: 120,
      solana_smg: 240,
      cayo_shotgun: 64,
      solaris_rifle: 180,
    },
    fireTimer: 0,
    muzzleFlash: 0,
    walkPhase: 0,
    vehicle: null,
  };

  let vehicles = createVehiclePool(random, city);
  let pedestrians = createPedestrianPool(random, city);

  const state = {
    city,
    camera,
    audio,
    police,
    combat,
    missions,
    player,
    vehicles,
    pedestrians,
    elapsed: 0,
    score: PLAYER_CONFIG.startingCash,
    lives: 3,
  };

  function reset(useSavedProgress = true) {
    vehicles = createVehiclePool(random, city);
    pedestrians = createPedestrianPool(random, city);
    state.vehicles = vehicles;
    state.pedestrians = pedestrians;
    combat.projectiles.length = 0;
    combat.particles.length = 0;
    combat.skids.length = 0;
    combat.popups.length = 0;

    const saved = useSavedProgress ? loadGameProgress() : null;
    player.x = saved ? saved.x : 1865;
    player.y = saved ? saved.y : 935;
    player.angle = 0;
    player.health = PLAYER_CONFIG.maxHealth;
    player.armor = saved ? saved.armor : 80;
    player.cash = saved ? saved.cash : PLAYER_CONFIG.startingCash;
    player.respect = saved ? saved.respect : 250;
    player.invulnerable = 0;
    player.weaponIndex = 2;
    player.ammo.vega_pistol = 120;
    player.ammo.solana_smg = 240;
    player.ammo.cayo_shotgun = 64;
    player.ammo.solaris_rifle = 180;
    player.vehicle = null;

    police.clearWanted();
    if (saved) missions.state.currentIndex = saved.missionIndex % 5;
    missions.setupMissionIntro(player);
    updateCameraFollow(camera, player, null, 0.016, true);
  }

  function handleInteract() {
    audio.ensureContext();
    // Check if inside Chrome Customs Garage zone while driving
    const garage = findLandmarkByKind(city, 'garage');
    if (player.vehicle && garage && Math.hypot(player.x - garage.x, player.y - garage.y) < 110) {
      if (resprayAndRepairVehicle(player.vehicle, player, police, combat, audio)) return;
    }

    // Check if near Miramar Safehouse to save & heal
    const safehouse = findLandmarkByKind(city, 'safehouse');
    if (safehouse && Math.hypot(player.x - safehouse.x, player.y - safehouse.y) < 95) {
      player.health = PLAYER_CONFIG.maxHealth;
      player.armor = PLAYER_CONFIG.maxArmor;
      saveGameProgress(state);
      combat.spawnFloatingText(player.x, player.y, 26, 'MIRAMAR SAFEHOUSE // SAVED & RESTORED!', '#22c55e');
      audio.playSfx('mission');
      return;
    }

    if (player.vehicle) {
      exitCurrentVehicle(player, audio);
    } else {
      tryEnterOrStealVehicle(player, vehicles, police, combat, audio);
    }
  }

  function cycleWeapon(slot = 0) {
    if (slot >= 1 && slot <= WEAPON_SPECS.length) {
      player.weaponIndex = slot - 1;
    } else {
      player.weaponIndex = (player.weaponIndex + 1) % WEAPON_SPECS.length;
    }
  }

  function quickSave() {
    saveGameProgress(state);
    combat.spawnFloatingText(player.x, player.y, 26, 'SAFEHOUSE PROGRESS SAVED!', '#22c55e');
    audio.playSfx('pickup');
  }

  function step(dt, controls = null, harmless = false) {
    let events = 0;
    state.elapsed += dt;

    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (player.fireTimer > 0) player.fireTimer = Math.max(0, player.fireTimer - dt);
    if (player.muzzleFlash > 0) player.muzzleFlash = Math.max(0, player.muzzleFlash - dt);

    if (controls && controls.weaponSlot) {
      cycleWeapon(controls.weaponSlot);
    }

    if (player.vehicle) {
      if (player.vehicle.destroyed) {
        exitCurrentVehicle(player, audio);
        player.health = Math.max(15, player.health - 35);
      } else {
        updateVehiclePhysics(player.vehicle, controls, city, combat, dt);
        player.x = player.vehicle.x;
        player.y = player.vehicle.y;
        player.angle = player.vehicle.angle;
      }
    } else if (controls && !harmless) {
      // On-foot movement in camera-relative or world axes
      const moveX = controls.moveX || 0;
      const moveY = controls.moveY || 0;
      const forwardX = Math.cos(camera.yaw);
      const forwardY = Math.sin(camera.yaw);
      const rightX = -forwardY;
      const rightY = forwardX;

      const dirX = forwardX * moveY + rightX * moveX;
      const dirY = forwardY * moveY + rightY * moveX;
      const len = Math.hypot(dirX, dirY);
      const spd = controls.sprint ? PLAYER_CONFIG.sprintSpeed : PLAYER_CONFIG.walkSpeed;

      if (len > 0.05) {
        player.vx = (dirX / len) * spd;
        player.vy = (dirY / len) * spd;
        player.x += player.vx * dt;
        player.y += player.vy * dt;
        player.angle = Math.atan2(player.vy, player.vx);
        player.walkPhase += dt * (spd * 0.14);
        const col = collideWorldBuildings(city, player.x, player.y, PLAYER_CONFIG.radius);
        player.x = col.x;
        player.y = col.y;
      } else {
        player.vx = 0;
        player.vy = 0;
      }

      if (controls.firing) {
        const aimWorld = screenToWorldGround(camera, controls.pointerX, controls.pointerY);
        fireEquippedWeapon(combat, player, aimWorld.x, aimWorld.y, pedestrians, police, audio);
      }
    }

    updateTrafficAi(vehicles, player, city, combat, random, dt);
    updatePedestrians(pedestrians, player, vehicles, police, combat, city, audio, random, dt);
    updatePolicePursuit(police, vehicles, pedestrians, player, combat, city, audio, dt);
    updateCombatSystem(combat, player, vehicles, pedestrians, police, city, camera, audio, dt);
    missions.update(state, dt);
    updateCameraFollow(camera, player, player.vehicle, dt, false);
    audio.update(player, police, dt);

    state.score = Math.floor(player.cash + player.respect * 25);

    if (!harmless && player.health <= 0) {
      events |= EVENT_OVER;
    }

    return events;
  }

  reset(false);
  return {
    state,
    reset,
    step,
    handleInteract,
    cycleWeapon,
    quickSave,
  };
}
