// Multi-stage Story Campaign & Open-World Side Contracts for Solaris Bay: Heatwave.
// Manages mission waypoints, GPS route calculation, syndicate guard ambushes, heist progress,
// and character comms dialogue subtitles.

import { computeGpsPath } from './city.js';
import { STORY_MISSIONS } from './config.js';
import { createPedestrian } from './pedestrians.js';
import { saveGameProgress } from './save.js';

export function createMissionSystem(city) {
  const state = {
    currentIndex: 0,
    stage: 'to_start', // 'to_start' | 'action' | 'escape' | 'complete'
    progress: 0,
    waypointX: STORY_MISSIONS[0].startX,
    waypointY: STORY_MISSIONS[0].startY,
    waypointLabel: 'START MISSION: SUNSET BOOST',
    objectiveText: 'Reach the glowing mission beacon at Solaris Palms Hotel on Ocean Drive.',
    gpsRoute: [],
    commsSpeaker: 'MARCUS "DOC" VANCE',
    commsRole: 'FIXER // ENCRYPTED COMMS',
    commsLine: STORY_MISSIONS[0].dialogueStart,
    commsColor: '#38bdf8',
    commsTimer: 8,
    bannerFlash: 0,
    completedCount: 0,
  };

  function setComms(speaker, role, line, color = '#38bdf8', duration = 7.5) {
    state.commsSpeaker = speaker;
    state.commsRole = role;
    state.commsLine = line;
    state.commsColor = color;
    state.commsTimer = duration;
  }

  function currentMission() {
    return STORY_MISSIONS[state.currentIndex % STORY_MISSIONS.length];
  }

  function refreshWaypoint(player, targetX, targetY, label, objective) {
    state.waypointX = targetX;
    state.waypointY = targetY;
    state.waypointLabel = label;
    state.objectiveText = objective;
    state.gpsRoute = computeGpsPath(city, player.x, player.y, targetX, targetY);
  }

  function setupMissionIntro(player) {
    const m = currentMission();
    state.stage = 'to_start';
    state.progress = 0;
    refreshWaypoint(
      player,
      m.startX,
      m.startY,
      m.title,
      m.briefing,
    );
    setComms(m.giver, `CHAPTER ${m.chapter} BRIEFING`, m.dialogueStart, '#38bdf8', 9);
  }

  function spawnMissionGuards(pedestrians, centerX, centerY, count = 4) {
    for (let i = 0; i < count; i += 1) {
      const ang = (i / count) * Math.PI * 2;
      const guard = createPedestrian(
        500 + i,
        centerX + Math.cos(ang) * 38,
        centerY + Math.sin(ang) * 38,
        'syndicate',
      );
      guard.missionTarget = true;
      guard.state = 'attack';
      pedestrians.push(guard);
    }
  }

  function activateMissionAction(player, pedestrians, police, combat, audio) {
    const m = currentMission();
    state.stage = 'action';
    state.progress = 0.25;
    state.bannerFlash = 1;

    if (m.id === 'vanguard_vault_heist' || m.id === 'cayo_harbor_ambush' || m.id === 'kestrel_tower_showdown') {
      spawnMissionGuards(pedestrians, m.targetX, m.targetY, 4);
    }
    if (m.id === 'vanguard_vault_heist') {
      police.setWantedStars(3);
    } else if (m.id === 'ocean_drive_boost') {
      police.setWantedStars(2);
    }

    refreshWaypoint(
      player,
      m.targetX,
      m.targetY,
      `OBJECTIVE: ${m.title}`,
      m.briefing,
    );
    setComms(m.giver, 'LIVE TACTICAL FEED', m.dialogueStart, '#fbbf24', 9);
    combat.spawnFloatingText(player.x, player.y, 26, `${m.title} STARTED!`, '#38bdf8');
    if (audio) audio.playSfx('mission');
  }

  function advanceToEscapeStage(player, police, combat, audio) {
    const m = currentMission();
    state.stage = 'escape';
    state.progress = 0.72;
    state.bannerFlash = 1;

    if (m.id === 'vanguard_vault_heist') {
      police.setWantedStars(4);
    } else if (m.id === 'kestrel_tower_showdown') {
      police.setWantedStars(5);
    } else if (police.stars < 2) {
      police.setWantedStars(2);
    }

    refreshWaypoint(
      player,
      m.escapeX,
      m.escapeY,
      'GETAWAY DROP ZONE',
      `Deliver the score to the drop zone at (${m.escapeX}, ${m.escapeY}) and evade SMPD units!`,
    );
    setComms(m.giver, 'GETAWAY ALERT', m.dialogueMid, '#f43f5e', 9);
    combat.spawnFloatingText(player.x, player.y, 28, 'OBJECTIVE SECURED! REACH GETAWAY ZONE!', '#fbbf24');
    if (audio) audio.playSfx('pickup');
  }

  function completeCurrentMission(worldState, combat, audio) {
    const m = currentMission();
    const player = worldState.player;
    player.cash += m.rewardCash;
    player.respect += m.rewardRespect;
    worldState.police.clearWanted();

    combat.spawnFloatingText(
      player.x,
      player.y,
      32,
      `MISSION PASSED! +$${m.rewardCash.toLocaleString()} // +${m.rewardRespect} RESPECT`,
      '#22c55e',
    );
    setComms(m.giver, 'MISSION COMPLETE', m.dialogueEnd, '#22c55e', 10);
    if (audio) audio.playSfx('mission');

    state.completedCount += 1;
    state.currentIndex = (state.currentIndex + 1) % STORY_MISSIONS.length;
    state.bannerFlash = 1;
    saveGameProgress(worldState);
    setupMissionIntro(player);
  }

  function update(worldState, dt) {
    const { player, pedestrians, police, combat, audio } = worldState;
    if (state.commsTimer > 0) state.commsTimer = Math.max(0, state.commsTimer - dt);
    if (state.bannerFlash > 0) state.bannerFlash = Math.max(0, state.bannerFlash - dt * 1.4);

    // Refresh GPS route periodically as player moves
    state.gpsRoute = computeGpsPath(city, player.x, player.y, state.waypointX, state.waypointY);

    const distToWaypoint = Math.hypot(player.x - state.waypointX, player.y - state.waypointY);

    if (state.stage === 'to_start' && distToWaypoint < 58) {
      activateMissionAction(player, pedestrians, police, combat, audio);
    } else if (state.stage === 'action') {
      if (distToWaypoint < 110) {
        state.progress = Math.min(0.95, state.progress + dt * 0.22);
      }
      if (distToWaypoint < 62) {
        advanceToEscapeStage(player, police, combat, audio);
      }
    } else if (state.stage === 'escape') {
      if (distToWaypoint < 68) {
        completeCurrentMission(worldState, combat, audio);
      }
    }
  }

  return {
    state,
    currentMission,
    setComms,
     refreshWaypoint,
    setupMissionIntro,
    activateMissionAction,
    advanceToEscapeStage,
    completeCurrentMission,
    update,
  };
}
