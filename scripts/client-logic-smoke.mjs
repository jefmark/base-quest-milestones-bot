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
assert.ok(dead.retrySeconds >= 58 && dead.retrySeconds <= 59, `retry lock should start at 59 seconds, got ${dead.retrySeconds}`);
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
fakeWall += 58_000;
assert.equal(game.start(), false, 'start must remain locked before 59 seconds elapse');
fakeWall += 1_000;
assert.equal(game.start(), true, 'start should unlock after the 59-second retry timer expires');
const resumed = game.snapshot();
assert.equal(resumed.lives, 3, 'new run should restore all three lives');
assert.equal(resumed.score, 10_000, 'milestone #5 checkpoint should restore its score threshold');
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

Math.random = originalRandom;
game.destroy();
console.log('Client gameplay smoke test passed: same-run lives, persisted 59-second lock, input lockout, protocol checkpoint recovery, and hidden-tab anti-cheat recovery.');
