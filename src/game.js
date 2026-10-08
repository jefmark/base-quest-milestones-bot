const MAX_STAGE = 12;

function clampStage(stage) {
  const n = Number(stage) || 1;
  return Math.min(MAX_STAGE, Math.max(1, Math.floor(n)));
}

export const STAGE_CONFIG = [
  { milestone: 1, name: 'Rookie Runner', score: 1200, minPlaySeconds: 20, speed: 5.4 },
  { milestone: 2, name: 'Chain Jumper', score: 2600, minPlaySeconds: 35, speed: 6.2 },
  { milestone: 3, name: 'Base Sprinter', score: 4500, minPlaySeconds: 50, speed: 7.0 },
  { milestone: 4, name: 'Gasless Ghost', score: 7000, minPlaySeconds: 70, speed: 7.8 },
  { milestone: 5, name: 'Block Master', score: 10000, minPlaySeconds: 90, speed: 8.6 },
  { milestone: 6, name: 'Onchain Legend', score: 13500, minPlaySeconds: 110, speed: 9.4 },
  { milestone: 7, name: 'Quest Hunter', score: 18000, minPlaySeconds: 140, speed: 10.2 },
  { milestone: 8, name: 'Base Champion', score: 23000, minPlaySeconds: 170, speed: 11.0 },
  { milestone: 9, name: 'Chain Warrior', score: 30000, minPlaySeconds: 210, speed: 11.8 },
  { milestone: 10, name: 'Protocol Hero', score: 38000, minPlaySeconds: 260, speed: 12.6 },
  { milestone: 11, name: 'Elite Player', score: 48000, minPlaySeconds: 320, speed: 13.4 },
  { milestone: 12, name: 'Genesis Legend', score: 60000, minPlaySeconds: 400, speed: 14.2 },
];

export const PENALTY_CONFIG = [
  { label: '0-20s', until: 20, penalty: 100 },
  { label: '20-45s', until: 45, penalty: 250 },
  { label: '45-70s', until: 70, penalty: 500 },
  { label: '70-95s', until: 95, penalty: 850 },
  { label: '95-125s', until: 125, penalty: 1300 },
  { label: '125-160s', until: 160, penalty: 2000 },
  { label: '160s+', until: Number.POSITIVE_INFINITY, penalty: 3000 },
];

const SCORE_RATE_MULTIPLIER = 0.25;
const OBSTACLE_PASS_SCORE = 15;
const ORB_SCORE = 35;
const STORAGE_KEY = 'baseQuestBest';
const SOUND_KEY = 'baseQuestSound';

const ANTI_CHEAT_CONFIG = {
  requireGameOverBeforeMint: true,
  invalidateOnTabHidden: true,
  maxFrameGapMs: 1800,
  maxWallPerformanceDriftMs: 3000,
  maxScorePerSecond: 540,
  maxJumpInputsPerSecond: 20,
  maxMintRunSeconds: 900,
  maxLedgerDifference: 3,
};

const safeRandom = (min, max) => Math.random() * (max - min) + min;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));


function normalizeVerifiedSession(value) {
  if (!value || !value.active) return null;
  const nonce = Math.floor(Number(value.nonce));
  const milestone = Math.floor(Number(value.milestone));
  const startedAt = Math.floor(Number(value.startedAt));
  const challenge = String(value.challenge || '');
  if (!Number.isFinite(nonce) || nonce < 1) return null;
  if (!Number.isFinite(milestone) || milestone < 1 || milestone > MAX_STAGE) return null;
  if (!Number.isFinite(startedAt) || startedAt < 1) return null;
  if (!/^0x[0-9a-fA-F]{64}$/.test(challenge)) return null;
  return { nonce, milestone, startedAt, challenge, active: true, hash: String(value.hash || ''), player: String(value.player || '') };
}

