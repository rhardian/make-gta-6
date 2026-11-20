// 3D Perspective Open-World Renderer for Solaris Bay: Heatwave.
// Projects the sun-soaked tropical sky, ocean coastline, road network, GPS street chevrons,
// depth-sorted 3D buildings with neon signs, multi-part 3D vehicles, articulated 3D characters,
// palm trees, mission beacons, ballistic tracers, explosions, and the GTA-style HUD.

import {
  clipAndProjectPolygon3D,
  FAR_CLIP,
  NEAR_CLIP,
  projectWorldToScreen,
  worldToCameraSpace,
} from './camera.js';
import { FIELD, PALETTE, WORLD } from './config.js';
import { createHudRenderer, SCREEN_MAP, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './hud.js';

export { SCREEN_MAP, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE };

function fillPolygon(ctx, points, fillStyle, strokeStyle = null, lineWidth = 1) {
  if (!points || points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const hud = createHudRenderer(ctx);

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) * 0.5;
    view.y = (height - FIELD.height * view.scale) * 0.5;
  }

  function drawSkyAndHorizon(state) {
    const { camera, elapsed } = state;
    const horizonY = Math.max(120, Math.min(300, camera.horizonY));

    // Sunset sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY + 20);
    skyGrad.addColorStop(0, PALETTE.skyZenith);
    skyGrad.addColorStop(0.32, PALETTE.skyUpper);
    skyGrad.addColorStop(0.68, PALETTE.skyMid);
    skyGrad.addColorStop(0.92, PALETTE.skyHorizon);
    skyGrad.addColorStop(1, PALETTE.skyGlow);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, FIELD.width, horizonY + 8);

    // Sun position relative to camera yaw (sun sets in the East-Southeast over Solaris Bay)
    let sunRelYaw = 0.25 - camera.yaw;
    while (sunRelYaw > Math.PI) sunRelYaw -= Math.PI * 2;
    while (sunRelYaw < -Math.PI) sunRelYaw += Math.PI * 2;
    const sunX = FIELD.width * 0.5 + sunRelYaw * 520;
    const sunY = horizonY - 58;

    if (sunX > -220 && sunX < FIELD.width + 220) {
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 175);
      sunGlow.addColorStop(0, 'rgba(255, 248, 214, 0.95)');
      sunGlow.addColorStop(0.25, 'rgba(255, 196, 86, 0.65)');
      sunGlow.addColorStop(0.6, 'rgba(255, 102, 74, 0.25)');
      sunGlow.addColorStop(1, 'rgba(255, 102, 74, 0)');
      ctx.fillStyle = sunGlow;
      ctx.fillRect(sunX - 180, sunY - 180, 360, 360);

      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
      ctx.fill();
    }

    // Layered tropical sunset clouds
    ctx.fillStyle = 'rgba(255, 148, 112, 0.18)';
    for (let i = 0; i < 7; i += 1) {
      const cx = ((i * 260 - camera.yaw * 340 + elapsed * 4) % (FIELD.width + 320) + (FIELD.width + 320)) % (FIELD.width + 320) - 160;
      const cy = 48 + (i % 3) * 34;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 110 + (i % 2) * 40, 14 + (i % 3) * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distant silhouette skyline along the horizon
    ctx.fillStyle = '#1b112c';
    for (let i = 0; i < 28; i += 1) {
      const sx = ((i * 64 - camera.yaw * 410) % (FIELD.width + 120) + (FIELD.width + 120)) % (FIELD.width + 120) - 60;
      const sh = 14 + ((i * 19) % 38);
      ctx.fillRect(sx, horizonY - sh, 44, sh + 2);
    }

    // Ground base plane below horizon
    const groundGrad = ctx.createLinearGradient(0, horizonY, 0, FIELD.height);
    groundGrad.addColorStop(0, '#2a2438');
    groundGrad.addColorStop(0.35, '#1d2230');
    groundGrad.addColorStop(1, '#151924');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizonY, FIELD.width, FIELD.height - horizonY);
  }

  function drawQuad3D(camera, p1, p2, p3, p4, fillStyle, strokeStyle = null, lineWidth = 1) {
    const poly = clipAndProjectPolygon3D(camera, [p1, p2, p3, p4]);
    if (poly) fillPolygon(ctx, poly, fillStyle, strokeStyle, lineWidth);
    return poly;
  }

  function drawGroundAndRoads(state) {
    const { camera, city, combat, missions, elapsed } = state;
    const minY = Math.max(0, camera.y - 620);
    const maxY = Math.min(WORLD.height, camera.y + 620);
    const minX = Math.max(0, camera.x - 620);
    const maxX = Math.min(WORLD.width, camera.x + 620);

    // 1. Palms Beach sandy shoreline & Solaris Bay turquoise ocean
    const beachX1 = WORLD.coastX + WORLD.roadWidth * 0.5 + WORLD.sidewalkWidth;
    const beachX2 = WORLD.coastX + WORLD.beachWidth;
    const oceanX2 = WORLD.width + 400;

    drawQuad3D(camera, [beachX1, minY, 0], [beachX2, minY, 0], [beachX2, maxY, 0], [beachX1, maxY, 0], PALETTE.beachSand);
    drawQuad3D(camera, [beachX2, minY, -0.5], [oceanX2, minY, -0.5], [oceanX2, maxY, -0.5], [beachX2, maxY, -0.5], PALETTE.oceanMid);

    // Ocean surf foam & shimmering wave crests
    for (let y = Math.floor(minY / 80) * 80; y < maxY; y += 80) {
      const waveShift = Math.sin(elapsed * 2.4 + y * 0.03) * 6;
      drawQuad3D(camera, [beachX2 + 2 + waveShift, y, -0.2], [beachX2 + 12 + waveShift, y, -0.2], [beachX2 + 12 + waveShift, y + 55, -0.2], [beachX2 + 2 + waveShift, y + 55, -0.2], 'rgba(240, 253, 250, 0.65)');
      drawQuad3D(camera, [beachX2 + 55 - waveShift, y + 20, -0.2], [beachX2 + 95 - waveShift, y + 20, -0.2], [beachX2 + 95 - waveShift, y + 48, -0.2], [beachX2 + 55 - waveShift, y + 48, -0.2], 'rgba(255, 209, 102, 0.35)');
    }

    const halfRoad = WORLD.roadWidth * 0.5;
    const halfFull = halfRoad + WORLD.sidewalkWidth;

    // 2. North-South Avenues (roadsX)
    for (let i = 0; i < city.roadsX.length; i += 1) {
      const rx = city.roadsX[i];
      if (Math.abs(rx - camera.x) > 580) continue;
      drawQuad3D(camera, [rx - halfFull, minY, 0.2], [rx + halfFull, minY, 0.2], [rx + halfFull, maxY, 0.2], [rx - halfFull, maxY, 0.2], PALETTE.sidewalk);
      drawQuad3D(camera, [rx - halfRoad, minY, 0.3], [rx + halfRoad, minY, 0.3], [rx + halfRoad, maxY, 0.3], [rx - halfRoad, maxY, 0.3], PALETTE.asphalt);
      drawQuad3D(camera, [rx - 2.2, minY, 0.4], [rx + 2.2, minY, 0.4], [rx + 2.2, maxY, 0.4], [rx - 2.2, maxY, 0.4], PALETTE.laneYellow);

      const startDashY = Math.floor(minY / 48) * 48;
      for (let y = startDashY; y < maxY; y += 48) {
        for (const offset of [-22, 22]) {
          drawQuad3D(camera, [rx + offset - 1.2, y, 0.4], [rx + offset + 1.2, y, 0.4], [rx + offset + 1.2, y + 22, 0.4], [rx + offset - 1.2, y + 22, 0.4], PALETTE.laneWhite);
        }
      }
    }

    // 3. East-West Boulevards (roadsY)
    for (let i = 0; i < city.roadsY.length; i += 1) {
      const ry = city.roadsY[i];
      if (Math.abs(ry - camera.y) > 580) continue;
      drawQuad3D(camera, [minX, ry - halfFull, 0.2], [maxX, ry - halfFull, 0.2], [maxX, ry + halfFull, 0.2], [minX, ry + halfFull, 0.2], PALETTE.sidewalk);
      drawQuad3D(camera, [minX, ry - halfRoad, 0.32], [maxX, ry - halfRoad, 0.32], [maxX, ry + halfRoad, 0.32], [minX, ry + halfRoad, 0.32], PALETTE.asphalt);
      drawQuad3D(camera, [minX, ry - 2.2, 0.42], [maxX, ry - 2.2, 0.42], [maxX, ry + 2.2, 0.42], [minX, ry + 2.2, 0.42], PALETTE.laneYellow);

      const startDashX = Math.floor(minX / 48) * 48;
      for (let x = startDashX; x < maxX; x += 48) {
        for (const offset of [-22, 22]) {
          drawQuad3D(camera, [x, ry + offset - 1.2, 0.42], [x + 22, ry + offset - 1.2, 0.42], [x + 22, ry + offset + 1.2, 0.42], [x, ry + offset + 1.2, 0.42], PALETTE.laneWhite);
        }
      }
    }

    // 4. Zebra Crosswalks at nearby intersections
    for (let i = 0; i < city.roadsX.length; i += 1) {
      const rx = city.roadsX[i];
      if (Math.abs(rx - camera.x) > 360) continue;
      for (let j = 0; j < city.roadsY.length; j += 1) {
        const ry = city.roadsY[j];
        if (Math.abs(ry - camera.y) > 360) continue;
        for (let s = -32; s <= 28; s += 12) {
          drawQuad3D(camera, [rx + s, ry - halfRoad - 10, 0.45], [rx + s + 6, ry - halfRoad - 10, 0.45], [rx + s + 6, ry - halfRoad - 2, 0.45], [rx + s, ry - halfRoad - 2, 0.45], 'rgba(241, 245, 249, 0.65)');
          drawQuad3D(camera, [rx + s, ry + halfRoad + 2, 0.45], [rx + s + 6, ry + halfRoad + 2, 0.45], [rx + s + 6, ry + halfRoad + 10, 0.45], [rx + s, ry + halfRoad + 10, 0.45], 'rgba(241, 245, 249, 0.65)');
        }
      }
    }

    // 5. 3D GPS Route Ground Chevrons on the road toward active mission waypoint
    const route = missions.state.gpsRoute;
    if (route && route.length > 1) {
      for (let r = 0; r < route.length - 1; r += 1) {
        const a = route[r];
        const b = route[r + 1];
        const segLen = Math.hypot(b.x - a.x, b.y - a.y);
        if (segLen < 20) continue;
        const dx = (b.x - a.x) / segLen;
        const dy = (b.y - a.y) / segLen;
        const px = -dy;
        const py = dx;
        for (let d = 35; d < segLen; d += 65) {
          const cx = a.x + dx * d;
          const cy = a.y + dy * d;
          if (Math.hypot(cx - camera.x, cy - camera.y) > 380) continue;
          const poly = clipAndProjectPolygon3D(camera, [
            [cx + dx * 12, cy + dy * 12, 0.6],
            [cx - dx * 8 + px * 11, cy - dy * 8 + py * 11, 0.6],
            [cx - dx * 3, cy - dy * 3, 0.6],
            [cx - dx * 8 - px * 11, cy - dy * 8 - py * 11, 0.6],
          ]);
          if (poly) fillPolygon(ctx, poly, 'rgba(251, 191, 36, 0.65)');
        }
      }
    }

    // 6. Drift Tire Skid Marks on asphalt
    for (let i = 0; i < combat.skids.length; i += 1) {
      const sk = combat.skids[i];
      const pt = projectWorldToScreen(camera, sk.x, sk.y, 0.45);
      if (!pt || pt.depth > 340) continue;
      ctx.fillStyle = `rgba(15, 23, 42, ${sk.alpha})`;
      const r = Math.max(1.8, 3.5 * pt.scale);
      ctx.fillRect(pt.x - r, pt.y - r * 0.5, r * 2, r);
    }
  }

  function drawBuilding3D(camera, b) {
    const hw = b.w * 0.5;
    const hd = b.d * 0.5;
    const x1 = b.x - hw;
    const x2 = b.x + hw;
    const y1 = b.y - hd;
    const y2 = b.y + hd;
    const h = b.h;

    // Ground drop shadow
    drawQuad3D(camera, [x1 - 8, y1 - 8, 0.35], [x2 + 14, y1 - 8, 0.35], [x2 + 14, y2 + 14, 0.35], [x1 - 8, y2 + 14, 0.35], 'rgba(9, 13, 22, 0.42)');

    const faces = [];
    if (camera.x < x1) faces.push({ depth: Math.hypot(camera.x - x1, camera.y - b.y), pts: [[x1, y1, 0], [x1, y2, 0], [x1, y2, h], [x1, y1, h]], color: b.baseColor });
    if (camera.x > x2) faces.push({ depth: Math.hypot(camera.x - x2, camera.y - b.y), pts: [[x2, y2, 0], [x2, y1, 0], [x2, y1, h], [x2, y2, h]], color: b.baseColor });
    if (camera.y < y1) faces.push({ depth: Math.hypot(camera.x - b.x, camera.y - y1), pts: [[x2, y1, 0], [x1, y1, 0], [x1, y1, h], [x2, y1, h]], color: b.sideColor });
    if (camera.y > y2) faces.push({ depth: Math.hypot(camera.x - b.x, camera.y - y2), pts: [[x1, y2, 0], [x2, y2, 0], [x2, y2, h], [x1, y2, h]], color: b.sideColor });

    faces.sort((a, bFace) => bFace.depth - a.depth);

    for (let f = 0; f < faces.length; f += 1) {
      const face = faces[f];
      const [p0, p1, p2, p3] = face.pts;
      drawQuad3D(camera, p0, p1, p2, p3, face.color, 'rgba(15, 23, 42, 0.55)', 1.2);

      // Architectural glowing neon vertical trims
      const trimLeft1 = [p0[0] + (p1[0] - p0[0]) * 0.06, p0[1] + (p1[1] - p0[1]) * 0.06, 4];
      const trimLeft2 = [p0[0] + (p1[0] - p0[0]) * 0.1, p0[1] + (p1[1] - p0[1]) * 0.1, 4];
      drawQuad3D(camera, trimLeft1, trimLeft2, [trimLeft2[0], trimLeft2[1], h - 4], [trimLeft1[0], trimLeft1[1], h - 4], b.neonColor);

      // Lit 3D window bands on nearby buildings
      if (face.depth < 420) {
        const rows = Math.min(7, b.windowRows);
        for (let r = 1; r < rows; r += 1) {
          const zBot = (r / rows) * (h - 14) + 6;
          const zTop = zBot + Math.min(8, (h / rows) * 0.48);
          const wx0 = p0[0] + (p1[0] - p0[0]) * 0.16;
          const wy0 = p0[1] + (p1[1] - p0[1]) * 0.16;
          const wx1 = p0[0] + (p1[0] - p0[0]) * 0.84;
          const wy1 = p0[1] + (p1[1] - p0[1]) * 0.84;
          const winCol = (r + f) % 2 === 0 ? 'rgba(254, 240, 138, 0.72)' : 'rgba(56, 189, 248, 0.52)';
          drawQuad3D(camera, [wx0, wy0, zBot], [wx1, wy1, zBot], [wx1, wy1, zTop], [wx0, wy0, zTop], winCol);
        }
      }

      // 3D Neon Facade Signboard with Building Name
      if (b.name && face.depth < 440) {
        const signCx = (p0[0] + p1[0]) * 0.5;
        const signCy = (p0[1] + p1[1]) * 0.5;
        const signProj = projectWorldToScreen(camera, signCx, signCy, Math.min(h - 10, 62));
        if (signProj && signProj.scale > 1.35) {
          const fontSize = Math.max(10, Math.min(20, Math.round(11 * signProj.scale)));
          ctx.save();
          ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
          const textW = ctx.measureText(b.name).width + 14;
          const textH = fontSize + 8;
          ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
          ctx.fillRect(signProj.x - textW * 0.5, signProj.y - textH * 0.5, textW, textH);
          ctx.strokeStyle = b.neonColor;
          ctx.lineWidth = 1.6;
          ctx.strokeRect(signProj.x - textW * 0.5, signProj.y - textH * 0.5, textW, textH);
          ctx.fillStyle = b.neonColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.name, signProj.x, signProj.y);
          ctx.restore();
        }
      }
    }

    // Roof quad (when camera is higher than roof)
    if (camera.z > h) {
      drawQuad3D(camera, [x1, y1, h], [x2, y1, h], [x2, y2, h], [x1, y2, h], b.roofColor, b.neonColor, 1.4);
    }
  }

  function drawBox3D(camera, cx, cy, z0, z1, halfL, halfW, angle, colors) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const corner = (fl, fw, z) => [cx + fl * cos - fw * sin, cy + fl * sin + fw * cos, z];
    const [flB, frB, rrB, rlB] = [corner(halfL, -halfW, z0), corner(halfL, halfW, z0), corner(-halfL, halfW, z0), corner(-halfL, -halfW, z0)];
    const [flT, frT, rrT, rlT] = [corner(halfL, -halfW, z1), corner(halfL, halfW, z1), corner(-halfL, halfW, z1), corner(-halfL, -halfW, z1)];
    const faces = [
      { pts: [flB, frB, frT, flT], col: colors.front },
      { pts: [rrB, rlB, rlT, rrT], col: colors.rear },
      { pts: [rlB, flB, flT, rlT], col: colors.left },
      { pts: [frB, rrB, rrT, frT], col: colors.right },
    ];
    for (let i = 0; i < faces.length; i += 1) {
      const f = faces[i];
      f.depth = Math.hypot(camera.x - (f.pts[0][0] + f.pts[1][0]) * 0.5, camera.y - (f.pts[0][1] + f.pts[1][1]) * 0.5);
    }
    faces.sort((a, b) => b.depth - a.depth);
    for (let i = 0; i < faces.length; i += 1) {
      drawQuad3D(camera, faces[i].pts[0], faces[i].pts[1], faces[i].pts[2], faces[i].pts[3], faces[i].col, 'rgba(15, 23, 42, 0.55)', 1);
    }
    drawQuad3D(camera, flT, frT, rrT, rlT, colors.top, 'rgba(255, 255, 255, 0.25)', 1);
  }

  function drawVehicle3D(state, v) {
    const { camera, elapsed, player } = state;
    const spec = v.spec;
    const halfL = spec.length * 0.5;
    const halfW = spec.width * 0.5;
    const cos = Math.cos(v.angle);
    const sin = Math.sin(v.angle);
    const pt = (fl, fw, z) => [v.x + fl * cos - fw * sin, v.y + fl * sin + fw * cos, z];

    // 1. Ground shadow
    drawQuad3D(camera, pt(halfL + 3, -halfW - 3, 0.45), pt(halfL + 3, halfW + 3, 0.45), pt(-halfL - 3, halfW + 3, 0.45), pt(-halfL - 3, -halfW - 3, 0.45), 'rgba(6, 9, 18, 0.58)');

    // 2. Headlight beam cone on asphalt
    if (!v.destroyed) {
      drawQuad3D(camera, pt(halfL, -halfW * 0.7, 0.5), pt(halfL, halfW * 0.7, 0.5), pt(halfL + 68, halfW * 2.3, 0.5), pt(halfL + 68, -halfW * 2.3, 0.5), 'rgba(254, 240, 138, 0.15)');
    }

    // 3. Four 3D wheels
    const wheelOffsets = [[halfL * 0.62, -halfW * 0.95], [halfL * 0.62, halfW * 0.95], [-halfL * 0.62, -halfW * 0.95], [-halfL * 0.62, halfW * 0.95]];
    for (let w = 0; w < wheelOffsets.length; w += 1) {
      const [wl, ww] = wheelOffsets[w];
      drawBox3D(camera, v.x + wl * cos - ww * sin, v.y + wl * sin + ww * cos, 0.5, 4.8, 4.2, 2.2, v.angle, {
        front: '#090d16', rear: '#090d16', left: '#1e293b', right: '#1e293b', top: '#0f172a',
      });
    }

    // 4. Lower Chassis 3D Box
    const bodyTopZ = spec.heavy ? 12 : 7.8;
    drawBox3D(camera, v.x, v.y, 2.2, bodyTopZ, halfL, halfW, v.angle, {
      front: v.bodyColor, rear: v.bodyColor, left: v.bodyColor, right: v.bodyColor, top: v.accentColor,
    });

    // Racing stripe on hood/roof
    drawQuad3D(camera, pt(halfL * 0.95, -halfW * 0.25, bodyTopZ + 0.15), pt(halfL * 0.95, halfW * 0.25, bodyTopZ + 0.15), pt(-halfL * 0.95, halfW * 0.25, bodyTopZ + 0.15), pt(-halfL * 0.95, -halfW * 0.25, bodyTopZ + 0.15), v.bodyColor);

    // 5. Upper Cabin / Greenhouse
    if (!spec.convertible) {
      drawBox3D(camera, v.x - cos * (halfL * 0.08), v.y - sin * (halfL * 0.08), bodyTopZ, spec.height, halfL * (spec.heavy ? 0.82 : 0.54), halfW * 0.84, v.angle, {
        front: '#38bdf8', rear: '#0284c7', left: spec.cabinColor, right: spec.cabinColor, top: v.bodyColor,
      });
    } else {
      drawQuad3D(camera, pt(halfL * 0.35, -halfW * 0.8, bodyTopZ), pt(halfL * 0.35, halfW * 0.8, bodyTopZ), pt(halfL * 0.15, halfW * 0.76, spec.height), pt(halfL * 0.15, -halfW * 0.76, spec.height), 'rgba(56, 189, 248, 0.78)', '#f8fafc', 1.2);
    }

    // 6. Rear Spoiler Wing on Exotic Supercars
    if (spec.spoiler) {
      drawQuad3D(camera, pt(-halfL * 0.85, -halfW * 0.92, bodyTopZ + 3.2), pt(-halfL * 0.85, halfW * 0.92, bodyTopZ + 3.2), pt(-halfL * 1.02, halfW * 0.92, bodyTopZ + 3.8), pt(-halfL * 1.02, -halfW * 0.92, bodyTopZ + 3.8), '#090d16', v.accentColor, 1.2);
    }

    // 7. Glowing Taillights & Headlights
    const tailLeft = projectWorldToScreen(camera, ...pt(-halfL, -halfW * 0.65, 5.2));
    const tailRight = projectWorldToScreen(camera, ...pt(-halfL, halfW * 0.65, 5.2));
    const brakeRadius = v.braking || v.drifting ? 4.5 : 3;
    for (const tl of [tailLeft, tailRight]) {
      if (tl) {
        ctx.fillStyle = v.braking || v.drifting ? '#ff1e42' : '#dc2626';
        ctx.beginPath();
        ctx.arc(tl.x, tl.y, Math.max(2.2, brakeRadius * tl.scale * 0.45), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 8. Nitro Boost Twin Exhaust Flames
    if (v.boosting) {
      for (const side of [-halfW * 0.45, halfW * 0.45]) {
        drawQuad3D(camera, pt(-halfL, side - 2.2, 3.5), pt(-halfL, side + 2.2, 3.5), pt(-halfL - 18, side + 0.5, 4.2), pt(-halfL - 18, side - 0.5, 4.2), '#38bdf8');
        drawQuad3D(camera, pt(-halfL, side - 1.2, 3.6), pt(-halfL, side + 1.2, 3.6), pt(-halfL - 11, side, 4.0), pt(-halfL - 11, side, 4.0), '#fde047');
      }
    }

    // 9. SMPD Police Red & Blue Strobe Lightbar
    if (spec.police && !v.destroyed) {
      const redBright = Math.sin(elapsed * 16 + v.id) >= 0;
      const leftBar = projectWorldToScreen(camera, ...pt(0, -halfW * 0.48, spec.height + 1.8));
      const rightBar = projectWorldToScreen(camera, ...pt(0, halfW * 0.48, spec.height + 1.8));

      if (leftBar) {
        const r = Math.max(5, 11 * leftBar.scale * 0.45);
        ctx.fillStyle = redBright ? 'rgba(239, 68, 68, 0.45)' : 'rgba(59, 130, 246, 0.25)';
        ctx.beginPath();
        ctx.arc(leftBar.x, leftBar.y, r * 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = redBright ? '#ef4444' : '#3b82f6';
        ctx.beginPath();
        ctx.arc(leftBar.x, leftBar.y, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      if (rightBar) {
        const r = Math.max(5, 11 * rightBar.scale * 0.45);
        ctx.fillStyle = !redBright ? 'rgba(59, 130, 246, 0.45)' : 'rgba(239, 68, 68, 0.25)';
        ctx.beginPath();
        ctx.arc(rightBar.x, rightBar.y, r * 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = !redBright ? '#3b82f6' : '#ef4444';
        ctx.beginPath();
        ctx.arc(rightBar.x, rightBar.y, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 10. Floating Carjack Prompt or Police Unit Tag in 3D space
    const distToPlayer = Math.hypot(v.x - player.x, v.y - player.y);
    if (!player.vehicle && !v.destroyed && distToPlayer < 65) {
      const tagPt = projectWorldToScreen(camera, v.x, v.y, spec.height + 9);
      if (tagPt) {
        const tag = `[PRESS E] STEAL ${spec.name.toUpperCase()}`;
        ctx.save();
        ctx.font = 'bold 12px system-ui, sans-serif';
        const tw = ctx.measureText(tag).width + 16;
        ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
        ctx.fillRect(tagPt.x - tw * 0.5, tagPt.y - 12, tw, 22);
        ctx.strokeStyle = '#fbbf24';
        ctx.strokeRect(tagPt.x - tw * 0.5, tagPt.y - 12, tw, 22);
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.fillText(tag, tagPt.x, tagPt.y + 3);
        ctx.restore();
      }
    }
  }

  function drawCharacter3D(state, person, isPlayer = false) {
    const { camera } = state;
    const footPt = projectWorldToScreen(camera, person.x, person.y, 0);
    const headPt = projectWorldToScreen(camera, person.x, person.y, 17);
    if (!footPt || !headPt) return;

    const s = Math.min(5.2, footPt.scale * 0.48);
    const stride = Math.sin(person.walkPhase || 0) * 3.2 * s;
    const bodyW = Math.max(4, 5.6 * s);

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    ctx.ellipse(footPt.x, footPt.y, bodyW * 1.15, Math.max(2, bodyW * 0.45), 0, 0, Math.PI * 2);
    ctx.fill();

    const hipY = footPt.y - 7.5 * s;
    const shoulderY = footPt.y - 14.5 * s;

    // Animated legs
    ctx.strokeStyle = isPlayer ? '#1e293b' : person.pantsColor;
    ctx.lineWidth = Math.max(2, 2.5 * s);
    ctx.beginPath();
    ctx.moveTo(footPt.x - bodyW * 0.28, hipY);
    ctx.lineTo(footPt.x - bodyW * 0.35 + stride * 0.35, footPt.y);
    ctx.moveTo(footPt.x + bodyW * 0.28, hipY);
    ctx.lineTo(footPt.x + bodyW * 0.35 - stride * 0.35, footPt.y);
    ctx.stroke();

    // Torso / Jacket
    ctx.fillStyle = isPlayer ? '#ff5d8f' : person.shirtColor;
    ctx.fillRect(footPt.x - bodyW * 0.55, shoulderY, bodyW * 1.1, hipY - shoulderY + 1);

    // Tactical vest stripe for player / police / syndicate
    if (isPlayer || person.role === 'police' || person.role === 'syndicate') {
      ctx.fillStyle = isPlayer ? '#00f5d4' : person.role === 'police' ? '#38bdf8' : '#fbbf24';
      ctx.fillRect(footPt.x - bodyW * 0.35, shoulderY + 2 * s, bodyW * 0.7, 2.2 * s);
    }

    // Head & Hair
    const headCy = shoulderY - 2.8 * s;
    const headR = Math.max(2.6, 3.1 * s);
    ctx.fillStyle = isPlayer ? '#f1c27d' : person.skinColor;
    ctx.beginPath();
    ctx.arc(footPt.x, headCy, headR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isPlayer ? '#1e1b4b' : person.hairColor;
    ctx.beginPath();
    ctx.arc(footPt.x, headCy - headR * 0.2, headR * 0.96, Math.PI, Math.PI * 2);
    ctx.fill();

    // Armed weapon & crisp star muzzle flash in 3D
    if (isPlayer || person.armed) {
      const aimOffsetX = Math.cos(person.angle - camera.yaw - Math.PI * 0.5);
      const handX = footPt.x + bodyW * 0.45;
      const handY = shoulderY + 2.2 * s;
      const muzzleX = handX + (aimOffsetX * 3.2 + 2.2) * s;
      const muzzleY = handY - 1.8 * s;

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(2, 2.2 * s);
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.lineTo(muzzleX, muzzleY);
      ctx.stroke();

      if ((isPlayer && person.muzzleFlash > 0) || (!isPlayer && person.fireCooldown > 0.64)) {
        const flashR = Math.min(11, Math.max(4, 2.1 * s));
        ctx.fillStyle = 'rgba(251, 146, 60, 0.6)';
        ctx.beginPath();
        ctx.arc(muzzleX, muzzleY, flashR * 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(muzzleX, muzzleY, flashR * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Overhead health bar & role badge on hostile syndicate / police
    if (!isPlayer && (person.role === 'syndicate' || person.role === 'police') && footPt.depth < 280) {
      const bw = 34;
      const barY = headCy - headR - 10;
      ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
      ctx.fillRect(footPt.x - bw * 0.5, barY, bw, 5);
      ctx.fillStyle = person.role === 'syndicate' ? '#f43f5e' : '#38bdf8';
      ctx.fillRect(footPt.x - bw * 0.5, barY, bw * Math.max(0, person.health / person.maxHealth), 5);
    }
  }

  function drawPalmTree3D(camera, tree) {
    const basePt = projectWorldToScreen(camera, tree.x, tree.y, 0);
    const topPt = projectWorldToScreen(camera, tree.x + tree.lean * 18, tree.y, tree.height);
    if (!basePt || !topPt) return;

    // Trunk
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = Math.max(2, 4.2 * basePt.scale);
    ctx.beginPath();
    ctx.moveTo(basePt.x, basePt.y);
    ctx.quadraticCurveTo((basePt.x + topPt.x) * 0.5 + 4 * basePt.scale, (basePt.y + topPt.y) * 0.5, topPt.x, topPt.y);
    ctx.stroke();

    // Tropical palm fronds
    const frondLen = Math.max(7, 17 * topPt.scale);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = Math.max(1.5, 2.6 * topPt.scale);
    for (let f = 0; f < 7; f += 1) {
      const ang = -Math.PI + (f / 6) * Math.PI * 1.3;
      const fx = topPt.x + Math.cos(ang) * frondLen;
      const fy = topPt.y + Math.sin(ang) * frondLen * 0.65 + 4 * topPt.scale;
      ctx.beginPath();
      ctx.moveTo(topPt.x, topPt.y);
      ctx.quadraticCurveTo((topPt.x + fx) * 0.5, topPt.y - 5 * topPt.scale, fx, fy);
      ctx.stroke();
    }
  }

  function drawMissionBeacon3D(state) {
    const { camera, missions, elapsed } = state;
    const wx = missions.state.waypointX;
    const wy = missions.state.waypointY;
    const base = projectWorldToScreen(camera, wx, wy, 0.5);
    const top = projectWorldToScreen(camera, wx, wy, 52);
    if (!base || !top) return;

    const r = Math.min(36, Math.max(10, 14 * base.scale));
    const pulse = 0.75 + Math.sin(elapsed * 5) * 0.25;
    const color = missions.state.stage === 'escape' ? '244, 63, 94' : '0, 245, 212';

    const grad = ctx.createLinearGradient(base.x, top.y, base.x, base.y);
    grad.addColorStop(0, `rgba(${color}, 0)`);
    grad.addColorStop(0.5, `rgba(${color}, ${0.18 * pulse})`);
    grad.addColorStop(1, `rgba(${color}, ${0.52 * pulse})`);

    ctx.fillStyle = grad;
    ctx.fillRect(base.x - r, top.y, r * 2, base.y - top.y);

    ctx.strokeStyle = `rgba(${color}, 0.95)`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(base.x, base.y, r, r * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Floating 3D waypoint distance tag
    const dist = Math.round(Math.hypot(wx - state.player.x, wy - state.player.y));
    ctx.save();
    ctx.font = 'bold 11.5px system-ui, sans-serif';
    const label = `★ WAYPOINT BEACON [${dist}m]`;
    const tw = ctx.measureText(label).width + 14;
    ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
    ctx.fillRect(top.x - tw * 0.5, top.y - 14, tw, 20);
    ctx.strokeStyle = '#fbbf24';
    ctx.strokeRect(top.x - tw * 0.5, top.y - 14, tw, 20);
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.fillText(label, top.x, top.y);
    ctx.restore();
  }

  function drawScene3D(state) {
    const { camera, city, vehicles, pedestrians, player, combat, police, elapsed } = state;
    const drawables = [];

    for (let i = 0; i < city.buildings.length; i += 1) {
      const b = city.buildings[i];
      const c = worldToCameraSpace(camera, b.x, b.y, b.h * 0.3);
      if (c.cz >= -b.d && c.cz <= FAR_CLIP) drawables.push({ kind: 'building', depth: c.cz + 25, item: b });
    }
    for (let i = 0; i < city.yachts.length; i += 1) {
      const y = city.yachts[i];
      const c = worldToCameraSpace(camera, y.x, y.y, 4);
      if (c.cz >= NEAR_CLIP && c.cz <= FAR_CLIP) drawables.push({ kind: 'yacht', depth: c.cz, item: y });
    }
    for (let i = 0; i < city.palmTrees.length; i += 1) {
      const t = city.palmTrees[i];
      const c = worldToCameraSpace(camera, t.x, t.y, 12);
      if (c.cz >= NEAR_CLIP && c.cz <= 460) drawables.push({ kind: 'palm', depth: c.cz, item: t });
    }
    for (let i = 0; i < vehicles.length; i += 1) {
      const v = vehicles[i];
      const c = worldToCameraSpace(camera, v.x, v.y, 7);
      if (c.cz >= NEAR_CLIP && c.cz <= 520) drawables.push({ kind: 'vehicle', depth: c.cz, item: v });
    }
    for (let i = 0; i < pedestrians.length; i += 1) {
      const p = pedestrians[i];
      if (!p.alive) continue;
      const c = worldToCameraSpace(camera, p.x, p.y, 9);
      if (c.cz >= NEAR_CLIP && c.cz <= 380) drawables.push({ kind: 'ped', depth: c.cz, item: p });
    }
    if (!player.vehicle) {
      const c = worldToCameraSpace(camera, player.x, player.y, 9);
      if (c.cz >= NEAR_CLIP) drawables.push({ kind: 'player', depth: c.cz, item: player });
    }

    // 7. Pickups
    for (let i = 0; i < combat.pickups.length; i += 1) {
      const pk = combat.pickups[i];
      if (!pk.active) continue;
      const c = worldToCameraSpace(camera, pk.x, pk.y, 6);
      if (c.cz < NEAR_CLIP || c.cz > 380) continue;
      drawables.push({ kind: 'pickup', depth: c.cz, item: pk });
    }

    drawables.sort((a, b) => b.depth - a.depth);

    for (let i = 0; i < drawables.length; i += 1) {
      const d = drawables[i];
      if (d.kind === 'building') {
        drawBuilding3D(camera, d.item);
      } else if (d.kind === 'vehicle') {
        drawVehicle3D(state, d.item);
      } else if (d.kind === 'ped') {
        drawCharacter3D(state, d.item, false);
      } else if (d.kind === 'player') {
        drawCharacter3D(state, d.item, true);
      } else if (d.kind === 'palm') {
        drawPalmTree3D(camera, d.item);
      } else if (d.kind === 'yacht') {
        drawBox3D(camera, d.item.x, d.item.y, 0, 8, d.item.length * 0.5, d.item.width * 0.5, Math.PI * 0.5, {
          front: d.item.hullColor,
          rear: d.item.hullColor,
          left: d.item.hullColor,
          right: d.item.hullColor,
          top: d.item.trimColor,
        });
      } else if (d.kind === 'pickup') {
        const col = d.item.kind === 'cash' ? '#22c55e' : d.item.kind === 'armor' ? '#38bdf8' : '#f43f5e';
        drawBox3D(camera, d.item.x, d.item.y, 1.5, 5.5, 4.5, 3.2, elapsed * 2, {
          front: col,
          rear: col,
          left: '#0f172a',
          right: '#0f172a',
          top: '#fde047',
        });
      }
    }

    // Mission Beacon Cylinder
    drawMissionBeacon3D(state);

    // Ballistic Bullet Tracers
    for (let i = 0; i < combat.projectiles.length; i += 1) {
      const b = combat.projectiles[i];
      const head = projectWorldToScreen(camera, b.x, b.y, b.z);
      const tail = projectWorldToScreen(camera, b.x - b.vx * 0.04, b.y - b.vy * 0.04, b.z);
      if (head && tail) {
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.lineTo(head.x, head.y);
        ctx.stroke();
      }
    }

    // 3D Particles & Explosions
    for (let i = 0; i < combat.particles.length; i += 1) {
      const pt = combat.particles[i];
      const scr = projectWorldToScreen(camera, pt.x, pt.y, pt.z);
      if (!scr) continue;
      ctx.save();
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      const pr = Math.min(18, Math.max(2, pt.size * scr.scale * 0.22));
      ctx.arc(scr.x, scr.y, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Police Helicopter Searchlight Cone at 3+ Wanted Stars
    if (police.stars >= 3) {
      const spotPt = projectWorldToScreen(camera, police.state.heliX, police.state.heliY, 0.5);
      if (spotPt) {
        const coneGrad = ctx.createLinearGradient(FIELD.width * 0.65, 0, spotPt.x, spotPt.y);
        coneGrad.addColorStop(0, 'rgba(224, 242, 254, 0.04)');
        coneGrad.addColorStop(1, 'rgba(224, 242, 254, 0.24)');
        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(FIELD.width * 0.62, 0);
        ctx.lineTo(FIELD.width * 0.7, 0);
        ctx.lineTo(spotPt.x + 85, spotPt.y);
        ctx.lineTo(spotPt.x - 85, spotPt.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(224, 242, 254, 0.25)';
        ctx.beginPath();
        ctx.ellipse(spotPt.x, spotPt.y, 85, 36, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Floating 3D Combat & Cash Popups
    for (let i = 0; i < combat.popups.length; i += 1) {
      const pop = combat.popups[i];
      const scr = projectWorldToScreen(camera, pop.x, pop.y, pop.z);
      if (!scr) continue;
      ctx.save();
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#090d16';
      ctx.fillText(pop.label, scr.x + 1.5, scr.y + 1.5);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.label, scr.x, scr.y);
      ctx.restore();
    }
  }

  function draw(state, screen, bestScore) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#080a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, FIELD.width, FIELD.height);
    ctx.clip();

    drawSkyAndHorizon(state);
    drawGroundAndRoads(state);
    drawScene3D(state);
    hud.drawHud(state, screen, bestScore);

    ctx.restore();
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
