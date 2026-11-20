// Solaris Bay open-world city generator: districts, road grid, intersections, landmark buildings
// with custom 3D architecture and neon signage, palm trees, harbor yachts, collision & GPS routing.

import { DISTRICTS, WORLD } from './config.js';
import { randomChoice, randomRange } from './random.js';

const LANDMARK_BUILDINGS = [
  { key: '18_2', name: 'SOLARIS PALMS HOTEL', style: 'art_deco_hotel', height: 118, baseColor: '#f8d8c8', sideColor: '#d9ad9c', roofColor: '#2d3748', neonColor: '#00f5d4', accentColor: '#ff5d8f', landmarkKind: 'hotel' },
  { key: '18_3', name: 'OCEAN DRIVE GRAND', style: 'art_deco_hotel', height: 108, baseColor: '#d8f3dc', sideColor: '#95d5b2', roofColor: '#1e293b', neonColor: '#ff70a6', accentColor: '#ffd166', landmarkKind: 'hotel' },
  { key: '18_4', name: 'CLUB FLAMINGO NEON', style: 'art_deco_hotel', height: 98, baseColor: '#fde2e4', sideColor: '#f9bec7', roofColor: '#1e1b4b', neonColor: '#fbbf24', accentColor: '#38bdf8', landmarkKind: 'club' },
  { key: '12_2', name: 'VANGUARD CENTRAL BANK', style: 'glass_tower', height: 175, baseColor: '#38bdf8', sideColor: '#0369a1', roofColor: '#0f172a', neonColor: '#fbbf24', accentColor: '#e0f2fe', landmarkKind: 'bank' },
  { key: '12_3', name: 'KESTREL SYNDICATE TOWER', style: 'glass_tower', height: 205, baseColor: '#475569', sideColor: '#1e293b', roofColor: '#090d16', neonColor: '#f43f5e', accentColor: '#fda4af', landmarkKind: 'syndicate' },
  { key: '15_2', name: 'SOLANA SKY EXCHANGE', style: 'glass_tower', height: 162, baseColor: '#60a5fa', sideColor: '#1d4ed8', roofColor: '#172554', neonColor: '#34d399', accentColor: '#bfdbfe', landmarkKind: 'exchange' },
  { key: '15_5', name: 'CHROME CUSTOMS GARAGE', style: 'garage', height: 68, baseColor: '#334155', sideColor: '#1e293b', roofColor: '#0f172a', neonColor: '#22d3ee', accentColor: '#f97316', landmarkKind: 'garage' },
  { key: '18_6', name: 'CAYO MARINA PIER 7', style: 'harbor_warehouse', height: 74, baseColor: '#475569', sideColor: '#334155', roofColor: '#1e293b', neonColor: '#fb7185', accentColor: '#38bdf8', landmarkKind: 'harbor' },
  { key: '9_0', name: 'MIRAMAR SAFEHOUSE VILLA', style: 'villa', height: 64, baseColor: '#fef3c7', sideColor: '#fde68a', roofColor: '#b45309', neonColor: '#22c55e', accentColor: '#10b981', landmarkKind: 'safehouse' },
  { key: '6_5', name: 'SMPD METRO PRECINCT HQ', style: 'precinct', height: 112, baseColor: '#3b82f6', sideColor: '#1e3a8a', roofColor: '#0f172a', neonColor: '#60a5fa', accentColor: '#ef4444', landmarkKind: 'police' },
  { key: '3_2', name: 'ECLIPSE NEON ARCADE', style: 'neon_club', height: 115, baseColor: '#311042', sideColor: '#1f082b', roofColor: '#09040e', neonColor: '#e879f9', accentColor: '#38bdf8', landmarkKind: 'arcade' },
  { key: '6_2', name: 'OUTRUN NIGHTMARKET', style: 'neon_club', height: 124, baseColor: '#1e1b4b', sideColor: '#0f172a', roofColor: '#020617', neonColor: '#f43f5e', accentColor: '#22d3ee', landmarkKind: 'club' },
];

const GENERIC_SIGNS = ['HOTEL MIRAMAR', 'PALM BREEZE CLUB', 'SOLARIS MOTORS', 'CAYO IMPORTS', 'SUNSET LOUNGE', 'BAYSIDE CONDOS', 'HYPERION PLAZA', 'AQUA MARINA', 'CORAL SUITES', 'STARLIGHT DINER'];

