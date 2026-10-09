import assert from 'node:assert/strict';

let fakePerf = 0;
let fakeWall = 1_800_000_000_000;
const storage = new Map([['baseQuestSound', 'off']]);
const rafQueue = [];
const listeners = new Map();

Object.defineProperty(globalThis, 'performance', {
  configurable: true,
  value: { now: () => fakePerf },
});
Date.now = () => fakeWall;

const localStorageMock = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
globalThis.localStorage = localStorageMock;
globalThis.window = {
  devicePixelRatio: 1,
  crypto: globalThis.crypto,
  localStorage: localStorageMock,
  matchMedia: () => ({ matches: false }),
  addEventListener: (name, fn) => listeners.set(`window:${name}`, fn),
  removeEventListener: (name) => listeners.delete(`window:${name}`),
};
globalThis.document = {
  hidden: false,
  addEventListener: (name, fn) => listeners.set(`document:${name}`, fn),
  removeEventListener: (name) => listeners.delete(`document:${name}`),
};
globalThis.requestAnimationFrame = (fn) => { rafQueue.push(fn); return rafQueue.length; };
globalThis.cancelAnimationFrame = () => {};

const gradient = { addColorStop() {} };
const contextTarget = {
  createLinearGradient: () => gradient,
  setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, arc() {}, fill() {}, stroke() {},
  save() {}, restore() {}, translate() {}, scale() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {},
  closePath() {}, strokeText() {}, fillText() {}, rotate() {},
};
const context = new Proxy(contextTarget, {
  get(target, prop) { return target[prop]; },
  set(target, prop, value) { target[prop] = value; return true; },
});
const canvas = {
  width: 960,
  height: 420,
  getContext: () => context,
  getBoundingClientRect: () => ({ width: 960, height: 420 }),
  addEventListener() {},
  removeEventListener() {},
};

const originalRandom = Math.random;
Math.random = () => 0.5;
const { createGame } = await import('../src/game.js');

let highestMinted = 0;
const callbacks = {
  isMilestoneMinted: (n) => Number(n) <= highestMinted,
  getHighestMintedMilestone: () => highestMinted,
  allowAutoStart: () => true,
};

function frame() {
  const cb = rafQueue.shift();
  assert.ok(cb, 'animation frame callback must exist');
  fakePerf += 16.67;
  fakeWall += 16.67;
  cb(fakePerf);
}

// --- Same-run lives behavior ---
let game = createGame(canvas, callbacks);
frame(); // prime createGame's initial RAF trampoline
assert.equal(game.start(), true, 'initial start should succeed');

let previousLives = 3;
let previousScore = 0;
let previousPlaySeconds = 0;
let firstLossChecked = false;
let secondLossChecked = false;
let safety = 0;
while (game.snapshot().lives > 0 && safety < 12000) {
  const before = game.snapshot();
  frame();
  const after = game.snapshot();
  if (after.lives < previousLives) {
    if (after.lives > 0) {
      assert.equal(after.running, true, 'losing one or two lives must keep the same run active');
      assert.ok(after.score >= previousScore, 'single-life loss must not reset score');
      assert.ok(after.playSeconds >= previousPlaySeconds, 'single-life loss must not reset run time');
      assert.equal(after.stage.milestone >= before.stage.milestone, true, 'single-life loss must not roll stage backward');
      if (after.lives === 2) firstLossChecked = true;
      if (after.lives === 1) secondLossChecked = true;
    }
    previousLives = after.lives;
  }
  previousScore = after.score;
  previousPlaySeconds = after.playSeconds;
  safety += 1;
}

assert.ok(firstLossChecked, 'first life loss was observed');
assert.ok(secondLossChecked, 'second life loss was observed');
const dead = game.snapshot();
assert.equal(dead.lives, 0, 'third life loss must end the life pool');
assert.equal(dead.running, false, 'game must stop after all three lives are used');
assert.ok(dead.retrySeconds >= 179 && dead.retrySeconds <= 180, `retry lock should start at 3 minutes, got ${dead.retrySeconds}`);
assert.ok(Number(storage.get('baseQuestRetryLockedUntil')) > fakeWall, 'retry lock must be persisted to localStorage');
assert.equal(game.start(), false, 'direct game.start must not bypass retry lock');
game.jump();
assert.equal(game.snapshot().running, false, 'jump/tap must not bypass retry lock');

// --- Refresh/reopen persistence ---
game.destroy();
rafQueue.length = 0;
game = createGame(canvas, callbacks);
frame();
assert.ok(game.snapshot().retrySeconds > 0, 'a fresh game instance must restore the persisted retry lock');
assert.equal(game.start(), false, 'refresh/reopen must not bypass the retry lock');

// --- Protocol-mint checkpoint recovery after timer ---
highestMinted = 5;
fakeWall += 181_000;
assert.equal(game.start(), true, 'start should unlock after the retry timer expires');
const resumed = game.snapshot();
assert.equal(resumed.lives, 3, 'new run should restore all three lives');
assert.equal(resumed.score, 10_000, 'milestone #5 checkpoint should restore its score threshold');
assert.ok(resumed.best >= 10_000, 'displayed best score must never fall below a permanent protocol checkpoint');
assert.equal(resumed.stage.milestone, 6, 'after milestone #5 is protocol-minted, gameplay should resume at stage #6');
assert.equal(resumed.retrySeconds, 0, 'retry lock must clear after a valid post-cooldown start');
assert.equal(storage.has('baseQuestRetryLockedUntil'), false, 'expired retry lock must be removed from localStorage');

