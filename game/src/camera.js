// 3D third-person perspective camera: smooth vehicle chase & over-the-shoulder on-foot tracking,
// speed-based FOV zoom, impact shake, frustum near-plane polygon clipping, and ground raycasting.

import { FIELD } from './config.js';

export const NEAR_CLIP = 6;
export const FAR_CLIP = 780;

export function createCamera3D() {
  return {
    x: 1820,
    y: 960,
    z: 42,
    yaw: 0,
    pitch: 0.22,
    focal: 760,
    dist: 88,
    heightOffset: 40,
    shakeTime: 0,
    shakeMag: 0,
    horizonY: 190,
  };
}

function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function triggerCameraShake(camera, magnitude, duration = 0.28) {
  camera.shakeMag = Math.max(camera.shakeMag, magnitude);
  camera.shakeTime = Math.max(camera.shakeTime, duration);
}

export function updateCameraFollow(camera, player, activeVehicle, dt, instant = false) {
  let targetX = player.x;
  let targetY = player.y;
  let targetYaw = player.angle;
  let desiredDist = 74;
  let desiredHeight = 36;
  let desiredPitch = 0.22;
  let desiredFocal = 760;

  if (activeVehicle) {
    targetX = activeVehicle.x;
    targetY = activeVehicle.y;
    const speedRatio = Math.min(1, Math.hypot(activeVehicle.vx, activeVehicle.vy) / 290);
    targetYaw = activeVehicle.angle + activeVehicle.angularVel * 0.09;
    desiredDist = 92 + speedRatio * 24 + (activeVehicle.boosting ? 12 : 0);
    desiredHeight = 40 + speedRatio * 8;
    desiredPitch = 0.21 + speedRatio * 0.02;
    desiredFocal = 760 - speedRatio * 45;
  } else {
    desiredDist = 68;
    desiredHeight = 34;
    desiredPitch = 0.23;
    desiredFocal = 780;
  }

  if (instant) {
    camera.yaw = targetYaw;
    camera.dist = desiredDist;
    camera.heightOffset = desiredHeight;
    camera.pitch = desiredPitch;
    camera.focal = desiredFocal;
  } else {
    const yawDiff = normalizeAngle(targetYaw - camera.yaw);
    const yawLerp = activeVehicle ? Math.min(1, dt * 6.5) : Math.min(1, dt * 9.5);
    camera.yaw = normalizeAngle(camera.yaw + yawDiff * yawLerp);
    const smooth = Math.min(1, dt * 8);
    camera.dist += (desiredDist - camera.dist) * smooth;
    camera.heightOffset += (desiredHeight - camera.heightOffset) * smooth;
    camera.pitch += (desiredPitch - camera.pitch) * smooth;
    camera.focal += (desiredFocal - camera.focal) * smooth;
  }

  const desiredX = targetX - Math.cos(camera.yaw) * camera.dist;
  const desiredY = targetY - Math.sin(camera.yaw) * camera.dist;

  if (instant) {
    camera.x = desiredX;
    camera.y = desiredY;
    camera.z = camera.heightOffset;
  } else {
    const posLerp = Math.min(1, dt * 14);
    camera.x += (desiredX - camera.x) * posLerp;
    camera.y += (desiredY - camera.y) * posLerp;
    camera.z += (camera.heightOffset - camera.z) * posLerp;
  }

  if (camera.shakeTime > 0) {
    camera.shakeTime = Math.max(0, camera.shakeTime - dt);
    const phase = camera.shakeTime * 48;
    camera.x += Math.sin(phase) * camera.shakeMag * 0.4;
    camera.y += Math.cos(phase * 1.3) * camera.shakeMag * 0.4;
    camera.z += Math.sin(phase * 1.7) * camera.shakeMag * 0.25;
    if (camera.shakeTime === 0) camera.shakeMag = 0;
  }

  camera.horizonY = FIELD.height * 0.5 - Math.tan(camera.pitch) * camera.focal;
}