export function createCityMap(random) {
  const roadsX = [];
  const roadsY = [];
  for (let x = WORLD.blockSize; x <= WORLD.coastX; x += WORLD.blockSize) {
    roadsX.push(x);
  }
  for (let y = WORLD.blockSize; y < WORLD.height; y += WORLD.blockSize) {
    roadsY.push(y);
  }

  const landmarkByKey = new Map();
  for (let i = 0; i < LANDMARK_BUILDINGS.length; i += 1) {
    landmarkByKey.set(LANDMARK_BUILDINGS[i].key, LANDMARK_BUILDINGS[i]);
  }

  const buildings = [];
  const palmTrees = [];
  const streetLamps = [];
  const yachts = [];
  const landmarks = [];

  const halfStreet = WORLD.roadWidth * 0.5 + WORLD.sidewalkWidth;

  for (let gx = 0; gx < 7; gx += 1) {
    for (let gy = 0; gy < 8; gy += 1) {
      const minX = gx * WORLD.blockSize + halfStreet;
      const maxX = (gx + 1) * WORLD.blockSize - halfStreet;
      const minY = gy * WORLD.blockSize + halfStreet;
      const maxY = (gy + 1) * WORLD.blockSize - halfStreet;
      if (maxX <= minX + 40 || maxY <= minY + 40) continue;

      const blockCenterX = (minX + maxX) * 0.5;
      const blockCenterY = (minY + maxY) * 0.5;
      const key = `${gx * 3}_${gy}`;
      const landmark = landmarkByKey.get(key);

      if (landmark) {
        const b = {
          id: `b_${gx}_${gy}`,
          x: blockCenterX,
          y: blockCenterY,
          w: maxX - minX - 10,
          d: maxY - minY - 10,
          h: landmark.height,
          name: landmark.name,
          style: landmark.style,
          baseColor: landmark.baseColor,
          sideColor: landmark.sideColor,
          roofColor: landmark.roofColor,
          neonColor: landmark.neonColor,
          accentColor: landmark.accentColor,
          landmarkKind: landmark.landmarkKind,
          windowRows: Math.max(3, Math.floor(landmark.height / 18)),
          windowCols: 5,
        };
        buildings.push(b);
        landmarks.push({
          kind: landmark.landmarkKind,
          name: landmark.name,
          x: blockCenterX,
          y: maxY + WORLD.sidewalkWidth * 0.5,
          building: b,
        });
      } else {
        // Split block into 2 sub-buildings for realistic urban density and skylines
        const splitVertical = (gx + gy) % 2 === 0;
        for (let sub = 0; sub < 2; sub += 1) {
          const isCoastal = gx === 6;
          const isDowntown = gx >= 3 && gx <= 5 && gy >= 2 && gy <= 4;
          const isNeon = gx <= 2 && gy <= 4;

          let baseColor = '#cbd5e1';
          let sideColor = '#94a3b8';
          let neonColor = '#38bdf8';
          let accentColor = '#f59e0b';
          let height = randomRange(random, 62, 108);

          if (isCoastal) {
            const coastalPalettes = [
              ['#ffd6ba', '#e8af8e', '#00f5d4', '#ff5d8f'],
              ['#caffbf', '#9bf6ff', '#ff70a6', '#ffd166'],
              ['#ffc6ff', '#bdb2ff', '#48cae4', '#ff9f1c'],
            ];
            const pal = coastalPalettes[(gx + gy + sub) % coastalPalettes.length];
            baseColor = pal[0];
            sideColor = pal[1];
            neonColor = pal[2];
            accentColor = pal[3];
            height = randomRange(random, 78, 122);
          } else if (isDowntown) {
            baseColor = sub === 0 ? '#38bdf8' : '#64748b';
            sideColor = sub === 0 ? '#0284c7' : '#334155';
            neonColor = '#fbbf24';
            accentColor = '#e0f2fe';
            height = randomRange(random, 128, 195);
          } else if (isNeon) {
            baseColor = '#2e1065';
            sideColor = '#1e1b4b';
            neonColor = sub === 0 ? '#f43f5e' : '#c084fc';
            accentColor = '#22d3ee';
            height = randomRange(random, 85, 136);
          }

          const bw = splitVertical ? (maxX - minX - 18) * 0.5 : maxX - minX - 12;
          const bd = splitVertical ? maxY - minY - 12 : (maxY - minY - 18) * 0.5;
          const bx = splitVertical
            ? minX + 6 + bw * 0.5 + sub * (bw + 6)
            : blockCenterX;
          const by = splitVertical
            ? blockCenterY
            : minY + 6 + bd * 0.5 + sub * (bd + 6);

          buildings.push({
            id: `b_${gx}_${gy}_${sub}`,
            x: bx,
            y: by,
            w: bw,
            d: bd,
            h: Math.round(height),
            name: (gx + gy + sub) % 2 === 0 ? randomChoice(random, GENERIC_SIGNS) : '',
            style: isCoastal ? 'art_deco_hotel' : isDowntown ? 'glass_tower' : 'urban',
            baseColor,
            sideColor,
            roofColor: '#1e293b',
            neonColor,
            accentColor,
            landmarkKind: null,
            windowRows: Math.max(3, Math.floor(height / 18)),
            windowCols: 4,
          });
        }
      }

      // Plant palm trees and streetlamps along block sidewalks
      palmTrees.push(
        { x: minX - 8, y: minY + 24, height: randomRange(random, 28, 36), lean: 0.14 },
        { x: maxX + 8, y: maxY - 24, height: randomRange(random, 28, 36), lean: -0.12 },
      );
      if (gx >= 4) {
        palmTrees.push(
          { x: maxX + 8, y: minY + (maxY - minY) * 0.5, height: 34, lean: 0.18 },
        );
      }
      streetLamps.push(
        { x: minX - 6, y: maxY - 10 },
        { x: maxX + 6, y: minY + 10 },
      );
    }
  }

  // Extra coastal palm promenade along Palms Beach & Ocean Drive (x = 2240)
  for (let y = 120; y < WORLD.height - 120; y += 72) {
    palmTrees.push({
      x: WORLD.coastX + WORLD.roadWidth * 0.5 + 18,
      y,
      height: 35 + (y % 3) * 3,
      lean: 0.22,
    });
  }

  // Luxury yachts docked along Solaris Bay Ocean & Cayo Marina
  for (let y = 260; y < WORLD.height - 200; y += 280) {
    yachts.push({
      x: WORLD.coastX + WORLD.beachWidth + 95 + (y % 2) * 55,
      y,
      length: 56,
      width: 18,
      hullColor: '#f8fafc',
      trimColor: y % 560 === 260 ? '#00f5d4' : '#ff5d8f',
    });
  }

  return {
    roadsX,
    roadsY,
    buildings,
    palmTrees,
    streetLamps,
    yachts,
    landmarks,
  };
}

