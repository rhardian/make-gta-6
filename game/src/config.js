// Solaris Bay: Heatwave configuration: logical display, city districts, vehicle specs,
// weapon arsenal, multi-stage story campaign missions, radio stations, and tropical sunset palette.

export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;

export const WORLD = {
  width: 2800,
  height: 2800,
  blockSize: 320,
  roadWidth: 88,
  sidewalkWidth: 20,
  coastX: 2240,
  beachWidth: 130,
};

export const PLAYER_CONFIG = {
  radius: 8,
  height: 19,
  walkSpeed: 88,
  sprintSpeed: 142,
  maxHealth: 100,
  maxArmor: 100,
  enterRange: 44,
  startingCash: 12500,
};

export const DISTRICTS = [
  { id: 'palms_beach', name: 'PALMS BEACH & OCEAN DRIVE', subtitle: 'Sun-Soaked Art Deco Promenade', minX: 1600, maxX: 2800, minY: 0, maxY: 1600, themeColor: '#ff7b54', neonColor: '#48f5e6' },
  { id: 'solana_core', name: 'SOLANA FINANCIAL CORE', subtitle: 'Downtown Skyscrapers & Vanguard Bank', minX: 800, maxX: 1600, minY: 640, maxY: 1760, themeColor: '#38bdf8', neonColor: '#f59e0b' },
  { id: 'cayo_harbor', name: 'CAYO HARBOR & MARINA', subtitle: 'Container Docks & Chrome Customs Pier', minX: 1280, maxX: 2800, minY: 1600, maxY: 2800, themeColor: '#2dd4bf', neonColor: '#fb7185' },
  { id: 'miramar_hills', name: 'MIRAMAR HILLS & VILLA', subtitle: 'Luxury Mansions & Elena Safehouse', minX: 640, maxX: 1600, minY: 0, maxY: 640, themeColor: '#a78bfa', neonColor: '#fde047' },
  { id: 'neon_quarter', name: 'NEON QUARTER & NIGHTMARKET', subtitle: 'Syndicate Club Strip & Street Circuit', minX: 0, maxX: 800, minY: 0, maxY: 1600, themeColor: '#f43f5e', neonColor: '#c084fc' },
  { id: 'metro_precinct', name: 'METRO INDUSTRIAL & PRECINCT', subtitle: 'SMPD Headquarters & Rail Yard', minX: 0, maxX: 1280, minY: 1600, maxY: 2800, themeColor: '#60a5fa', neonColor: '#38bdf8' },
];

export const VEHICLE_SPECS = {
  aurelia_gt: { id: 'aurelia_gt', name: 'Aurelia GT Supercar', category: 'Exotic Coupe', length: 44, width: 21, height: 14, topSpeed: 310, accel: 245, brake: 310, turnRate: 2.65, driftGrip: 0.91, maxHealth: 180, bodyColor: '#ff6224', accentColor: '#ffd166', cabinColor: '#1a2436', spoiler: true, value: 18000 },
  mako_roadster: { id: 'mako_roadster', name: 'Mako Coastal Roadster', category: 'Open-Top Convertible', length: 42, width: 20, height: 13, topSpeed: 285, accel: 225, brake: 290, turnRate: 2.75, driftGrip: 0.89, maxHealth: 160, bodyColor: '#00e5cf', accentColor: '#ffffff', cabinColor: '#281d33', convertible: true, value: 14500 },
  solstice_coupe: { id: 'solstice_coupe', name: 'Solstice Neon Tuner', category: 'Street Racer', length: 43, width: 20, height: 14, topSpeed: 295, accel: 235, brake: 300, turnRate: 2.8, driftGrip: 0.87, maxHealth: 165, bodyColor: '#ec4899', accentColor: '#38bdf8', cabinColor: '#141928', spoiler: true, value: 16000 },
  cabrillo_cruiser: { id: 'cabrillo_cruiser', name: 'Cabrillo Sun Cruiser', category: 'Classic Sedan', length: 45, width: 21, height: 15, topSpeed: 230, accel: 170, brake: 240, turnRate: 2.3, driftGrip: 0.93, maxHealth: 195, bodyColor: '#facc15', accentColor: '#fef08a', cabinColor: '#1e293b', value: 8500 },
  veloce_interceptor: { id: 'veloce_interceptor', name: 'Veloce V8 Muscle', category: 'Heavy Muscle', length: 45, width: 22, height: 15, topSpeed: 275, accel: 220, brake: 265, turnRate: 2.45, driftGrip: 0.86, maxHealth: 210, bodyColor: '#8b5cf6', accentColor: '#f43f5e', cabinColor: '#161b29', value: 12000 },
  titan_armored: { id: 'titan_armored', name: 'Titan Vault Transport', category: 'Armored Bank Truck', length: 54, width: 25, height: 23, topSpeed: 195, accel: 140, brake: 220, turnRate: 1.85, driftGrip: 0.96, maxHealth: 420, bodyColor: '#334155', accentColor: '#eab308', cabinColor: '#0f172a', heavy: true, value: 32000 },
  smpd_interceptor: { id: 'smpd_interceptor', name: 'SMPD Patrol Interceptor', category: 'Police Pursuit Cruiser', length: 44, width: 21, height: 15, topSpeed: 295, accel: 240, brake: 300, turnRate: 2.65, driftGrip: 0.92, maxHealth: 220, bodyColor: '#0f172a', accentColor: '#f8fafc', cabinColor: '#1e293b', police: true, value: 15000 },
  smpd_enforcer: { id: 'smpd_enforcer', name: 'SMPD Tactical SWAT Van', category: 'Tactical Response Unit', length: 52, width: 24, height: 22, topSpeed: 245, accel: 190, brake: 260, turnRate: 2.1, driftGrip: 0.95, maxHealth: 380, bodyColor: '#1e293b', accentColor: '#38bdf8', cabinColor: '#090d16', police: true, heavy: true, value: 25000 },
};

