// Autonomous Solaris Bay traffic AI: lane alignment, intersection turning, obstacle braking,
// panic swerving near gunfights, and proximity recycling around the player.

import { findNearestRoadCoord } from './city.js';
import { WORLD } from './config.js';
import { updateVehiclePhysics } from './vehicles.js';

function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function updateTrafficAi(vehicles, player, city, combat, random, dt) {
  for (let i = 0; i < vehicles.length; i += 1) {
    const v = vehicles[i];
    if (v.driverType !== 'civilian' || v.destroyed || v === player.vehicle) continue;

    const distToPlayer = Math.hypot(v.x - player.x, v.y - player.y);

    // Recycle distant traffic vehicles back onto nearby active roads
    if (distToPlayer > 1100) {
      const roadX = city.roadsX[Math.floor(random() * city.roadsX.length)];
      const roadY = city.roadsY[Math.floor(random() * city.roadsY.length)];
      if (random() < 0.5) {
        v.x = roadX + (random() < 0.5 ? -18 : 18);
        v.y = Math.max(200, Math.min(WORLD.height - 200, player.y + (random() < 0.5 ? -460 : 460)));
        v.angle = v.x < roadX ? Math.PI * 0.5 : -Math.PI * 0.5;
      } else {
        v.x = Math.max(200, Math.min(WORLD.coastX - 100, player.x + (random() < 0.5 ? -460 : 460)));
        v.y = roadY + (random() < 0.5 ? 18 : -18);
        v.angle = v.y > roadY ? 0 : Math.PI;
      }
      v.health = v.maxHealth;
      continue;
    }

    if (v.aiTurnCooldown > 0) v.aiTurnCooldown = Math.max(0, v.aiTurnCooldown - dt);

    // Snap target heading to cardinal avenue/boulevard directions
    const cardinal = Math.round(v.angle / (Math.PI * 0.5)) * (Math.PI * 0.5);
    let desiredAngle = cardinal;

    const nearRx = findNearestRoadCoord(city.roadsX, v.x);
    const nearRy = findNearestRoadCoord(city.roadsY, v.y);
    const atIntersection = Math.abs(v.x - nearRx) < 32 && Math.abs(v.y - nearRy) < 32;

    if (atIntersection && v.aiTurnCooldown === 0 && random() < 0.25) {
      desiredAngle = cardinal + (random() < 0.5 ? Math.PI * 0.5 : -Math.PI * 0.5);
      v.aiTurnCooldown = 3.2;
    }

    // Keep within right-hand driving lane
    const fx = Math.cos(desiredAngle);
    const fy = Math.sin(desiredAngle);
    let laneCorrection = 0;
    if (Math.abs(fx) > 0.7) {
      const targetY = nearRy + (fx > 0 ? 18 : -18);
      laneCorrection = (targetY - v.y) * fx * 0.035;
    } else {
      const targetX = nearRx + (fy > 0 ? -18 : 18);
      laneCorrection = (v.x - targetX) * fy * 0.035;
    }

    const angleDiff = normalizeAngle(desiredAngle + Math.max(-0.35, Math.min(0.35, laneCorrection)) - v.angle);
    const steer = Math.max(-1, Math.min(1, angleDiff * 2.4));

    // Check for vehicle or player directly ahead in lane
    let obstacleAhead = false;
    const lookX = v.x + Math.cos(v.angle) * 58;
    const lookY = v.y + Math.sin(v.angle) * 58;

    if (Math.hypot(lookX - player.x, lookY - player.y) < 34) {
      obstacleAhead = true;
    } else {
      for (let j = 0; j < vehicles.length; j += 1) {
        if (i === j) continue;
        const other = vehicles[j];
        if (Math.hypot(lookX - other.x, lookY - other.y) < 36) {
          obstacleAhead = true;
          break;
        }
      }
    }

    const throttle = obstacleAhead ? -0.55 : 0.44;
    updateVehiclePhysics(v, { throttle, steer, handbrake: obstacleAhead, boost: false }, city, combat, dt);
  }
}