export function getDistrictAt(x, y) {
  for (let i = 0; i < DISTRICTS.length; i += 1) {
    const d = DISTRICTS[i];
    if (x >= d.minX && x <= d.maxX && y >= d.minY && y <= d.maxY) {
      return d;
    }
  }
  return DISTRICTS[0];
}

export function collideWorldBuildings(city, x, y, radius) {
  let resolvedX = Math.min(WORLD.coastX + WORLD.beachWidth - radius, Math.max(60, x));
  let resolvedY = Math.min(WORLD.height - 60, Math.max(60, y));
  let hitBuilding = null;

  const buildings = city.buildings;
  for (let i = 0; i < buildings.length; i += 1) {
    const b = buildings[i];
    const halfW = b.w * 0.5 + radius;
    const halfD = b.d * 0.5 + radius;
    const dx = resolvedX - b.x;
    const dy = resolvedY - b.y;
    if (Math.abs(dx) < halfW && Math.abs(dy) < halfD) {
      hitBuilding = b;
      const overlapX = halfW - Math.abs(dx);
      const overlapY = halfD - Math.abs(dy);
      if (overlapX < overlapY) {
        resolvedX += dx >= 0 ? overlapX : -overlapX;
      } else {
        resolvedY += dy >= 0 ? overlapY : -overlapY;
      }
    }
  }

  return { x: resolvedX, y: resolvedY, hitBuilding };
}

export function findNearestRoadCoord(coords, value) {
  let best = coords[0];
  let bestDist = Math.abs(value - best);
  for (let i = 1; i < coords.length; i += 1) {
    const d = Math.abs(value - coords[i]);
    if (d < bestDist) {
      bestDist = d;
      best = coords[i];
    }
  }
  return best;
}

export function computeGpsPath(city, startX, startY, targetX, targetY) {
  const rx1 = findNearestRoadCoord(city.roadsX, startX);
  const ry1 = findNearestRoadCoord(city.roadsY, startY);
  const rx2 = findNearestRoadCoord(city.roadsX, targetX);
  const ry2 = findNearestRoadCoord(city.roadsY, targetY);

  return [
    { x: startX, y: startY },
    { x: rx1, y: ry1 },
    { x: rx2, y: ry1 },
    { x: rx2, y: ry2 },
    { x: targetX, y: targetY },
  ];
}

export function findLandmarkByKind(city, kind) {
  for (let i = 0; i < city.landmarks.length; i += 1) {
    if (city.landmarks[i].kind === kind) return city.landmarks[i];
  }
  return city.landmarks[0] || null;
}