// --- Anti-cheat hidden-tab recovery ---
const visibilityHandler = listeners.get('document:visibilitychange');
assert.equal(typeof visibilityHandler, 'function', 'visibility anti-cheat listener must be installed');
document.hidden = true;
visibilityHandler();
const hiddenState = game.snapshot();
assert.equal(hiddenState.running, false, 'hiding the tab must end an active run instead of leaving it stuck');
assert.equal(hiddenState.antiCheat.clean, false, 'hidden-tab run must be invalidated for minting');
document.hidden = false;

// --- Verified milestone auto-stop and strict mint lock ---
game.destroy();
rafQueue.length = 0;
storage.delete('baseQuestRetryLockedUntil');
highestMinted = 0;

const mintCanvas = {
  ...canvas,
  getBoundingClientRect: () => ({ width: 1, height: 420 }),
};
game = createGame(mintCanvas, callbacks);
frame();

const sessionOne = {
  active: true,
  nonce: 1,
  milestone: 1,
  startedAt: Math.floor(fakeWall / 1000),
  challenge: `0x${'11'.repeat(32)}`,
  hash: `0x${'aa'.repeat(32)}`,
  player: '0x1111111111111111111111111111111111111111',
};
assert.equal(game.start(sessionOne), true, 'verified milestone #1 run should start');

let mintSafety = 0;
while (game.snapshot().running && mintSafety < 2500) {
  frame();
  mintSafety += 1;
}

const readyToMint = game.snapshot();
assert.equal(readyToMint.running, false, 'verified run must auto-stop when its authorized milestone becomes mintable');
assert.equal(readyToMint.endReason, 'mint-ready', 'auto-stop must use the mint-ready terminal state');
assert.equal(readyToMint.mintableMilestone?.milestone, 1, 'milestone #1 should be the preserved mint target');
assert.equal(readyToMint.mintAllowed, true, 'milestone #1 must be valid for mint after the automatic stop');
assert.equal(readyToMint.startLockedByMintableNft, true, 'gameplay must stay locked until the mint is confirmed');
assert.equal(game.start(sessionOne), false, 'direct game.start must not bypass the pending-mint lock');
game.jump();
assert.equal(game.snapshot().running, false, 'jump/tap must not bypass the pending-mint lock');

// Mirror main.js ordering after a confirmed on-chain mint: protocol sync sees #1,
// then the game consumes the local mint lock and permits a fresh #2 session.
highestMinted = 1;
game.markMinted(1);
assert.equal(game.snapshot().startLockedByMintableNft, false, 'confirmed mint must release the local gameplay lock');
const sessionTwo = {
  ...sessionOne,
  nonce: 2,
  milestone: 2,
  startedAt: Math.floor(fakeWall / 1000),
  challenge: `0x${'22'.repeat(32)}`,
};
assert.equal(game.start(sessionTwo), true, 'milestone #2 verified run should start only after #1 is confirmed minted');
const secondRun = game.snapshot();
assert.equal(secondRun.score, 1200, 'next run must start at the protocol-minted #1 score checkpoint');
assert.equal(secondRun.stage.milestone, 2, 'next run must start on stage #2 after mint #1');

// Clearing/disconnecting an active verified session must terminate that run instead
// of silently continuing as if it were still mint-authorized.
game.clearVerifiedRun();
const cleared = game.snapshot();
assert.equal(cleared.running, false, 'clearing an active verified session must stop gameplay');
assert.equal(cleared.verifiedRun?.active, false, 'cleared verified session must not remain active');
assert.equal(cleared.startLockedByMintableNft, false, 'clearing a verified session must not leave a stale mint lock');

// --- Cross-tab retry-lock propagation ---
game.destroy();
rafQueue.length = 0;
storage.delete('baseQuestRetryLockedUntil');
highestMinted = 0;
game = createGame(canvas, callbacks);
frame();
assert.equal(game.start(), true, 'cross-tab lock test run should start');
storage.set('baseQuestRetryLockedUntil', String(fakeWall + 180_000));
const storageHandler = listeners.get('window:storage');
assert.equal(typeof storageHandler, 'function', 'retry-lock storage listener must be installed');
storageHandler({ key: 'baseQuestRetryLockedUntil' });
const externallyLocked = game.snapshot();
assert.equal(externallyLocked.running, false, 'a retry lock created in another tab must stop active gameplay here too');
assert.ok(externallyLocked.retrySeconds >= 179, 'cross-tab retry lock must remain active after forced stop');

Math.random = originalRandom;
game.destroy();
console.log('Client gameplay smoke test passed: same-run lives, persisted 3-minute lock, input lockout, protocol checkpoint recovery, hidden-tab anti-cheat recovery, verified milestone auto-stop, strict mint lock, sequential post-mint restart, verified-session clearing, and cross-tab retry-lock enforcement.');
