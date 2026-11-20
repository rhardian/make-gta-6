// Deterministic screenshot scene staging for Solaris Bay: Heatwave.
// Supports ?shot=chase|heist|harbor|overview (plus start|play|end aliases) to stage rich,
// multi-system open-world gameplay moments and step the real simulation forward.

import { updateCameraFollow } from './camera.js';
import { STEP } from './config.js';
import { createPedestrian } from './pedestrians.js';
import { SCREEN_MAP, SCREEN_PLAY } from './render.js';
import { createVehicleInstance } from './vehicles.js';

export function stageShot(name, world) {
  world.reset(false);
  const { state } = world;
  const { player, vehicles, pedestrians, police, combat, missions, camera } = state;

  if (name === 'chase' || name === 'start') {
    // SHOT 1 (COVER): High-speed 4-Star Police Pursuit on coastal Ocean Drive at Golden Hour Sunset!
    // Driving the sunburst-orange Aurelia GT Supercar past Solaris Palms Hotel & Palms Beach
    // with ocean waves & yachts on the East, neon Art Deco hotels on the West, nitro flames,
    // 2 pursuing SMPD Interceptors, helicopter searchlight, traffic, and pedestrians.
    const heroCar = vehicles[0];
    heroCar.x = 2226;
    heroCar.y = 755;
    heroCar.angle = Math.PI * 0.5 - 0.14;
    heroCar.speed = 268;
    heroCar.vx = Math.cos(heroCar.angle) * heroCar.speed;
    heroCar.vy = Math.sin(heroCar.angle) * heroCar.speed;
    heroCar.boosting = true;
    heroCar.drifting = true;
    heroCar.nitro = 86;
    heroCar.driverType = 'player';

    player.vehicle = heroCar;
    player.x = heroCar.x;
    player.y = heroCar.y;
    player.angle = heroCar.angle;
    player.cash = 68450;
    player.respect = 1420;
    player.health = 92;
    player.armor = 85;
    player.weaponIndex = 2;

    // Two pursuing SMPD Interceptors in view ahead/flanking with red/blue strobes
    const cop1 = createVehicleInstance(910, 'smpd_interceptor', 2252, 845, Math.PI * 0.5 + 0.35, 'police');
    cop1.sirenOn = true;
    const cop2 = createVehicleInstance(911, 'smpd_interceptor', 2202, 875, -Math.PI * 0.5 + 0.25, 'police');
    cop2.sirenOn = true;
    const trafficCar = createVehicleInstance(912, 'mako_roadster', 2244, 928, -Math.PI * 0.5, 'traffic');
    vehicles.push(cop1, cop2, trafficCar);

    police.setWantedStars(4);
    police.state.heliX = 2232;
    police.state.heliY = 855;

    missions.state.currentIndex = 2;
    missions.state.stage = 'escape';
    missions.state.progress = 0.84;
    missions.refreshWaypoint(
      player,
      2236,
      985,
      'CHAPTER 3: VANGUARD VAULT GETAWAY',
      'Outrun 4-Star SMPD Tactical Interceptors along Ocean Drive and deliver the vault gold!',
    );
    missions.setComms(
      'MARCUS "DOC" VANCE',
      'ENCRYPTED HEIST COMMS',
      'Four-star SMPD blockade on Ocean Drive! Punch the nitro past Solaris Palms Hotel!',
      '#fbbf24',
      12,
    );

    for (let i = 0; i < 14; i += 1) {
      world.step(STEP, { throttle: 1, steer: -0.18, handbrake: true, boost: true }, false);
    }
    combat.spawnFloatingText(2224, 825, 22, 'DRIFT + NITRO BOOST // 154 MPH', '#38bdf8');
    combat.spawnFloatingText(2252, 845, 28, 'SMPD INTERCEPTOR PURSUIT ★★★★', '#ef4444');
    updateCameraFollow(camera, player, player.vehicle, 0.016, true);
    return { screen: SCREEN_PLAY, best: 103950 };
  }

  if (name === 'heist' || name === 'play') {
    // SHOT 2: On-Foot Bank Heist Shootout outside Vanguard Central Bank in Solana Financial Core!
    // Elena Vega on foot firing the Solana Micro-SMG at Kestrel Syndicate guards & SMPD tactical units,
    // armored Titan Vault Transport truck, fiery barricade explosion, bullet tracers, and loot popups.
    player.vehicle = null;
    player.x = 1264;
    player.y = 850;
    player.angle = Math.PI * 0.5 - 0.08;
    player.cash = 54200;
    player.respect = 1180;
    player.health = 88;
    player.armor = 74;
    player.weaponIndex = 2; // Solana Micro-SMG

    const armoredTruck = vehicles[3];
    armoredTruck.x = 1288;
    armoredTruck.y = 948;
    armoredTruck.angle = 0.35;

    const syndicateCar = createVehicleInstance(920, 'veloce_interceptor', 1248, 932, -0.4, 'traffic');
    vehicles.push(syndicateCar);

    // Armed syndicate guards and tactical police exchanging fire in the plaza ahead
    const g1 = createPedestrian(601, 1265, 912, 'syndicate');
    const g2 = createPedestrian(602, 1292, 922, 'syndicate');
    const g3 = createPedestrian(603, 1244, 905, 'police');
    g1.state = 'attack';
    g2.state = 'attack';
    g3.state = 'attack';
    pedestrians.push(g1, g2, g3);

    police.setWantedStars(3);
    police.state.heliX = 1270;
    police.state.heliY = 930;

    missions.state.currentIndex = 2;
    missions.state.stage = 'action';
    missions.state.progress = 0.76;
    missions.refreshWaypoint(
      player,
      1282,
      960,
      'CHAPTER 3: VANGUARD CENTRAL BANK HEIST',
      'Eliminate syndicate vault defenders, breach the Titan Armored Transport, and seize the bullion!',
    );
    missions.setComms(
      'ELENA VEGA',
      'HEIST SQUAD LEADER',
      'Vault transport is cracked! Cover the plaza while I load the bearer bonds!',
      '#f43f5e',
      12,
    );

    updateCameraFollow(camera, player, null, 0.016, true);
    for (let i = 0; i < 6; i += 1) {
      world.step(
        STEP,
        {
          moveX: 0,
          moveY: 0,
          firing: true,
          pointerX: 650,
          pointerY: 360,
        },
        false,
      );
    }

    combat.spawnBurstParticles(1248, 932, 12, '#ff5400', 22, 1.6);
    combat.spawnBurstParticles(1248, 932, 18, '#fde047', 14, 1.2);
    combat.spawnFloatingText(1288, 948, 29, '+$15,000 VANGUARD VAULT LOOT', '#22c55e');
    combat.spawnFloatingText(1265, 912, 24, '+$650 SYNDICATE ENFORCER DOWN', '#fbbf24');
    return { screen: SCREEN_PLAY, best: 83700 };
  }

  if (name === 'harbor') {
    // SHOT 3: On-Foot Carjacking, Chrome Customs Garage & Mission Beacon at Cayo Harbor Marina!
    // Elena Vega on foot beside an open-top cyan Mako Roadster ([PRESS E] STEAL MAKO ROADSTER)
    // and glowing cyan Mission Beacon overlooking the ocean coastline, yachts, palm trees, and pedestrians.
    player.vehicle = null;
    player.x = 1888;
    player.y = 2168;
    player.angle = Math.PI * 0.5 - 0.18;
    player.cash = 41800;
    player.respect = 920;
    player.health = 100;
    player.armor = 100;
    player.weaponIndex = 4; // Solaris Heavy Carbine

    const roadster = vehicles[1];
    roadster.x = 1902;
    roadster.y = 2212;
    roadster.angle = -0.35;

    const customCoupe = createVehicleInstance(930, 'solstice_coupe', 1932, 2248, Math.PI * 0.65, 'parked');
    vehicles.push(customCoupe);

    police.setWantedStars(1);

    missions.state.currentIndex = 1;
    missions.state.stage = 'to_start';
    missions.state.progress = 0.45;
    missions.refreshWaypoint(
      player,
      1916,
      2238,
      'CHAPTER 2: CAYO MARINA CONTRABAND RAID',
      'Hijack the Mako Roadster at Pier 7, raid Kestrel Syndicate dock crates, and visit Chrome Customs.',
    );
    missions.setComms(
      'ROSA CASTELLANO',
      'CHROME CUSTOMS & HARBOR FIXER',
      'That cyan Mako Roadster is unlocked at Pier 7, Elena. Steal it or bring any ride to Chrome Customs!',
      '#00f5d4',
      12,
    );

    updateCameraFollow(camera, player, null, 0.016, true);
    world.step(STEP, null, true);
    combat.spawnFloatingText(1925, 2210, 18, '+$2,500 HARBOR CONTRABAND CACHE', '#22c55e');
    return { screen: SCREEN_PLAY, best: 64800 };
  }

  // SHOT 4 ('overview' or 'end'): Neon Quarter Street Circuit + Solaris Bay Tactical GPS & Safehouse Save Map!
  const tuner = vehicles[2];
  tuner.x = 626;
  tuner.y = 770;
  tuner.angle = Math.PI * 0.5 + 0.08;
  tuner.speed = 238;
  tuner.vx = Math.cos(tuner.angle) * tuner.speed;
  tuner.vy = Math.sin(tuner.angle) * tuner.speed;
  tuner.boosting = true;
  tuner.driverType = 'player';

  player.vehicle = tuner;
  player.x = tuner.x;
  player.y = tuner.y;
  player.angle = tuner.angle;
  player.cash = 92400;
  player.respect = 2150;
  player.health = 100;
  player.armor = 100;

  const rival1 = createVehicleInstance(940, 'aurelia_gt', 614, 848, Math.PI * 0.5, 'traffic');
  const rival2 = createVehicleInstance(941, 'smpd_interceptor', 642, 875, Math.PI * 0.5 - 0.2, 'police');
  rival2.sirenOn = true;
  vehicles.push(rival1, rival2);

  police.setWantedStars(2);

  missions.state.currentIndex = 3;
  missions.state.completedCount = 3;
  missions.state.stage = 'action';
  missions.state.progress = 0.68;
  missions.refreshWaypoint(
    player,
    628,
    910,
    'CHAPTER 4: NEON QUARTER HIGH-STAKES SPRINT',
    'Blast through the Neon Quarter checkpoint in the Solstice Tuner and save at Miramar Villa!',
  );
  missions.setComms(
    'ROSA CASTELLANO',
    'STREET CIRCUIT RACE CONTROL',
    'Checkpoint 4 cleared! Ahead of Kestrel’s Aurelia GT — Safehouse uplink saved!',
    '#e879f9',
    12,
  );

  for (let i = 0; i < 8; i += 1) {
    world.step(STEP, { throttle: 1, steer: 0.05, handbrake: false, boost: true }, false);
  }
  combat.spawnFloatingText(618, 835, 25, 'CHECKPOINT 4/5 CLEARED! +$5,000', '#22c55e');
  updateCameraFollow(camera, player, player.vehicle, 0.016, true);
  return { screen: SCREEN_MAP, best: 146150 };
}