export const WEAPON_SPECS = [
  { id: 'fists', slot: 1, name: 'Street Brawl', shortName: 'BRAWL', damage: 28, cooldown: 0.35, range: 34, speed: 380, spread: 0.1, pellets: 1, ammoMax: 0, color: '#f8fafc' },
  { id: 'vega_pistol', slot: 2, name: 'Vega 9mm Tactical', shortName: 'VEGA 9MM', damage: 34, cooldown: 0.22, range: 420, speed: 680, spread: 0.03, pellets: 1, ammoMax: 120, color: '#fde047' },
  { id: 'solana_smg', slot: 3, name: 'Solana Micro-SMG', shortName: 'SOLANA SMG', damage: 24, cooldown: 0.085, range: 390, speed: 740, spread: 0.065, pellets: 1, ammoMax: 240, color: '#38bdf8' },
  { id: 'cayo_shotgun', slot: 4, name: 'Cayo Breacher Shotgun', shortName: 'BREACHER 12G', damage: 22, cooldown: 0.58, range: 270, speed: 640, spread: 0.16, pellets: 6, ammoMax: 64, color: '#fb7185' },
  { id: 'solaris_rifle', slot: 5, name: 'Solaris Heavy Carbine', shortName: 'SOLARIS AR', damage: 45, cooldown: 0.11, range: 520, speed: 860, spread: 0.025, pellets: 1, ammoMax: 180, color: '#ff7b54' },
];

