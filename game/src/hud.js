// GTA-style HUD & Tactical Menu Renderer for Solaris Bay: Heatwave.
// Draws the bottom-left radar minimap with GPS route, top-right 5-star wanted cluster,
// cash & weapon arsenal, top-center mission objective banner, character comms dialogue,
// bottom-right vehicle speedometer & synthwave radio ticker, and tactical city map drawer.

import { getDistrictAt } from './city.js';
import { DISTRICTS, FIELD, PALETTE, STORY_MISSIONS, WEAPON_SPECS, WORLD } from './config.js';
import { findNearestInteractableVehicle } from './vehicles.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_MAP = 'map';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStarShape(ctx, cx, cy, outerR, innerR) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI * 0.5 + (i * Math.PI) / 5;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function createHudRenderer(ctx) {
  function label(text, x, y, size, color, align = 'left', bold = true) {
    ctx.font = `${bold ? 'bold ' : ''}${size}px system-ui, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
  }

  function drawPanelCard(x, y, w, h, borderColor = PALETTE.hudBorder, bgAlpha = 0.86) {
    ctx.save();
    drawRoundedRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = `rgba(10, 14, 24, ${bgAlpha})`;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
    ctx.restore();
  }

  function drawRadarMinimap(state) {
    const { player, city, vehicles, pedestrians, police, missions } = state;
    const cardX = 20;
    const cardY = 502;
    const cardW = 246;
    const cardH = 198;

    const strobe = police.stars > 0
      ? (Math.floor(state.elapsed * 8) % 2 === 0 ? '#ef4444' : '#3b82f6')
      : PALETTE.hudBorder;
    drawPanelCard(cardX, cardY, cardW, cardH, strobe, 0.9);

    const mapX = cardX + 10;
    const mapY = cardY + 10;
    const mapW = cardW - 20;
    const mapH = 132;
    const scale = 0.125;

    ctx.save();
    drawRoundedRect(ctx, mapX, mapY, mapW, mapH, 7);
    ctx.clip();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(mapX, mapY, mapW, mapH);

    const toRadarX = (wx) => mapX + mapW * 0.5 + (wx - player.x) * scale;
    const toRadarY = (wy) => mapY + mapH * 0.5 + (wy - player.y) * scale;

    const coastRadarX = toRadarX(WORLD.coastX);
    if (coastRadarX < mapX + mapW) {
      ctx.fillStyle = '#d4a373';
      ctx.fillRect(coastRadarX, mapY, 18, mapH);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(coastRadarX + 18, mapY, mapX + mapW - coastRadarX, mapH);
    }

    for (let i = 0; i < city.buildings.length; i += 1) {
      const b = city.buildings[i];
      const bx = toRadarX(b.x - b.w * 0.5);
      const by = toRadarY(b.y - b.d * 0.5);
      const bw = b.w * scale;
      const bd = b.d * scale;
      if (bx + bw < mapX || bx > mapX + mapW || by + bd < mapY || by > mapY + mapH) continue;
      ctx.fillStyle = b.landmarkKind ? '#334155' : '#1e293b';
      ctx.fillRect(bx, by, bw, bd);
    }

    ctx.fillStyle = '#475569';
    for (let i = 0; i < city.roadsX.length; i += 1) {
      ctx.fillRect(toRadarX(city.roadsX[i] - WORLD.roadWidth * 0.5), mapY, WORLD.roadWidth * scale, mapH);
    }
    for (let i = 0; i < city.roadsY.length; i += 1) {
      ctx.fillRect(mapX, toRadarY(city.roadsY[i] - WORLD.roadWidth * 0.5), mapW, WORLD.roadWidth * scale);
    }

    const route = missions.state.gpsRoute;
    if (route && route.length > 1) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      for (let i = 0; i < route.length; i += 1) {
        const px = toRadarX(route[i].x);
        const py = toRadarY(route[i].y);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    for (let i = 0; i < vehicles.length; i += 1) {
      const v = vehicles[i];
      if (v.destroyed || v === player.vehicle) continue;
      const vx = toRadarX(v.x);
      const vy = toRadarY(v.y);
      if (vx < mapX || vx > mapX + mapW || vy < mapY || vy > mapY + mapH) continue;
      if (v.driverType === 'police' || v.spec.police) {
        const isRed = Math.floor(state.elapsed * 10 + i) % 2 === 0;
        ctx.fillStyle = isRed ? 'rgba(239, 68, 68, 0.24)' : 'rgba(59, 130, 246, 0.24)';
        ctx.beginPath();
        ctx.arc(vx, vy, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isRed ? '#ef4444' : '#3b82f6';
        ctx.beginPath();
        ctx.arc(vx, vy, 4.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(vx - 2, vy - 2, 4, 4);
      }
    }

    for (let i = 0; i < pedestrians.length; i += 1) {
      const p = pedestrians[i];
      if (!p.alive || p.role !== 'syndicate') continue;
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(toRadarX(p.x), toRadarY(p.y), 3.8, 0, Math.PI * 2);
      ctx.fill();
    }

    const wx = Math.max(mapX + 8, Math.min(mapX + mapW - 8, toRadarX(missions.state.waypointX)));
    const wy = Math.max(mapY + 8, Math.min(mapY + mapH - 8, toRadarY(missions.state.waypointY)));
    ctx.fillStyle = '#fbbf24';
    drawStarShape(ctx, wx, wy, 7, 3.2);
    ctx.fill();
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const cx = mapX + mapW * 0.5;
    const cy = mapY + mapH * 0.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(player.vehicle ? player.vehicle.angle : player.angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -5.5);
    ctx.lineTo(-3.5, 0);
    ctx.lineTo(-6, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(mapX + 5, mapY + 5, 64, 18);
    label('GPS RADAR', mapX + 10, mapY + 18, 11, '#38bdf8');
    ctx.restore();

    const district = getDistrictAt(player.x, player.y);
    label(district.name, mapX + 2, cardY + 156, 11, '#e2e8f0');
    const distMeters = Math.round(Math.hypot(missions.state.waypointX - player.x, missions.state.waypointY - player.y));
    label(`${distMeters}m`, mapX + mapW, cardY + 156, 11, '#fbbf24', 'right');

    const barW = (mapW - 8) * 0.5;
    const barY = cardY + 166;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(mapX, barY, barW, 18);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(mapX, barY, barW * Math.max(0, Math.min(1, player.health / 100)), 18);
    label(`HP ${Math.ceil(player.health)}`, mapX + 6, barY + 13, 11, '#ffffff');

    const armorX = mapX + barW + 8;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(armorX, barY, barW, 18);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(armorX, barY, barW * Math.max(0, Math.min(1, player.armor / 100)), 18);
    label(`ARMOR ${Math.ceil(player.armor)}`, armorX + 6, barY + 13, 11, '#ffffff');
  }

  function drawWantedAndStatus(state) {
    const { player, police } = state;
    const cardX = FIELD.width - 284;
    const cardY = 14;
    const cardW = 266;
    const cardH = 144;
    const flashRed = Math.floor(state.elapsed * 9) % 2 === 0;
    const borderCol = police.stars > 0 ? (flashRed ? '#ef4444' : '#3b82f6') : PALETTE.hudBorder;
    drawPanelCard(cardX, cardY, cardW, cardH, borderCol, 0.88);

    const starY = cardY + 26;
    const wantedText = police.stars > 0
      ? (police.state.evading ? 'EVADING SMPD PURSUIT' : `SMPD WANTED LEVEL ${police.stars}`)
      : 'HEAT LEVEL // CLEAR';
    label(wantedText, cardX + 14, cardY + 19, 11, police.stars > 0 ? (flashRed ? '#fca5a5' : '#93c5fd') : '#94a3b8');

    for (let s = 1; s <= 5; s += 1) {
      const sx = cardX + 150 + (s - 1) * 23;
      const active = s <= police.stars;
      if (active) {
        ctx.fillStyle = flashRed ? 'rgba(239, 68, 68, 0.35)' : 'rgba(59, 130, 246, 0.35)';
        ctx.beginPath();
        ctx.arc(sx, starY - 4, 11, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = active ? '#fbbf24' : '#334155';
      drawStarShape(ctx, sx, starY - 4, 8.5, 4);
      ctx.fill();
    }

    label(`$${Math.floor(player.cash).toLocaleString()}`, cardX + 14, cardY + 56, 26, '#22c55e');
    const rank = 1 + Math.floor(player.respect / 350);
    label(`RANK ${rank} • ${player.respect} REP`, cardX + cardW - 14, cardY + 46, 12, '#fbbf24', 'right');
    label('ELENA VEGA // SOLARIS BAY', cardX + cardW - 14, cardY + 61, 11, '#38bdf8', 'right', false);

    const weapon = WEAPON_SPECS[player.weaponIndex] || WEAPON_SPECS[1];
    const wepY = cardY + 72;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    drawRoundedRect(ctx, cardX + 12, wepY, cardW - 24, 38, 6);
    ctx.fill();

    label(`🔫 ${weapon.name.toUpperCase()}`, cardX + 18, wepY + 16, 12, weapon.color);
    label('[1-5 / Q] SWITCH  •  [LMB] FIRE', cardX + 18, wepY + 31, 10.5, '#94a3b8', 'left', false);
    const ammoText = weapon.ammoMax > 0 ? `${player.ammo[weapon.id]}/${weapon.ammoMax}` : 'MELEE';
    label(ammoText, cardX + cardW - 18, wepY + 17, 12.5, '#f8fafc', 'right');

    const slotLabels = ['1:FIST', '2:9MM', '3:SMG', '4:12G', '5:AR'];
    const pillW = (cardW - 32) / WEAPON_SPECS.length;
    for (let i = 0; i < WEAPON_SPECS.length; i += 1) {
      const px = cardX + 12 + i * (pillW + 2);
      const py = cardY + 116;
      const selected = i === player.weaponIndex;
      ctx.fillStyle = selected ? '#38bdf8' : '#1e293b';
      ctx.fillRect(px, py, pillW - 3, 18);
      label(slotLabels[i] || `${i + 1}`, px + (pillW - 3) * 0.5, py + 13, 10, selected ? '#090d16' : '#cbd5e1', 'center');
    }
  }

  function drawMissionBanner(state) {
    const mState = state.missions.state;
    const bannerW = 590;
    const bannerH = 68;
    const bannerX = (FIELD.width - bannerW) * 0.5 - 20;
    const bannerY = 14;
    drawPanelCard(bannerX, bannerY, bannerW, bannerH, '#fbbf24', 0.88);

    ctx.fillStyle = mState.stage === 'escape' ? '#f43f5e' : '#fbbf24';
    ctx.fillRect(bannerX + 8, bannerY + 10, 5, bannerH - 20);
    label(`★ ${mState.waypointLabel}`, bannerX + 22, bannerY + 23, 13, '#fbbf24');

    const dist = Math.round(Math.hypot(mState.waypointX - state.player.x, mState.waypointY - state.player.y));
    label(`WAYPOINT ${dist}m`, bannerX + bannerW - 16, bannerY + 23, 13, '#38bdf8', 'right');
    label(mState.objectiveText, bannerX + 22, bannerY + 43, 12.5, '#f8fafc', 'left', false);

    const progW = bannerW - 38;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bannerX + 22, bannerY + 52, progW, 7);
    ctx.fillStyle = mState.stage === 'escape' ? '#f43f5e' : '#22c55e';
    ctx.fillRect(bannerX + 22, bannerY + 52, progW * (mState.stage === 'to_start' ? 0.2 : mState.progress), 7);
  }

  function drawCommsAndPrompts(state, screen) {
    const { player, vehicles, missions, police } = state;
    const mState = missions.state;
    const mapOpen = screen === SCREEN_MAP;

    let promptText = '[WASD] MOVE  •  [SHIFT] SPRINT  •  [LMB / SPACE] SHOOT  •  [E] STEAL CAR  •  [M] CITY MAP';
    if (player.vehicle) {
      promptText = '[WASD] DRIVE  •  [SPACE] HANDBRAKE DRIFT  •  [SHIFT] NITRO  •  [E] EXIT CAR  •  [R] RADIO';
    } else {
      const nearCar = findNearestInteractableVehicle(player, vehicles);
      if (nearCar) {
        const actionVerb = nearCar.driverType === 'none' ? 'ENTER' : 'CARJACK';
        promptText = `[PRESS E / F] ${actionVerb} ${nearCar.spec.name.toUpperCase()}  •  [LMB / SPACE] FIRE WEAPON`;
      }
    }

    const pillW = mapOpen ? 520 : 610;
    const pillX = mapOpen ? 276 : (FIELD.width - pillW) * 0.5;
    const pillY = FIELD.height - 38;
    drawPanelCard(pillX, pillY, pillW, 26, 'rgba(148, 163, 184, 0.35)', 0.88);
    label(promptText, pillX + pillW * 0.5, pillY + 17, 11, '#e2e8f0', 'center');

    if (mState.commsTimer > 0 || police.stars > 0) {
      const boxW = mapOpen ? 520 : 610;
      const boxX = mapOpen ? 276 : (FIELD.width - boxW) * 0.5;
      const boxY = FIELD.height - 104;
      const showDispatch = mState.commsTimer <= 0 && police.stars > 0;
      const speaker = showDispatch ? 'SMPD TACTICAL DISPATCH' : mState.commsSpeaker;
      const role = showDispatch ? `CODE 3 PURSUIT • ${police.stars} STARS` : mState.commsRole;
      const line = showDispatch ? police.state.dispatchText : mState.commsLine;
      const accent = showDispatch ? '#ef4444' : mState.commsColor;

      drawPanelCard(boxX, boxY, boxW, 58, accent, 0.92);
      ctx.fillStyle = accent;
      drawRoundedRect(ctx, boxX + 10, boxY + 9, 44, 40, 6);
      ctx.fill();
      label(showDispatch ? 'SMPD' : speaker.slice(0, 4), boxX + 32, boxY + 33, 12, '#090d16', 'center');
      label(`${speaker}  //  ${role}`, boxX + 62, boxY + 22, 11.5, accent);
      label(`"${line}"`, boxX + 62, boxY + 42, 12, '#f8fafc', 'left', false);
    }
  }

  function drawVehicleDashboard(state) {
    const { player, audio } = state;
    const v = player.vehicle;
    const cardX = FIELD.width - 266;
    const cardY = 528;
    const cardW = 246;
    const cardH = 172;

    if (!v) {
      drawPanelCard(cardX, cardY + 34, cardW, 138, PALETTE.hudCyan, 0.88);
      label('ON-FOOT TACTICAL MODE', cardX + 14, cardY + 56, 12, '#38bdf8');
      label('ELENA VEGA // FREE ROAM', cardX + 14, cardY + 78, 16, '#f8fafc');
      label('• Press [E] near any car to hijack', cardX + 14, cardY + 102, 12, '#94a3b8', 'left', false);
      label('• Aim with Mouse, [LMB] to fire', cardX + 14, cardY + 122, 12, '#94a3b8', 'left', false);
      label('• Press [F5] to Save at Safehouse', cardX + 14, cardY + 142, 12, '#94a3b8', 'left', false);
      label('✓ SAFEHOUSE LINK ACTIVE', cardX + 14, cardY + 162, 11, '#22c55e');
      return;
    }

    drawPanelCard(cardX, cardY, cardW, cardH, v.boosting ? '#f97316' : PALETTE.hudCyan, 0.9);
    const mph = Math.round(v.speed * 0.56);
    const gear = mph < 5 ? 'N' : mph < 32 ? '1' : mph < 64 ? '2' : mph < 96 ? '3' : mph < 128 ? '4' : '5';

    const gaugeX = cardX + 64;
    const gaugeY = cardY + 70;
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, 42, Math.PI * 0.8, Math.PI * 2.2);
    ctx.stroke();

    ctx.strokeStyle = v.boosting ? '#f97316' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, 42, Math.PI * 0.8, Math.PI * (0.8 + Math.min(1, mph / 175) * 1.4));
    ctx.stroke();

    label(String(mph), gaugeX, gaugeY + 6, 26, '#f8fafc', 'center');
    label('MPH', gaugeX, gaugeY + 20, 10, '#94a3b8', 'center');
    label(v.spec.name.toUpperCase().slice(0, 18), cardX + 114, cardY + 32, 11.5, '#fbbf24');
    label(`GEAR ${gear} ${v.drifting ? '• DRIFT!' : v.boosting ? '• NITRO!' : ''}`, cardX + 114, cardY + 52, 11.5, '#38bdf8');

    label('NITRO BOOST [SHIFT]', cardX + 118, cardY + 72, 10, '#94a3b8');
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cardX + 118, cardY + 77, 112, 8);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(cardX + 118, cardY + 77, 112 * (v.nitro / 100), 8);

    label('CHASSIS INTEGRITY', cardX + 118, cardY + 100, 10, '#94a3b8');
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cardX + 118, cardY + 105, 112, 8);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(cardX + 118, cardY + 105, 112 * Math.max(0, v.health / v.maxHealth), 8);

    const station = audio ? audio.currentStation() : { name: 'SOLARIS FM 88.5', track: 'Neon Palms' };
    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    drawRoundedRect(ctx, cardX + 12, cardY + 128, cardW - 24, 34, 6);
    ctx.fill();
    label(`♪ ${station.name} [R]`, cardX + 20, cardY + 143, 11, '#f43f5e');
    label(station.track, cardX + 20, cardY + 157, 11, '#cbd5e1', 'left', false);
  }

  function drawTacticalMapDrawer(state) {
    const drawerW = 436;
    const drawerH = 516;
    const drawerX = FIELD.width - drawerW - 18;
    const drawerY = 166;
    drawPanelCard(drawerX, drawerY, drawerW, drawerH, '#38bdf8', 0.93);

    label('SOLARIS BAY // TACTICAL GPS & SAFEHOUSE', drawerX + 16, drawerY + 28, 16, '#38bdf8');
    label('✓ MIRAMAR SAFEHOUSE SAVE READY [F5]', drawerX + 16, drawerY + 46, 11, '#22c55e');

    const mapX = drawerX + 16;
    const mapY = drawerY + 56;
    const mapW = drawerW - 32;
    const mapH = 235;

    ctx.save();
    drawRoundedRect(ctx, mapX, mapY, mapW, mapH, 8);
    ctx.clip();
    ctx.fillStyle = '#091224';
    ctx.fillRect(mapX, mapY, mapW, mapH);

    const sx = mapW / WORLD.width;
    const sy = mapH / WORLD.height;

    for (let i = 0; i < DISTRICTS.length; i += 1) {
      const d = DISTRICTS[i];
      ctx.fillStyle = `${d.themeColor}22`;
      ctx.fillRect(mapX + d.minX * sx, mapY + d.minY * sy, (d.maxX - d.minX) * sx, (d.maxY - d.minY) * sy);
      ctx.strokeStyle = `${d.themeColor}66`;
      ctx.strokeRect(mapX + d.minX * sx, mapY + d.minY * sy, (d.maxX - d.minX) * sx, (d.maxY - d.minY) * sy);
    }

    ctx.fillStyle = '#0284c7';
    ctx.fillRect(mapX + WORLD.coastX * sx, mapY, (WORLD.width - WORLD.coastX) * sx, mapH);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    for (let i = 0; i < state.city.roadsX.length; i += 1) {
      const rx = mapX + state.city.roadsX[i] * sx;
      ctx.beginPath();
      ctx.moveTo(rx, mapY);
      ctx.lineTo(rx, mapY + mapH);
      ctx.stroke();
    }
    for (let i = 0; i < state.city.roadsY.length; i += 1) {
      const ry = mapY + state.city.roadsY[i] * sy;
      ctx.beginPath();
      ctx.moveTo(mapX, ry);
      ctx.lineTo(mapX + mapW, ry);
      ctx.stroke();
    }

    const route = state.missions.state.gpsRoute;
    if (route && route.length > 1) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < route.length; i += 1) {
        const px = mapX + route[i].x * sx;
        const py = mapY + route[i].y * sy;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    for (let i = 0; i < DISTRICTS.length; i += 1) {
      const d = DISTRICTS[i];
      label(d.name.split(' & ')[0], mapX + ((d.minX + d.maxX) * 0.5) * sx, mapY + ((d.minY + d.maxY) * 0.5) * sy, 10, '#e2e8f0', 'center');
    }

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(mapX + state.player.x * sx, mapY + state.player.y * sy, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    drawStarShape(ctx, mapX + state.missions.state.waypointX * sx, mapY + state.missions.state.waypointY * sy, 7, 3.2);
    ctx.fill();
    ctx.restore();

    let listY = mapY + mapH + 24;
    label('STORY CAMPAIGN & EMPIRE DOSSIER', mapX, listY, 13, '#fbbf24');

    for (let i = 0; i < STORY_MISSIONS.length; i += 1) {
      const m = STORY_MISSIONS[i];
      listY += 27;
      const isCurrent = i === state.missions.state.currentIndex;
      const isDone = i < state.missions.state.currentIndex || state.missions.state.completedCount > i;
      ctx.fillStyle = isCurrent ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.65)';
      drawRoundedRect(ctx, mapX, listY - 15, mapW, 23, 5);
      ctx.fill();

      const statusTag = isDone ? '✓ DONE' : isCurrent ? '★ ACTIVE' : 'LOCKED';
      const shortTitle = m.title.length > 36 ? `${m.title.slice(0, 35)}…` : m.title;
      label(`${statusTag} — ${shortTitle}`, mapX + 8, listY, 11, isDone ? '#22c55e' : isCurrent ? '#fbbf24' : '#94a3b8');
      label(`$${m.rewardCash.toLocaleString()}`, mapX + mapW - 8, listY, 11, '#22c55e', 'right');
    }

    label('PRESS [M] TO CLOSE MAP  •  [F5] SAVE AT MIRAMAR SAFEHOUSE', mapX, drawerY + drawerH - 14, 11.5, '#38bdf8');
  }

  function drawCenterModal(title, subtitle, lines, promptText, bestScore) {
    const w = 680;
    const h = 390;
    const x = (FIELD.width - w) * 0.5;
    const y = (FIELD.height - h) * 0.5;
    drawPanelCard(x, y, w, h, '#ff7b54', 0.92);

    label(subtitle, FIELD.width * 0.5, y + 40, 14, '#ff7b54', 'center');
    label(title, FIELD.width * 0.5, y + 86, 42, '#f8fafc', 'center');

    for (let i = 0; i < lines.length; i += 1) {
      label(lines[i], FIELD.width * 0.5, y + 135 + i * 30, 15, '#cbd5e1', 'center', false);
    }

    if (bestScore > 0) {
      label(`HIGHEST EMPIRE NET WORTH: $${bestScore.toLocaleString()}`, FIELD.width * 0.5, y + h - 76, 16, '#22c55e', 'center');
    }
    label(promptText, FIELD.width * 0.5, y + h - 34, 20, '#fbbf24', 'center');
  }

  function drawHud(state, screen, bestScore) {
    drawRadarMinimap(state);
    drawWantedAndStatus(state);
    drawMissionBanner(state);
    if (screen !== SCREEN_MAP) drawVehicleDashboard(state);
    drawCommsAndPrompts(state, screen);

    if (screen === SCREEN_MAP) {
      drawTacticalMapDrawer(state);
    } else if (screen === SCREEN_TITLE) {
      drawCenterModal(
        'SOLARIS BAY: HEATWAVE',
        'OPEN-WORLD COASTAL CRIME ACTION // 6 DISTRICTS • HEISTS • 5-STAR PURSUITS',
        [
          'Explore sun-soaked Solaris Bay on foot and behind the wheel of 8 custom vehicles.',
          'Steal exotic supercars [E], drift Ocean Drive [Space], and fire 5 tactical weapons [LMB].',
          'Outrun 5-Star SMPD Interceptors, SWAT units & choppers or respray at Chrome Customs.',
          'Complete the 5-Chapter Story Heist Campaign and save your empire at Miramar Safehouse [F5].',
        ],
        'PRESS SPACE, ENTER OR CLICK TO ENTER SOLARIS BAY',
        bestScore,
      );
    } else if (screen === SCREEN_PAUSED) {
      drawCenterModal(
        'GAME PAUSED',
        'SOLARIS BAY TACTICAL PAUSE MENU',
        [
          'Driving: [WASD / Arrows] Steer & Throttle  •  [Space] Drift  •  [Shift] Nitro Boost',
          'On Foot: [WASD] Move  •  [Mouse + LMB] Aim & Fire  •  [1-5 / Q] Switch Weapon',
          'World: [E / F] Steal or Exit Vehicle  •  [R] Radio Station  •  [M] Tactical City Map',
          'Safehouse: [F5] Save Progress to LocalStorage',
        ],
        'PRESS P, ESCAPE OR SPACE TO RESUME',
        bestScore,
      );
    } else if (screen === SCREEN_OVER) {
      drawCenterModal(
        state.police.stars > 0 ? 'BUSTED BY SMPD' : 'WASTED IN SOLARIS BAY',
        'EMERGENCY MEDICAL & BAIL DISPATCH',
        [
          `Elena Vega was neutralized with $${Math.floor(state.player.cash).toLocaleString()} in cash and ${state.player.respect} Respect.`,
          'Miramar Safehouse clinic has recovered your gear and cleared your wanted warrant.',
        ],
        'PRESS SPACE OR CLICK TO RESPAWN AT SAFEHOUSE',
        bestScore,
      );
    }
  }

  return { drawHud, drawTacticalMapDrawer };
}