function seededRandomFromChallenge(challenge) {
  const raw = String(challenge || '').replace(/^0x/, '');
  let state = Number.parseInt(raw.slice(0, 8), 16) >>> 0;
  if (!state) state = 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRunId() {
  const bytes = new Uint32Array(2);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
    return `${bytes[0].toString(16)}-${bytes[1].toString(16)}`;
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

let audioCtx = null;
let soundEnabled = localStorage.getItem(SOUND_KEY) !== 'off';

function getAudioCtx() {
  if (!soundEnabled) return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) audioCtx = new AudioContextClass();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function tone({ frequency = 440, endFrequency = null, delay = 0, duration = 0.16, volume = 0.03, type = 'sine' }) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  if (endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.04);
}

function playSound(kind, stage = null) {
  if (!soundEnabled) return;
  if (kind === 'jump') {
    tone({ frequency: 230, endFrequency: 360, duration: 0.16 });
    tone({ frequency: 520, delay: 0.035, duration: 0.11, volume: 0.018, type: 'triangle' });
  }
  if (kind === 'orb') {
    tone({ frequency: 540, duration: 0.12, volume: 0.028 });
    tone({ frequency: 760, delay: 0.08, duration: 0.14, volume: 0.024 });
  }
  if (kind === 'protectedHit') {
    tone({ frequency: 150, endFrequency: 92, duration: 0.2, volume: 0.045, type: 'triangle' });
  }
  if (kind === 'gameOver') {
    const root = [174, 196, 220, 247, 277, 311][Math.max(0, Math.min(5, Number(stage?.milestone || 1) - 1))];
    tone({ frequency: root * 1.25, endFrequency: root, duration: 0.22 });
    tone({ frequency: root, endFrequency: root * 0.72, delay: 0.18, duration: 0.24, volume: 0.026, type: 'triangle' });
  }
}

export function getPenaltyForSeconds(seconds) {
  return PENALTY_CONFIG.find((row) => seconds < row.until) || PENALTY_CONFIG[PENALTY_CONFIG.length - 1];
}

function createIntegrityState() {
  return {
    runId: makeRunId(),
    perfStart: 0,
    perfEnd: 0,
    wallStart: 0,
    wallEnd: 0,
    scoreLedger: 0,
    invalidated: false,
    flags: [],
    actionWindowStartedAt: 0,
    jumpInputsInWindow: 0,
  };
}

export function createGame(canvas, callbacks = {}) {
  const ctx = canvas.getContext('2d');

  const state = {
    running: false,
    paused: false,
    startedAt: 0,
    endedAt: 0,
    lastTime: 0,
    score: 0,
    best: Number(localStorage.getItem(STORAGE_KEY) || 0),
    stageIndex: Math.max(0, Number(callbacks.initialProgress?.runStage || callbacks.initialProgress?.unlockedStage || 1) - 1),
    milestoneUnlocked: Number(callbacks.initialProgress?.highestMilestone || 0),
    distance: 0,
    shake: 0,
    lastPenalty: 0,
    obstacles: [],
    orbs: [],
    particles: [],
    damageTexts: [],
    player: { x: 90, y: 0, w: 34, h: 42, vy: 0, grounded: false, shield: 0 },
    integrity: createIntegrityState(),
    startLockedByMintableNft: false,
    mintCompletedForRun: false,
    lives: Number(callbacks.initialProgress?.lives || 3),
    maxLives: 3,
    verifiedSession: null,
  };

  let gameplayRandom = Math.random;
  let obstacleTimer = 0;
  let orbTimer = 0;
  let animationFrameId = 0;

  function configureGameplayRandom(session) {
    gameplayRandom = session?.challenge ? seededRandomFromChallenge(session.challenge) : Math.random;
  }

  function gameRandom(min, max) {
    return gameplayRandom() * (max - min) + min;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!state.running && !state.startedAt) {
      state.player.y = groundY() - state.player.h;
    }
  }

  function groundY() {
    return canvas.getBoundingClientRect().height - 72;
  }

  function addScore(amount) {
    const before = state.score;
    state.score = Math.max(0, state.score + amount);
    const actualDelta = state.score - before;
    state.integrity.scoreLedger = Math.max(0, state.integrity.scoreLedger + actualDelta);
    return actualDelta;
  }

  function flagCheat(code, detail) {
    if (!state.integrity.flags.some((flag) => flag.code === code)) {
      state.integrity.flags.push({ code, detail });
    }
    state.integrity.invalidated = true;
    callbacks.onCheatFlag?.(snapshot(), code, detail);
  }

  function getPlaySeconds() {
    if (!state.startedAt) return 0;
    const endTime = !state.running && state.endedAt ? state.endedAt : performance.now();
    return Math.max(0, Math.floor((endTime - state.startedAt) / 1000));
  }

  function getHighestScoreMilestone() {
    let unlocked = null;
    for (const m of STAGE_CONFIG) {
      if (state.score >= m.score) unlocked = m;
    }
    return unlocked;
  }

  function getNextUnmintedMilestone() {
    return STAGE_CONFIG.find((m) => !isMilestoneAlreadyMinted(m.milestone)) || null;
  }

  function getMintableMilestone() {
    if (state.mintCompletedForRun) return null;
    const seconds = getPlaySeconds();
    const next = getNextUnmintedMilestone();
    if (!next) return null;
    return state.score >= next.score && seconds >= next.minPlaySeconds ? next : null;
  }

  function getNextRequirement() {
    const seconds = getPlaySeconds();
    const next = getNextUnmintedMilestone();
    if (!next) return null;
    return {
      ...next,
      remainingScore: Math.max(0, Math.ceil(next.score - state.score)),
      remainingSeconds: Math.max(0, next.minPlaySeconds - seconds),
    };
  }

  function antiCheatSummary() {
    if (!state.startedAt) {
      return { clean: true, verified: false, status: 'Not started', flags: [], requireGameOverBeforeMint: true };
    }
    if (state.integrity.invalidated) {
      return { clean: false, verified: Boolean(state.verifiedSession?.active), status: 'Run invalidated. Restart required.', flags: state.integrity.flags, requireGameOverBeforeMint: true };
    }
    if (!state.verifiedSession?.active) {
      return {
        clean: true,
        verified: false,
        status: 'Practice run — no on-chain start authorization; mint disabled.',
        flags: [],
        requireGameOverBeforeMint: true,
      };
    }
    if (state.startLockedByMintableNft) {
      return { clean: true, verified: true, status: `Verified on-chain run #${state.verifiedSession.nonce}. Mint is preserved.`, flags: [], requireGameOverBeforeMint: true };
    }
    return { clean: true, verified: true, status: `Verified on-chain run #${state.verifiedSession.nonce}`, flags: [], requireGameOverBeforeMint: true };
  }

  function isMilestoneAlreadyMinted(milestoneOrNumber) {
    const milestoneNumber = typeof milestoneOrNumber === 'object'
      ? Number(milestoneOrNumber?.milestone || 0)
      : Number(milestoneOrNumber || 0);

    if (!milestoneNumber) return false;

    try {
      return Boolean(callbacks.isMilestoneMinted?.(milestoneNumber));
    } catch {
      return false;
    }
  }

  function shouldPreserveMintOnGameOver(snapshotValue = snapshot()) {
    return Boolean(
      snapshotValue?.mintAllowed &&
      snapshotValue?.mintableMilestone &&
      !isMilestoneAlreadyMinted(snapshotValue.mintableMilestone)
    );
  }

  function validateMint(milestoneNumber) {
    const milestone = STAGE_CONFIG.find((m) => m.milestone === Number(milestoneNumber));
    const playSeconds = getPlaySeconds();
    const score = Math.floor(state.score);

    if (!milestone) return { ok: false, message: 'Invalid milestone.', milestone: null };
    if (!state.startedAt) return { ok: false, message: 'Start a new run first.', milestone };
    if (!state.verifiedSession?.active) {
      return { ok: false, message: 'This is a practice run. Use Start Verified Run and approve the on-chain start transaction before playing for an NFT.', milestone };
    }
    if (state.verifiedSession.milestone !== milestone.milestone) {
      return { ok: false, message: `The on-chain run is authorized for milestone #${state.verifiedSession.milestone}, not #${milestone.milestone}.`, milestone };
    }
    if (state.mintCompletedForRun) {
      return { ok: false, message: 'This run already claimed a milestone. Start a new run for the next NFT.', milestone };
    }
    if (isMilestoneAlreadyMinted(milestone.milestone)) {
      return { ok: false, message: 'This milestone is already minted by the connected wallet.', milestone };
    }
    if (milestone.milestone > 1 && !isMilestoneAlreadyMinted(milestone.milestone - 1)) {
      return { ok: false, message: `Mint milestone #${milestone.milestone - 1} first.`, milestone };
    }
    if (ANTI_CHEAT_CONFIG.requireGameOverBeforeMint && state.running) {
      return { ok: false, message: 'Finish the run first. Mint becomes available after game over.', milestone };
    }
    if (state.integrity.invalidated) {
      return { ok: false, message: 'This run was invalidated. Restart and play again.', milestone };
    }
    if (playSeconds > ANTI_CHEAT_CONFIG.maxMintRunSeconds) {
      return { ok: false, message: 'This run is too long. Restart and try again.', milestone };
    }
    if (Math.abs(state.score - state.integrity.scoreLedger) > ANTI_CHEAT_CONFIG.maxLedgerDifference) {
      return { ok: false, message: 'Score integrity check failed. Restart required.', milestone };
    }
    const wallEnd = state.running ? Date.now() : state.integrity.wallEnd;
    const perfEnd = state.running ? performance.now() : state.integrity.perfEnd;
    const drift = Math.abs((wallEnd - state.integrity.wallStart) - (perfEnd - state.integrity.perfStart));
    if (drift > ANTI_CHEAT_CONFIG.maxWallPerformanceDriftMs) {
      return { ok: false, message: 'Clock consistency check failed. Restart required.', milestone };
    }
    if (score / Math.max(1, playSeconds) > ANTI_CHEAT_CONFIG.maxScorePerSecond) {
      return { ok: false, message: 'Score rate is too high for a valid run. Restart required.', milestone };
    }
    if (score < milestone.score) {
      return { ok: false, message: `Need ${Math.ceil(milestone.score - score).toLocaleString()} more score.`, milestone };
    }
    if (playSeconds < milestone.minPlaySeconds) {
      return { ok: false, message: `Need ${milestone.minPlaySeconds - playSeconds}s more play time.`, milestone };
    }

    return { ok: true, message: 'Mint payload is valid.', milestone, score, playSeconds, runId: state.integrity.runId };
  }

  function snapshot() {
    const playSeconds = getPlaySeconds();
    const scoreUnlocked = getHighestScoreMilestone();
    const mintable = getMintableMilestone();
    const validation = mintable ? validateMint(mintable.milestone) : { ok: false, message: 'No milestone is mintable yet.' };
    const penaltyWindow = getPenaltyForSeconds(playSeconds);

    return {
      score: Math.floor(state.score),
      best: Math.floor(state.best),
      milestoneUnlocked: scoreUnlocked?.milestone || 0,
      scoreUnlockedMilestone: scoreUnlocked,
      mintableMilestone: mintable,
      mintAllowed: Boolean(mintable && validation.ok),
      mintBlockedReason: mintable && !validation.ok ? validation.message : '',
      nextRequirement: getNextRequirement(),
      stage: STAGE_CONFIG[state.stageIndex],
      playSeconds,
      currentPenalty: penaltyWindow.penalty,
      penaltyWindow,
      lastPenalty: state.lastPenalty,
      shieldActive: state.player.shield > 0,
      running: state.running,
      antiCheat: antiCheatSummary(),
      startLockedByMintableNft: state.startLockedByMintableNft,
      lives: state.lives,
      maxLives: state.maxLives,
      gameOver: !state.running,
      verifiedRun: state.verifiedSession ? { ...state.verifiedSession } : null,
    };
  }

  function reset(verifiedSession = null) {
    state.running = true;
    state.paused = false;
    state.startedAt = performance.now();
    state.endedAt = 0;
    state.lastTime = performance.now();
    state.score = 0;
    state.best = Number(localStorage.getItem(STORAGE_KEY) || 0);
    state.stageIndex = Math.max(0, Number(callbacks.initialProgress?.runStage || callbacks.initialProgress?.unlockedStage || 1) - 1);
    state.milestoneUnlocked = Number(callbacks.initialProgress?.highestMilestone || 0);
    state.distance = 0;
    state.shake = 0;
    state.lastPenalty = 0;
    state.obstacles = [];
    state.orbs = [];
    state.particles = [];
    state.damageTexts = [];
    state.player = { x: 90, y: groundY() - 42, w: 34, h: 42, vy: 0, grounded: true, shield: 0 };
    state.integrity = createIntegrityState();
    state.integrity.perfStart = state.startedAt;
    state.integrity.wallStart = Date.now();
    state.integrity.actionWindowStartedAt = state.startedAt;
    state.startLockedByMintableNft = false;
    state.mintCompletedForRun = false;
    state.lives = 3;
    state.verifiedSession = normalizeVerifiedSession(verifiedSession);
    configureGameplayRandom(state.verifiedSession);
    obstacleTimer = 0;
    orbTimer = 32;
    callbacks.onUpdate?.(snapshot());
  }

  function recordJumpInput() {
    const now = performance.now();
    if (!state.integrity.actionWindowStartedAt || now - state.integrity.actionWindowStartedAt > 1000) {
      state.integrity.actionWindowStartedAt = now;
      state.integrity.jumpInputsInWindow = 0;
    }
    state.integrity.jumpInputsInWindow += 1;
    if (state.integrity.jumpInputsInWindow > ANTI_CHEAT_CONFIG.maxJumpInputsPerSecond) {
      flagCheat('TOO_MANY_INPUTS', 'Too many jump inputs in one second.');
    }
  }

  function canJumpStartNewRun() {
    if (state.running) return true;
    if (callbacks.allowAutoStart && callbacks.allowAutoStart() === false) {
      callbacks.onAutoStartBlocked?.(snapshot());
      return false;
    }
    if (!state.startedAt) return true;

    // Only freeze accidental restart when the currently unlocked NFT is still unminted.
    // If the current milestone NFT was already minted before, Space/tap can start a new run normally.
    if (state.startLockedByMintableNft) return false;
    return !shouldPreserveMintOnGameOver(snapshot());
  }

  function jump() {
    if (!state.running) {
      if (!canJumpStartNewRun()) {
        callbacks.onUpdate?.(snapshot());
        return;
      }
      reset();
    }

    recordJumpInput();
    if (state.integrity.invalidated) return;

    if (state.player.grounded) {
      state.player.vy = -15.2;
      state.player.grounded = false;
      burst(state.player.x + 16, state.player.y + 36, 10, '#e0fbfc');
      playSound('jump');
    }
  }

  function burst(x, y, count = 12, color = '#e0fbfc') {
    for (let i = 0; i < count; i += 1) {
      state.particles.push({ x, y, vx: safeRandom(-3, 3), vy: safeRandom(-4, 2), life: safeRandom(18, 36), color });
    }
  }

  function showPenaltyText(amount) {
    state.damageTexts.push({
      text: `-${amount}`,
      x: state.player.x + state.player.w / 2,
      y: state.player.y + state.player.h / 2,
      vx: safeRandom(-4, 4),
      vy: safeRandom(-5.2, -3.2),
      life: 72,
      maxLife: 72,
      size: safeRandom(20, 27),
      rotation: safeRandom(-0.18, 0.18),
    });
  }

  function applyProtectedHitPenalty() {
    const row = getPenaltyForSeconds(getPlaySeconds());
    const amount = row.penalty;
    addScore(-amount);
    state.lastPenalty = amount;
    state.shake = 9;
    showPenaltyText(amount);
    playSound('protectedHit');
    burst(state.player.x + 18, state.player.y + 20, 18, '#26d9d0');
    callbacks.onPenalty?.(snapshot(), amount, row);
  }

  function spawnObstacle() {
    const h = gameRandom(28, 70);
    state.obstacles.push({ x: canvas.getBoundingClientRect().width + 30, y: groundY() - h, w: gameRandom(26, 44), h, passed: false, hit: false });
  }

  function spawnOrb() {
    state.orbs.push({ x: canvas.getBoundingClientRect().width + 30, y: gameRandom(groundY() - 165, groundY() - 76), r: 12, taken: false, pulse: 0 });
  }

  function rectHit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function orbHit(player, orb) {
    const cx = clamp(orb.x, player.x, player.x + player.w);
    const cy = clamp(orb.y, player.y, player.y + player.h);
    const dx = orb.x - cx;
    const dy = orb.y - cy;
    return dx * dx + dy * dy < orb.r * orb.r;
  }

  function loseLife() {
    state.lives = Math.max(0, state.lives - 1);
    callbacks.onLifeLost?.(snapshot(), state.lives);

    if (state.lives > 0) {
      // A life loss is still part of the same run. V20 incorrectly reset the
      // run timer and integrity state here, which could erase anti-cheat flags
      // and make client play time diverge from the on-chain run start.
      state.running = true;
      state.lastTime = performance.now();
      state.obstacles = [];
      state.orbs = [];
      state.player.y = groundY() - state.player.h;
      state.player.vy = 0;
      state.player.grounded = true;
      state.player.shield = 0;
      callbacks.onUpdate?.(snapshot());
      return false;
    }
    return true;
  }

  function endGame() {
    state.endedAt = performance.now();
    state.integrity.perfEnd = state.endedAt;
    state.integrity.wallEnd = Date.now();
    state.running = false;
    state.shake = 18;

    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem(STORAGE_KEY, String(Math.floor(state.best)));
    }

    const finalSnapshot = snapshot();
    state.startLockedByMintableNft = shouldPreserveMintOnGameOver(finalSnapshot);

    playSound('gameOver', STAGE_CONFIG[state.stageIndex]);
    callbacks.onGameOver?.(snapshot());
  }

  function update(dt) {
    if (!state.running || state.paused) return;

    const stage = STAGE_CONFIG[state.stageIndex];
    const speed = stage.speed + Math.min(4, state.distance / 5000);

    state.distance += speed * dt;
    addScore(speed * dt * SCORE_RATE_MULTIPLIER);

    state.player.vy += 0.75 * dt;
    state.player.y += state.player.vy * dt;
    state.player.y = Math.min(state.player.y, groundY() - state.player.h);
    state.player.grounded = state.player.y >= groundY() - state.player.h;
    if (state.player.grounded) state.player.vy = 0;
    if (state.player.shield > 0) state.player.shield -= dt;

    obstacleTimer -= dt;
    orbTimer -= dt;
    if (obstacleTimer <= 0) {
      spawnObstacle();
      obstacleTimer = gameRandom(58, 110) - state.stageIndex * 4;
    }
    if (orbTimer <= 0) {
      spawnOrb();
      orbTimer = gameRandom(42, 80);
    }

    for (const obstacle of state.obstacles) {
      obstacle.x -= speed * dt;
      if (!obstacle.passed && obstacle.x + obstacle.w < state.player.x) {
        obstacle.passed = true;
        addScore(OBSTACLE_PASS_SCORE);
      }
      if (!obstacle.hit && rectHit(state.player, obstacle)) {
        obstacle.hit = true;
        if (state.player.shield > 0) {
          obstacle.x = -999;
          state.player.shield = 0;
          applyProtectedHitPenalty();
        } else {
          const finished = loseLife();
          if (finished) {
            endGame();
          }
          return;
        }
      }
    }

    for (const orb of state.orbs) {
      orb.x -= speed * dt;
      orb.pulse += dt * 0.1;
      if (!orb.taken && orbHit(state.player, orb)) {
        orb.taken = true;
        addScore(ORB_SCORE);
        state.player.shield = Math.max(state.player.shield, 120);
        burst(orb.x, orb.y, 14, '#8cffcb');
        playSound('orb');
      }
    }

    state.obstacles = state.obstacles.filter((o) => o.x > -80);
    state.orbs = state.orbs.filter((o) => o.x > -80 && !o.taken);

    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.18 * dt;
      p.life -= dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);

    for (const d of state.damageTexts) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy -= 0.02 * dt;
      d.life -= dt;
    }
    state.damageTexts = state.damageTexts.filter((d) => d.life > 0);

    const nextStage = STAGE_CONFIG.findIndex((s) => state.score < s.score);
    state.stageIndex = nextStage === -1 ? STAGE_CONFIG.length - 1 : Math.max(0, nextStage);

    for (const m of STAGE_CONFIG) {
      if (state.score >= m.score && state.milestoneUnlocked < m.milestone) {
        state.milestoneUnlocked = m.milestone;
        callbacks.onMilestone?.(snapshot());
      }
    }

    callbacks.onUpdate?.(snapshot());
  }

  function drawRoundRect(x, y, w, h, r) {
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

  function draw() {
    const width = canvas.getBoundingClientRect().width;
    const height = canvas.getBoundingClientRect().height;
    const gy = groundY();

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    const shakeX = state.shake > 0 ? safeRandom(-state.shake, state.shake) : 0;
    const shakeY = state.shake > 0 ? safeRandom(-state.shake, state.shake) : 0;
    state.shake = Math.max(0, state.shake - 1);
    ctx.translate(shakeX, shakeY);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#07111f');
    gradient.addColorStop(0.45, '#172554');
    gradient.addColorStop(1, '#020617');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.36;
    for (let i = 0; i < 56; i += 1) {
      const x = (i * 97 - state.distance * 0.12) % (width + 140) - 70;
      const y = 24 + (i * 37) % Math.max(80, height - 130);
      ctx.fillStyle = i % 3 === 0 ? '#60a5fa' : '#8bd3ff';
      ctx.fillRect(x, y, i % 4 === 0 ? 3 : 2, i % 4 === 0 ? 3 : 2);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#07111f';
    ctx.fillRect(0, gy, width, height - gy);
    ctx.fillStyle = '#26d9d0';
    ctx.fillRect(0, gy, width, 3);

    ctx.globalAlpha = 0.18;
    for (let x = -80; x < width + 80; x += 38) {
      ctx.fillRect(x - (state.distance % 38), gy + 22, 22, 3);
    }
    ctx.globalAlpha = 1;

    for (const orb of state.orbs) {
      ctx.save();
      ctx.translate(orb.x, orb.y);
      const scale = 1 + Math.sin(orb.pulse) * 0.08;
      ctx.scale(scale, scale);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(0, 0, orb.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(190,255,220,.85)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#d1fae5';
      ctx.beginPath();
      ctx.arc(-3, -3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const o of state.obstacles) {
      const hazard = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h);
      hazard.addColorStop(0, '#ff6b6b');
      hazard.addColorStop(1, '#912f56');
      ctx.fillStyle = hazard;
      drawRoundRect(o.x, o.y, o.w, o.h, 7);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.fillRect(o.x + 5, o.y + 5, 5, Math.max(10, o.h - 12));
    }

    for (const p of state.particles) {
      ctx.globalAlpha = clamp(p.life / 36, 0, 1);
      ctx.fillStyle = p.color || '#e0fbfc';
      ctx.fillRect(p.x, p.y, 3, 3);
    }
    ctx.globalAlpha = 1;

    const player = state.player;
    if (player.shield > 0) {
      const pulse = 34 + Math.sin(performance.now() / 110) * 3;
      ctx.strokeStyle = 'rgba(34,197,94,.88)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(player.x + player.w / 2, player.y + player.h / 2, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(player.x + player.w / 2, player.y + player.h / 2, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const body = ctx.createLinearGradient(player.x, player.y, player.x, player.y + player.h);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(1, '#83e9ff');
    ctx.fillStyle = body;
    drawRoundRect(player.x, player.y, player.w, player.h, 9);
    ctx.fill();
    ctx.fillStyle = '#101827';
    ctx.fillRect(player.x + 21, player.y + 12, 5, 5);
    ctx.fillStyle = '#26d9d0';
    ctx.fillRect(player.x + 8, player.y + 29, 19, 5);

    for (const d of state.damageTexts) {
      const alpha = clamp(d.life / d.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rotation);
      ctx.font = `900 ${d.size}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(20,0,0,.85)';
      ctx.strokeText(d.text, 0, 0);
      ctx.fillStyle = '#ff4d6d';
      ctx.fillText(d.text, 0, 0);
      ctx.restore();
    }

    ctx.restore();

    if (!state.running) {
      ctx.save();
      ctx.fillStyle = 'rgba(2,6,23,.55)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '800 27px system-ui, sans-serif';
      const currentSnapshot = snapshot();
      const locked = state.startLockedByMintableNft || shouldPreserveMintOnGameOver(currentSnapshot);
      ctx.fillText(locked ? 'NFT ready — mint is preserved' : 'Press Space / Tap to Start', width / 2, height / 2 - 14);
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(
        locked ? 'Use Mint NFT now. To play again, press Start / Restart.' : 'Jump, collect green shields, unlock milestone NFTs.',
        width / 2,
        height / 2 + 20
      );
      ctx.restore();
    }

    if (state.integrity.invalidated) {
      ctx.save();
      ctx.fillStyle = 'rgba(127,29,29,.78)';
      ctx.fillRect(0, 0, width, 54);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Run invalidated by anti-cheat. Restart to mint.', width / 2, 33);
      ctx.restore();
    }
  }

  function loop(now) {
    const rawDeltaMs = now - state.lastTime;
    if (state.running && rawDeltaMs > ANTI_CHEAT_CONFIG.maxFrameGapMs) {
      flagCheat('FRAME_GAP', `Frame gap was ${Math.round(rawDeltaMs)}ms.`);
    }
    const dt = Math.min(2.2, rawDeltaMs / 16.67);
    state.lastTime = now;
    update(dt);
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  function onKeyDown(event) {
    if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) {
      event.preventDefault();
      jump();
    }
    if (event.code === 'KeyP') {
      event.preventDefault();
      // Pausing a verified run would let wall-clock/on-chain time advance while
      // gameplay is frozen. Keep pause available only for non-mintable practice.
      if (state.verifiedSession?.active) return;
      state.paused = !state.paused;
    }
  }

  function onVisibilityChange() {
    if (!state.running) return;
    if (document.hidden && ANTI_CHEAT_CONFIG.invalidateOnTabHidden) {
      flagCheat('TAB_HIDDEN', 'The tab was hidden during an active run.');
      state.paused = true;
    }
  }

  function getMintPayload(milestoneNumber) {
    const validation = validateMint(milestoneNumber);
    if (!validation.ok) throw new Error(validation.message);
    return {
      milestone: validation.milestone.milestone,
      score: validation.score,
      playSeconds: validation.playSeconds,
      runId: validation.runId,
      runNonce: state.verifiedSession?.nonce || 0,
      runChallenge: state.verifiedSession?.challenge || '',
    };
  }

  function markMinted(milestoneNumber) {
    const milestone = Number(milestoneNumber);
    if (!Number.isInteger(milestone) || milestone < 1 || milestone > MAX_STAGE) return;
    state.mintCompletedForRun = true;
    if (state.verifiedSession) state.verifiedSession.active = false;
    state.startLockedByMintableNft = false;
    callbacks.onUpdate?.(snapshot());
  }

  function clearVerifiedRun() {
    if (state.verifiedSession) state.verifiedSession.active = false;
    callbacks.onUpdate?.(snapshot());
  }

  function setSoundEnabled(value) {
    soundEnabled = Boolean(value);
    localStorage.setItem(SOUND_KEY, soundEnabled ? 'on' : 'off');
    if (!soundEnabled && audioCtx) audioCtx.suspend().catch(() => {});
    if (soundEnabled) getAudioCtx();
  }

  function isSoundEnabled() {
    return soundEnabled;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', onKeyDown);
  document.addEventListener('visibilitychange', onVisibilityChange);
  function isCoarsePointerInput() {
    return Boolean(window.matchMedia?.('(pointer: coarse)').matches);
  }

  function onCanvasPointerDown() {
    // Desktop/laptop canvas click still jumps.
    // Mobile jump is handled globally in main.js so the whole page can act as jump space,
    // excluding wallet, start, sound and mint controls.
    if (!isCoarsePointerInput()) jump();
  }

  canvas.addEventListener('pointerdown', onCanvasPointerDown);
  animationFrameId = requestAnimationFrame((t) => {
    state.lastTime = t;
    animationFrameId = requestAnimationFrame(loop);
  });
  draw();

  return {
    start: reset,
    jump,
    snapshot,
    getMintPayload,
    markMinted,
    clearVerifiedRun,
    setSoundEnabled,
    isSoundEnabled,
    destroy() {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas.removeEventListener('pointerdown', onCanvasPointerDown);
    },
  };
}