export const STORY_MISSIONS = [
  { id: 'ocean_drive_boost', chapter: 1, title: 'CHAPTER 1: SUNSET BOOST ON OCEAN DRIVE', giver: 'MARCUS "DOC" VANCE', rewardCash: 8500, rewardRespect: 250, startX: 1920, startY: 960, targetX: 1600, targetY: 1920, escapeX: 960, escapeY: 320, briefing: 'Steal the Aurelia GT parked outside Solaris Palms Hotel, outrun SMPD patrol units, and reach Chrome Customs.', dialogueStart: 'Elena! Kestrel left his custom Aurelia GT on Ocean Drive. Grab it and punch the nitro!', dialogueMid: 'SMPD interceptors spotted the plate! Shake the pursuit or hit Chrome Customs Pier!', dialogueEnd: 'Clean driving, Vega. Solaris Bay knows you are back on the grid.' },
  { id: 'cayo_harbor_ambush', chapter: 2, title: 'CHAPTER 2: CAYO MARINA CONTRABAND RAID', giver: 'ROSA CASTELLANO', rewardCash: 14000, rewardRespect: 450, startX: 1600, startY: 1920, targetX: 1920, targetY: 2240, escapeX: 1600, escapeY: 1600, briefing: 'Head to Cayo Harbor Marina, eliminate Kestrel Syndicate dock guards on foot, and seize the Mako Roadster.', dialogueStart: 'Rosa here. Kestrel Syndicate locked down Pier 7 at Cayo Marina. Clear the guards and take the ledger!', dialogueMid: 'Guards down! Grab the cyan Mako Roadster and clear the harbor perimeter!', dialogueEnd: 'That dock ledger opens the door to Vanguard Central Bank. Here is your cut!' },
  { id: 'vanguard_vault_heist', chapter: 3, title: 'CHAPTER 3: VANGUARD CENTRAL BANK HEIST', giver: 'MARCUS "DOC" VANCE', rewardCash: 35000, rewardRespect: 900, startX: 1280, startY: 1280, targetX: 1280, targetY: 960, escapeX: 960, escapeY: 320, briefing: 'Breach Vanguard Central Bank in Solana Core, defeat tactical guards, crack the armored vault transport, and evade 4-star police!', dialogueStart: 'This is the big score: Vanguard Central Bank! Neutralize the convoy guards and secure the gold bullion!', dialogueMid: '4-STAR SMPD TACTICAL ALERT! Get in a fast car, hit Ocean Drive, and lose the choppers to Miramar Safehouse!', dialogueEnd: 'Thirty-five grand in clean bearer bonds! Vanguard Vault is ours, Elena!' },
  { id: 'neon_quarter_circuit', chapter: 4, title: 'CHAPTER 4: NEON QUARTER HIGH-STAKES SPRINT', giver: 'ROSA CASTELLANO', rewardCash: 22000, rewardRespect: 650, startX: 640, startY: 960, targetX: 320, targetY: 640, escapeX: 1920, escapeY: 640, briefing: 'Race the Solstice Neon Tuner across the Neon Quarter checkpoints to Ocean Drive before the syndicate timer expires.', dialogueStart: 'Syndicate street kings bet 22K nobody can run the Neon Quarter to Ocean Drive under the gun. Prove them wrong!', dialogueMid: 'Checkpoint cleared! Keep drifting the corners and watch for cross-traffic!', dialogueEnd: 'New Solaris Bay street record! The Neon Quarter crews answer to us now.' },
  { id: 'kestrel_tower_showdown', chapter: 5, title: 'CHAPTER 5: CROWN OF SOLARIS BAY', giver: 'ELENA VEGA & DOC VANCE', rewardCash: 60000, rewardRespect: 1500, startX: 960, startY: 960, targetX: 1600, targetY: 640, escapeX: 960, escapeY: 320, briefing: 'Storm Kestrel Tower Plaza, destroy Viktor Kestrel’s armored escort convoy, survive the 5-star lockdown, and claim Solaris Bay.', dialogueStart: 'Viktor Kestrel’s armored convoy is staging at Kestrel Tower. Take out his guards and end his syndicate!', dialogueMid: 'Kestrel convoy neutralized! Survive the 5-star SMPD citywide lockdown and return to Miramar Villa!', dialogueEnd: 'Solaris Bay belongs to Elena Vega! Campaign complete — free-roam empire unlocked!' },
];

export const RADIO_STATIONS = [
  { id: 'solaris_fm', name: 'SOLARIS FM 88.5', genre: 'Tropical Sunset Synthwave', track: 'Neon Palms Over Ocean Drive', bpm: 118, notes: [220, 277.18, 329.63, 440, 329.63, 277.18, 246.94, 329.63] },
  { id: 'cayo_bass', name: 'CAYO BASS 104.2', genre: 'Harbor Electro & Miami Bass', track: 'Turbo Boost at Pier 7', bpm: 128, notes: [146.83, 146.83, 220, 293.66, 261.63, 220, 196, 220] },
  { id: 'nightmarket_96', name: 'NIGHTMARKET 96.9', genre: 'Cyber Outrun & Darkwave', track: 'Four Stars on the Causeway', bpm: 134, notes: [164.81, 196, 246.94, 329.63, 293.66, 246.94, 196, 185] },
];

export const PALETTE = {
  skyZenith: '#160d2e', skyUpper: '#3c1654', skyMid: '#9a2b63', skyHorizon: '#ff7a45', skyGlow: '#ffd166',
  oceanDeep: '#093854', oceanMid: '#0e6b8a', oceanShallow: '#22c1c3', beachSand: '#f3d098',
  asphalt: '#1e222d', asphaltLight: '#282d3b', sidewalk: '#474f63', curb: '#64708a',
  laneYellow: '#f59e0b', laneWhite: '#e2e8f0', grass: '#1e4d3b',
  hudBg: 'rgba(11, 14, 24, 0.86)', hudBorder: 'rgba(56, 189, 248, 0.45)',
  hudGold: '#fbbf24', hudGreen: '#22c55e', hudCyan: '#38bdf8', hudPink: '#f43f5e', hudText: '#f8fafc', hudMuted: '#94a3b8',
};

export const SAVE_KEY = 'solaris-bay.save.v1';
export const BEST_KEY = 'solaris-bay.best';