export function worldToCameraSpace(camera, wx, wy, wz) {
  const dx = wx - camera.x;
  const dy = wy - camera.y;
  const dz = wz - camera.z;
  const cosY = Math.cos(camera.yaw);
  const sinY = Math.sin(camera.yaw);
  const forwardH = dx * cosY + dy * sinY;
  const right = -dx * sinY + dy * cosY;
  const cosP = Math.cos(camera.pitch);
  const sinP = Math.sin(camera.pitch);
  const cz = forwardH * cosP - dz * sinP;
  const cy = dz * cosP + forwardH * sinP;
  return { cx: right, cy, cz, forwardH };
}

export function projectWorldToScreen(camera, wx, wy, wz = 0) {
  const { cx, cy, cz } = worldToCameraSpace(camera, wx, wy, wz);
  if (cz < NEAR_CLIP) return null;
  const scale = camera.focal / cz;
  return {
    x: FIELD.width * 0.5 + cx * scale,
    y: FIELD.height * 0.5 - cy * scale,
    scale,
    depth: cz,
  };
}

export function clipAndProjectPolygon3D(camera, points3D) {
  const camPts = [];
  for (let i = 0; i < points3D.length; i += 1) {
    const p = points3D[i];
    camPts.push(worldToCameraSpace(camera, p[0], p[1], p[2] || 0));
  }

  const clipped = [];
  for (let i = 0; i < camPts.length; i += 1) {
    const curr = camPts[i];
    const next = camPts[(i + 1) % camPts.length];
    const currIn = curr.cz >= NEAR_CLIP;
    const nextIn = next.cz >= NEAR_CLIP;

    if (currIn && nextIn) {
      clipped.push(next);
    } else if (currIn && !nextIn) {
      const t = (NEAR_CLIP - curr.cz) / (next.cz - curr.cz);
      clipped.push({
        cx: curr.cx + (next.cx - curr.cx) * t,
        cy: curr.cy + (next.cy - curr.cy) * t,
        cz: NEAR_CLIP,
      });
    } else if (!currIn && nextIn) {
      const t = (NEAR_CLIP - curr.cz) / (next.cz - curr.cz);
      clipped.push({
        cx: curr.cx + (next.cx - curr.cx) * t,
        cy: curr.cy + (next.cy - curr.cy) * t,
        cz: NEAR_CLIP,
      });
      clipped.push(next);
    }
  }

  if (clipped.length < 3) return null;

  const screenPts = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < clipped.length; i += 1) {
    const c = clipped[i];
    const scale = camera.focal / c.cz;
    const sx = FIELD.width * 0.5 + c.cx * scale;
    const sy = FIELD.height * 0.5 - c.cy * scale;
    if (sx < minX) minX = sx;
    if (sx > maxX) maxX = sx;
    if (sy < minY) minY = sy;
    if (sy > maxY) maxY = sy;
    screenPts.push([sx, sy]);
  }

  if (maxX < -80 || minX > FIELD.width + 80 || maxY < -80 || minY > FIELD.height + 80) {
    return null;
  }

  return screenPts;
}

export function screenToWorldGround(camera, screenX, screenY, fallbackDist = 140) {
  const ndcX = (screenX - FIELD.width * 0.5) / camera.focal;
  const ndcY = (FIELD.height * 0.5 - screenY) / camera.focal;
  const cosP = Math.cos(camera.pitch);
  const sinP = Math.sin(camera.pitch);
  const dirForward = cosP + ndcY * sinP;
  const dirRight = ndcX;
  const dirUp = ndcY * cosP - sinP;

  let t = fallbackDist;
  if (dirUp < -0.02) {
    t = Math.min(360, Math.max(18, -camera.z / dirUp));
  }

  const forwardH = dirForward * t;
  const right = dirRight * t;
  const cosY = Math.cos(camera.yaw);
  const sinY = Math.sin(camera.yaw);
  return {
    x: camera.x + forwardH * cosY - right * sinY,
    y: camera.y + forwardH * sinY + right * cosY,
  };
}
