import './style.css';
import { CONFIG } from './config.js';
import { createGame, STAGE_CONFIG } from './game.js';
import {
  disconnectWallet,
  getBalanceText,
  getHighestCompletedMilestone,
  hasMintedMilestone,
  mintMilestone,
  openWalletModal,
  requestBotNetwork,
  shortAddress,
  startVerifiedRun,
  getActiveRun,
  walletState,
} from './wallet.js';

function installBrowserIdentity() {
  document.title = 'Base Quest Milestones';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="g" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stop-color="#168bff" />
          <stop offset="1" stop-color="#1ee981" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#020617" />
      <circle cx="32" cy="32" r="24" fill="none" stroke="url(#g)" stroke-width="4" />
      <path d="M20 41c6-15 13-22 26-27-5 12-12 20-27 27Z" fill="url(#g)" />
      <circle cx="38" cy="22" r="3" fill="#fff" />
      <path d="M20 42l-2 7 7-2" stroke="#7dd3fc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `.trim();
  const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  let icon = document.querySelector('link[rel="icon"]');
  if (!icon) {
    icon = document.createElement('link');
    icon.rel = 'icon';
    document.head.appendChild(icon);
  }
  icon.type = 'image/svg+xml';
  icon.href = dataUrl;

  let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (!appleIcon) {
    appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    document.head.appendChild(appleIcon);
  }
  appleIcon.href = dataUrl;

  const ensureMeta = (name, content) => {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  };

  ensureMeta('application-name', 'Base Quest Milestones');
  ensureMeta('theme-color', '#020617');
}

installBrowserIdentity();

const app = document.querySelector('#app');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const milestoneCards = STAGE_CONFIG.map((m) => `
  <article class="milestone-card" data-milestone="${escapeHtml(m.milestone)}">
    <div class="milestone-topline">
      <span class="milestone-number">${escapeHtml(m.milestone)}</span>
      <span class="milestone-pill">${escapeHtml(m.minPlaySeconds)}s clean run</span>
    </div>
    <h3>${escapeHtml(m.name)}</h3>
    <p>${Number(m.score).toLocaleString()} score required to unlock this Base Quest milestone NFT.</p>
    <span class="milestone-status" data-milestone-status>Locked</span>
  </article>
`).join('');

app.innerHTML = `
  <main class="shell">
    <section class="hero-card" aria-labelledby="app-title">
      <div class="hero-copy">
        <p class="eyebrow">BOT Chain Testnet • ERC-721 Runner</p>
        <h1 id="app-title"><span>Base Quest</span><span>Milestones</span></h1>
        <p class="hero-text">
          Play a clean run, unlock a milestone, then mint the matching NFT on BOT Chain.
          The wallet picker is EVM-only and supports desktop extensions plus mobile WalletConnect.
        </p>

        <div class="actions wallet-actions" aria-label="Wallet actions">
          <button id="connectBtn" class="primary-action" type="button">Connect Wallet</button>
          <button id="disconnectBtn" class="ghost-action" type="button" hidden>Disconnect</button>
        </div>


        <p id="walletStatus" class="status-text">
          Live on BOT Chain Testnet. Connect an EVM wallet to mint unlocked milestones.
        </p>
      </div>

      <div class="hero-side" aria-hidden="true">
        <span class="orb orb-one"></span>
        <span class="orb orb-two"></span>
        <div class="chain-card">
          <span>Network</span>
          <strong>BOT Chain</strong>
        </div>
        <div class="chain-card muted">
          <span>Mint Type</span>
          <strong>NFT Badge</strong>
        </div>
      </div>
    </section>

    <section class="game-panel" aria-labelledby="runner-title">
      <div class="game-panel-head">
        <div>
          <p class="eyebrow">Verified Run Required For Mint</p>
          <h2 id="runner-title">Runner Arena</h2>
        </div>
        <div class="game-controls" aria-label="Game controls">
          <button id="startBtn" type="button">Start Practice Run</button>
          <button id="jumpBtn" type="button">Jump</button>
          <button id="soundBtn" type="button">Sound: On</button>
        </div>
      </div>

      <canvas id="gameCanvas" width="960" height="420" aria-label="Base Quest Milestones runner game"></canvas>

      <div class="mint-bar">
        <p id="message" class="message">Reach a verified checkpoint to pause and mint your NFT.</p>
        <button id="mintBtn" class="mint-action" type="button" disabled>Mint NFT Locked</button>
      </div>

      <div class="stats-grid" aria-label="Game statistics">
        <article>
          <span>Score</span>
          <strong id="score">0</strong>
        </article>
        <article>
          <span>Best</span>
          <strong id="best">0</strong>
        </article>
        <article>
          <span>Stage</span>
          <strong id="stage">Rookie Runner</strong>
        </article>
        <article class="wide">
          <span>Score Unlocked</span>
          <strong id="unlocked">None</strong>
        </article>
        <article class="wide">
          <span>Mintable NFT</span>
          <strong id="mintable">None</strong>
        </article>
        <article>
          <span>Play Time</span>
          <strong id="seconds">0s</strong>
        </article>
        <article>
          <span>Lives</span>
          <strong id="lives">3/3</strong>
        </article>
        <article>
          <span>Protected Hit Penalty</span>
          <strong id="penalty">-100</strong>
        </article>
        <article>
          <span>Last Hit</span>
          <strong id="lastPenalty">None</strong>
        </article>
        <article class="wide">
          <span>Anti-Cheat</span>
          <strong id="antiCheat">Not started</strong>
        </article>
        <article class="wide">
          <span>Next Requirement</span>
          <strong id="requirement">1,200 score • 20s</strong>
        </article>
      </div>
    </section>

    <section class="info-grid" aria-label="Project notes">
      <article class="safety-card">
        <p class="eyebrow">Wallet Safety</p>
        <h2>Mint-only flow</h2>
        <p>
          Starting a new visit requires one <code>startRun</code> transaction. Each NFT mint is a separate
          <code>mintMilestone</code> transaction; minting and the 59-second life retry do not require another
          <code>startRun</code>. Reject approvals, transfers, or unlimited permissions.
        </p>
      </article>
      <article class="safety-card">
        <p class="eyebrow">Mint Protection</p>
        <h2>No accidental restart</h2>
        <p>
          A mintable verified run is bound to an on-chain nonce. Accidental Space/tap/canvas clicks
          will not replace it. Start Verified Run creates a fresh on-chain session when you intentionally restart.
        </p>
      </article>
    </section>

    <section class="milestone-section" aria-labelledby="milestones-title">
      <div class="section-title">
        <p class="eyebrow">Onchain Progress</p>
        <h2 id="milestones-title">Milestones</h2>
      </div>
      <div class="milestones">
        ${milestoneCards}
      </div>
    </section>

    <section class="info-grid" aria-label="Game information">
      <article class="info-card" id="about">
        <h2>About Base Quest Milestones</h2>
        <p>Base Quest Milestones is an on-chain progression runner where clean verified gameplay unlocks milestone NFTs.</p>
      </article>
      <article class="info-card" id="xp">
        <h2>XP System</h2>
        <p>Earn progress through gameplay, complete milestones, and build your on-chain achievement history.</p>
        <div id="xpProgress" class="xp-progress" role="progressbar" aria-label="NFT progression" aria-valuemin="0" aria-valuemax="12" aria-valuenow="0"><span></span></div>
      </article>
      <article class="info-card" id="community">
        <h2>Community</h2>
        <p>Add your official community links here:</p>
        <div class="community-links">
          <a href="./pages/community.html">Community links</a>
          <a href="https://github.com/jefmark/base-quest-milestones-bot" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </article>
      <article class="info-card" id="docs">
        <h2>Documentation</h2>
        <p>Security model, anti-cheat design and BOT Chain integration documents are available in this repository.</p>
      </article>
    </section>
  </main>
`;

const $ = (selector) => document.querySelector(selector);

const scoreEl = $('#score');
const bestEl = $('#best');
const stageEl = $('#stage');
const unlockedEl = $('#unlocked');
const mintableEl = $('#mintable');
const secondsEl = $('#seconds');
const penaltyEl = $('#penalty');
const lastPenaltyEl = $('#lastPenalty');
const requirementEl = $('#requirement');
const messageEl = $('#message');
const mintBtn = $('#mintBtn');
const connectBtn = $('#connectBtn');
const disconnectBtn = $('#disconnectBtn');
const walletStatus = $('#walletStatus');
// Created only by the wallet UI; no game HTML, contract, or game rules change.
const networkSwitchBtn = document.createElement('button');
networkSwitchBtn.type = 'button';
networkSwitchBtn.id = 'bqm-network-switch';
networkSwitchBtn.textContent = `Add / Switch to ${CONFIG.chainName}`;
networkSwitchBtn.hidden = true;
networkSwitchBtn.style.cssText = 'margin:8px 0;padding:10px 14px;min-height:40px;border-radius:12px;border:1px solid #60a5fa;background:#15335b;color:#fff;font-weight:700;cursor:pointer;';
walletStatus.insertAdjacentElement('afterend', networkSwitchBtn);
const soundBtn = $('#soundBtn');
const startBtn = $('#startBtn');
const antiCheatEl = $('#antiCheat');
const jumpBtn = $('#jumpBtn');
const xpProgressEl = $('#xpProgress');

let lastSnapshot = null;
let connectInProgress = false;
let disconnectInProgress = false;
let startInProgress = false;
let mintInProgress = false;
let nextRunAvailableAt = 0;
let nextRunCooldownPending = false;
let mintedMilestones = new Set();
let mintedSyncAccount = '';
let mintedSyncPromise = null;
let mintedSyncGeneration = 0;
let mintedReceiptPending = null;
let walletUiGeneration = 0;
let protectedMessageUntil = 0;

const PROGRESS_STORAGE_KEY = 'bqmProgressSnapshotV1';

function saveProgressSnapshot() {
  try {
    const highest = highestSequentialMintedMilestone();
    const payload = {
      account: walletState.account || '',
      walletName: walletState.walletName || '',
      chainName: CONFIG.chainName,
      highestMilestone: highest,
      mintedMilestones: [...mintedMilestones].sort((a, b) => a - b),
      bestScore: Number(lastSnapshot?.best || 0),
      retryLockedUntil: Number(lastSnapshot?.retryLockedUntil || 0),
      syncedAt: Date.now(),
    };
    window.localStorage?.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Progress cache is only a convenience for static pages; gameplay never trusts it.
  }
}


function setProtectedMessage(message, ms = 15000) {
  protectedMessageUntil = Date.now() + ms;
  messageEl.textContent = message;
}

function clearProtectedMessage() {
  protectedMessageUntil = 0;
}

function safeExplorerTxUrl(hash) {
  const txHash = String(hash || '');
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return '';
  try {
    const base = new URL(CONFIG.explorerUrl);
    if (base.protocol !== 'https:') return '';
    return new URL(`tx/${txHash}`, `${base.href.replace(/\/$/, '')}/`).href;
  } catch {
    return '';
  }
}

function setTransactionMessage(prefix, hash, linkLabel = 'View transaction') {
  messageEl.replaceChildren(document.createTextNode(prefix));
  const url = safeExplorerTxUrl(hash);
  if (!url) return;
  messageEl.appendChild(document.createTextNode(' '));
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = linkLabel;
  messageEl.appendChild(link);
}

function milestoneLabel(milestone) {
  if (!milestone) return 'None';
  return `#${milestone.milestone} ${milestone.name}`;
}

function requirementText(snapshot) {
  const next = snapshot.nextRequirement;
  if (!next) return 'All milestones unlocked';

  const missing = [];
  if (next.remainingScore > 0) missing.push(`${next.remainingScore.toLocaleString()} more score`);
  if (next.remainingSeconds > 0) missing.push(`${next.remainingSeconds}s more play time`);

  return `#${next.milestone} ${next.name}: ${next.score.toLocaleString()} score • ${next.minPlaySeconds}s${missing.length ? ` (${missing.join(' + ')})` : ''}`;
}

function updateSoundButton() {
  soundBtn.textContent = game.isSoundEnabled() ? 'Sound: On' : 'Sound: Off';
}

function nextSequentialMilestone() {
  return STAGE_CONFIG.find((milestone) => !mintedMilestones.has(Number(milestone.milestone))) || null;
}

function highestSequentialMintedMilestone() {
  let highest = 0;
  for (const milestone of STAGE_CONFIG) {
    if (!mintedMilestones.has(Number(milestone.milestone))) break;
    highest = Number(milestone.milestone);
  }
  return highest;
}

function formatRetryTime(seconds) {
  const safe = Math.max(0, Math.ceil(Number(seconds) || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function updateStartButton() {
  if (!startBtn) return;
  const current = game?.snapshot?.() || lastSnapshot;

  if (startInProgress) {
    startBtn.disabled = true;
    startBtn.textContent = 'Authorizing Run...';
    return;
  }

  if (current?.retrySeconds > 0) {
    startBtn.disabled = true;
    startBtn.textContent = `Auto retry in ${formatRetryTime(current.retrySeconds)}`;
    return;
  }
  // Same page: a verified run remains usable after losing all three lives.
  if (!current?.running && current?.verifiedRun?.active && current?.retryLockedUntil
      && current.retrySeconds <= 0 && !current.startLockedByMintableNft) {
    startBtn.disabled = true;
    startBtn.textContent = 'Resuming automatically...';
    return;
  }

  if (current?.running) {
    startBtn.disabled = true;
    startBtn.textContent = 'Run Active';
    return;
  }

  if (current?.startLockedByMintableNft && current?.mintableMilestone && current?.mintAllowed) {
    startBtn.disabled = true;
    startBtn.textContent = `Mint #${current.mintableMilestone.milestone} First`;
    return;
  }

  if (walletState.account && CONFIG.contractAddress) {
    if (!walletState.chainOk) {
      startBtn.textContent = `Switch to ${CONFIG.chainName} to play`;
      startBtn.disabled = true;
      return;
    }
    const next = nextSequentialMilestone();
    startBtn.textContent = next ? `Start Verified Run #${next.milestone}` : 'All NFTs Minted';
    startBtn.disabled = !next;
    return;
  }

  startBtn.disabled = false;
  startBtn.textContent = 'Start Practice Run';
}

function updateJumpButton(snapshot = lastSnapshot || game?.snapshot?.()) {
  if (!jumpBtn) return;
  const retryLocked = Number(snapshot?.retrySeconds || 0) > 0;
  const mintPreserved = Boolean(snapshot?.mintPaused || (snapshot?.startLockedByMintableNft && snapshot?.mintableMilestone && snapshot?.mintAllowed));
  const verifiedStartRequired = Boolean(!snapshot?.running && walletState.account && CONFIG.contractAddress);
  jumpBtn.disabled = retryLocked || mintPreserved || verifiedStartRequired;
  jumpBtn.title = snapshot?.mintPaused ? 'Gameplay is frozen until the NFT transaction confirms.' : retryLocked
    ? `Retry locked for ${formatRetryTime(snapshot.retrySeconds)}`
    : (verifiedStartRequired ? 'Start a verified on-chain run first.' : 'Jump');
}

function updateWalletButtons() {
  const connected = Boolean(walletState.account);
  const busy = connectInProgress || disconnectInProgress || mintInProgress || startInProgress;

  connectBtn.hidden = connected;
  disconnectBtn.hidden = !connected;
  connectBtn.disabled = busy;
  disconnectBtn.disabled = busy;
  networkSwitchBtn.hidden = !connected || walletState.chainOk || walletState.connectionType !== 'injected';
  networkSwitchBtn.disabled = busy;

  connectBtn.textContent = connectInProgress ? 'Opening wallet list...' : 'Connect Wallet';
  disconnectBtn.textContent = connected
    ? (disconnectInProgress ? 'Disconnecting...' : `Disconnect ${shortAddress(walletState.account)}`)
    : 'Disconnect';
  updateStartButton();
  updateJumpButton();
}

function updateMintButton(snapshot) {
  if (mintedReceiptPending) {
    mintBtn.disabled = mintInProgress || !walletState.chainOk || !walletState.account;
    mintBtn.textContent = `Sync confirmed NFT #${mintedReceiptPending.milestone} (no fee)`;
    return;
  }
  const mintable = snapshot?.mintableMilestone;
  const alreadyMintedLocally = mintable ? mintedMilestones.has(mintable.milestone) : false;
  const canMint = Boolean(
    !nextRunCooldownPending && Date.now() >= nextRunAvailableAt &&
    CONFIG.contractAddress
      && walletState.account
      && mintable
      && snapshot.mintAllowed
      && walletState.chainOk
      && !mintInProgress
      && !alreadyMintedLocally
  );

  mintBtn.disabled = !canMint;

  if (mintInProgress) {
    mintBtn.textContent = 'Waiting for wallet...';
    return;
  }
  if (mintable && (nextRunCooldownPending || Date.now() < nextRunAvailableAt)) {
    const remaining = Math.max(0, Math.ceil((nextRunAvailableAt - Date.now()) / 1000));
    mintBtn.textContent = nextRunCooldownPending ? 'Checking mint cooldown...' : `Mint available in ${formatRetryTime(remaining)}`;
    return;
  }

  if (!mintable) {
    mintBtn.textContent = 'Mint NFT Locked';
    return;
  }

  if (alreadyMintedLocally) {
    mintBtn.textContent = `Minted #${mintable.milestone}`;
    return;
  }

  if (!walletState.account) {
    mintBtn.textContent = `Connect wallet to mint #${mintable.milestone}`;
    return;
  }

  if (!snapshot.mintAllowed) {
    mintBtn.textContent = `Mint locked: #${mintable.milestone}`;
    return;
  }

  mintBtn.textContent = `Mint #${mintable.milestone} ${mintable.name}`;
}

async function syncMintedMilestones(force = false) {
  const account = walletState.account ? walletState.account.toLowerCase() : '';
  if (!account) {
    mintedSyncGeneration += 1;
    mintedMilestones = new Set();
    mintedSyncAccount = '';
    mintedSyncPromise = null;
    return;
  }

  if (!force && mintedSyncAccount === account) return;
  if (mintedSyncPromise && !force) return mintedSyncPromise;

  const generation = ++mintedSyncGeneration;
  const syncPromise = (async () => {
    const nextMinted = new Set();

    try {
      const highest = await getHighestCompletedMilestone();
      for (let milestone = 1; milestone <= highest; milestone += 1) nextMinted.add(milestone);
      if (highest === 0) {
        // An RPC reporting 0 while this wallet already minted #1 must not
        // silently reset the checkpoint. Cross-check a separate contract view.
        if (await hasMintedMilestone(1)) {
          nextMinted.add(1);
          for (let milestone = 2; milestone <= STAGE_CONFIG.length; milestone += 1) {
            if (generation !== mintedSyncGeneration || account !== String(walletState.account || '').toLowerCase()) return;
            if (await hasMintedMilestone(milestone)) nextMinted.add(milestone);
            else break;
          }
        }
      }
    } catch (highestErr) {
      console.warn('Could not read highest milestone in one call; falling back to individual checks:', highestErr);
      for (const milestone of STAGE_CONFIG) {
        if (generation !== mintedSyncGeneration || account !== String(walletState.account || '').toLowerCase()) return;
        try {
          if (await hasMintedMilestone(milestone.milestone)) nextMinted.add(milestone.milestone);
          else break;
        } catch (err) {
          // Never replace known progression with a partial/zero result when RPC reads fail.
          // Starting from an underestimated checkpoint would make the next on-chain start revert
          // and could misrepresent protocol-minted anti-cheat progression in the UI.
          throw new Error(`Could not verify protocol progression at milestone #${milestone.milestone}: ${err?.message || err}`);
        }
      }
    }

    // Never allow an older async provider call to overwrite a newer account's progress.
    if (generation !== mintedSyncGeneration || account !== String(walletState.account || '').toLowerCase()) return;
    mintedMilestones = nextMinted;
    mintedSyncAccount = account;
    // Restores #4 / score 4500 from NFT #3 BEFORE a new start transaction.
    // The authoritative data is from the contract, never localStorage.
    game.applyProtocolCheckpoint(highestSequentialMintedMilestone());
    updateStats(game.snapshot());
    saveProgressSnapshot();
  })();

  mintedSyncPromise = syncPromise;
  try {
    return await syncPromise;
  } finally {
    if (mintedSyncPromise === syncPromise) mintedSyncPromise = null;
  }
}

function isMobileJumpInput() {
  return Boolean(
    window.matchMedia?.('(pointer: coarse)').matches
      || /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent)
  );
}

function shouldIgnoreMobileJumpTarget(target) {
  if (!target) return false;
  return Boolean(target.closest(`
    button,
    a,
    input,
    select,
    textarea,
    label,
    summary,
    [role="button"],
    [contenteditable="true"],
    .wallet-actions,
    .game-controls,
    .mint-action,
    .primary-action,
    .ghost-action,
    .bqm-wallet-overlay,
    .bqm-wallet-modal,
    .bqm-wallet-row,
    .bqm-wallet-close
  `));
}

function installMobilePageJump() {
  document.addEventListener('pointerdown', (event) => {
    if (!isMobileJumpInput()) return;
    if (event.pointerType === 'mouse') return;
    if (shouldIgnoreMobileJumpTarget(event.target)) return;
    if (!event.target.closest('.v244-canvas-wrap, #gameCanvas')) return;

    event.preventDefault();
    game.jump();
  }, { passive: false });
}

async function refreshWalletUi() {
  const generation = ++walletUiGeneration;
  updateWalletButtons();

  if (!walletState.account) {
    mintedSyncGeneration += 1;
    mintedMilestones = new Set();
    mintedSyncAccount = '';
    mintedSyncPromise = null;
    walletStatus.textContent = CONFIG.walletConnectProjectId
      ? 'Live on BOT Chain Testnet. Connect an EVM wallet. WalletConnect supports QR/mobile pairing.'
      : 'Live on BOT Chain Testnet. WalletConnect QR requires VITE_WALLETCONNECT_PROJECT_ID in the deployed build; injected/mobile wallet browsers remain available.';
    updateStats(game.snapshot());
    return;
  }

  if (!walletState.chainOk) {
    // Do not read on-chain progress or balance from the wrong network.
    mintedSyncGeneration += 1;
    mintedMilestones = new Set();
    mintedSyncAccount = '';
    mintedSyncPromise = null;
    walletStatus.textContent = walletState.connectionType === 'walletconnect'
      ? `WalletConnect paired, but ${CONFIG.chainName} was not approved. Connect through a wallet browser that supports Bohr Testnet.`
      : `${walletState.walletName || 'Wallet'} connected • ${shortAddress(walletState.account)} • ${CONFIG.chainName} not active. Use Add / Switch network below.`;
    updateStats(game.snapshot());
    return;
  }

  await syncMintedMilestones().catch((err) => console.warn('Minted milestone sync failed:', err));
  if (generation !== walletUiGeneration || !walletState.account) return;

  try {
    const balance = await getBalanceText();
    if (generation !== walletUiGeneration || !walletState.account) return;
    const name = walletState.walletName || walletState.connectionType || 'Wallet';
    const networkLabel = walletState.chainOk ? CONFIG.chainName : `wrong network - switch to ${CONFIG.chainName}`;
    walletStatus.textContent = `${name} connected on ${networkLabel} • ${shortAddress(walletState.account)}${balance ? ` • ${balance}` : ''}${!CONFIG.contractAddress ? ' • NFT contract address is not configured: practice mode only.' : ''}`;
  } catch {
    if (generation !== walletUiGeneration || !walletState.account) return;
    walletStatus.textContent = `${CONFIG.chainName} connected • ${shortAddress(walletState.account)}${!CONFIG.contractAddress ? ' • NFT contract not configured; practice only.' : ''}`;
  }

  updateStats(game.snapshot());
  saveProgressSnapshot();
}

const game = createGame($('#gameCanvas'), {
  isMilestoneMinted(milestoneNumber) {
    return mintedMilestones.has(Number(milestoneNumber));
  },
  getHighestMintedMilestone() {
    return highestSequentialMintedMilestone();
  },
  allowAutoStart() {
    return !(walletState.account && CONFIG.contractAddress);
  },
  onAutoStartBlocked() {
    setProtectedMessage('Wallet is connected. Use Start Verified Run so the run is registered on-chain before gameplay.', 12000);
  },
  onUpdate: updateStats,
  onMilestone(snapshot) {
    // onMilestone is a SCORE event only, not an NFT mint event.
    // updateStats distinguishes practice/score progress from mint readiness.
    updateStats(snapshot);
  },
  onMintCheckpoint(snapshot) {
    updateStats(snapshot);
    setProtectedMessage(`NFT #${snapshot.mintableMilestone?.milestone} ready. Gameplay is frozen until this NFT is confirmed on BOT Chain.`, 120000);
  },
  onLifeLost(snapshot, lives) {
    updateStats(snapshot);
    messageEl.textContent = `Life lost. Remaining lives: ${lives}/${snapshot.maxLives}.`;
  },
  onPenalty(snapshot, amount, row) {
    updateStats(snapshot);
    messageEl.textContent = `Shield protected you. -${amount.toLocaleString()} score in ${row.label}.`;
  },
  onCheatFlag(snapshot, code, detail) {
    updateStats(snapshot);
    messageEl.textContent = `Anti-cheat blocked this run: ${code}. ${detail || 'Restart required.'}`;
  },
  onGameOver(snapshot) {
    updateStats(snapshot);

    if (snapshot.retrySeconds > 0) {
      const mintNote = snapshot.mintAllowed && snapshot.mintableMilestone
        ? ` ${milestoneLabel(snapshot.mintableMilestone)} remains available to mint.`
        : '';
      messageEl.textContent = `All 3 lives are used. Retry locked for ${formatRetryTime(snapshot.retrySeconds)}.${mintNote}`;
      return;
    }

    if (snapshot.mintAllowed && snapshot.mintableMilestone) {
      if (mintedMilestones.has(snapshot.mintableMilestone.milestone)) {
        messageEl.textContent = `${milestoneLabel(snapshot.mintableMilestone)} was already minted. The next milestone uses this same verified run.`;
        return;
      }

      messageEl.textContent = `${milestoneLabel(snapshot.mintableMilestone)} is ready to mint. Accidental Space/tap will not restart this run. Mint NFT now; no additional run-start transaction is needed.`;
      return;
    }

    if (snapshot.mintableMilestone && !snapshot.mintAllowed) {
      messageEl.textContent = `NFT score/time reached, but mint is blocked. ${snapshot.mintBlockedReason}`;
      return;
    }

    messageEl.textContent = `Game over. NFT mint is locked. ${requirementText(snapshot)}`;
  },
});

function updateStats(snapshot) {
  lastSnapshot = snapshot;

  scoreEl.textContent = snapshot.score.toLocaleString();
  bestEl.textContent = snapshot.best.toLocaleString();
  stageEl.textContent = snapshot.stage?.name || 'Rookie Runner';
  unlockedEl.textContent = milestoneLabel(snapshot.scoreUnlockedMilestone);
  mintableEl.textContent = milestoneLabel(snapshot.mintableMilestone);
  secondsEl.textContent = `${snapshot.playSeconds}s`;
  penaltyEl.textContent = `-${snapshot.currentPenalty.toLocaleString()} (${snapshot.penaltyWindow.label})`;
  const livesEl = $('#lives');
  if (livesEl) livesEl.textContent = `${snapshot.lives || 0}/${snapshot.maxLives || 3}`;
  const sideLivesEl = document.querySelector('.v244-side-lives');
  if (sideLivesEl) {
    sideLivesEl.innerHTML = Array.from({length: snapshot.maxLives || 3}, (_, i) =>
      `<span class="${i < (snapshot.lives || 0) ? 'alive' : 'dead'}">${i < (snapshot.lives || 0) ? '❤' : '♡'}</span>`
    ).join('');
  }
  lastPenaltyEl.textContent = snapshot.lastPenalty ? `-${snapshot.lastPenalty.toLocaleString()}` : 'None';
  requirementEl.textContent = requirementText(snapshot);
  antiCheatEl.textContent = snapshot.antiCheat?.status || 'Unknown';

  const highestMinted = highestSequentialMintedMilestone();
  if (xpProgressEl) {
    xpProgressEl.setAttribute('aria-valuenow', String(highestMinted));
    const bar = xpProgressEl.querySelector('span');
    if (bar) bar.style.width = `${(highestMinted / Math.max(1, CONFIG.maxMilestone || 12)) * 100}%`;
  }
  for (const card of document.querySelectorAll('.milestone-card[data-milestone]')) {
    const milestoneNumber = Number(card.dataset.milestone || 0);
    const status = card.querySelector('[data-milestone-status]');
    const minted = mintedMilestones.has(milestoneNumber);
    const scoreReached = snapshot.score >= Number(STAGE_CONFIG[milestoneNumber - 1]?.score || Infinity);
    const verifiedCheckpoint = Boolean(snapshot.mintPaused && snapshot.mintAllowed
      && snapshot.verifiedRun?.active && snapshot.mintableMilestone?.milestone === milestoneNumber);
    card.classList.toggle('is-minted', minted);
    card.classList.toggle('is-unlocked', !minted && verifiedCheckpoint);
    // Score alone is not mint eligibility: the contract also requires
    // an authorized on-chain run and the milestone minimum duration.
    if (status) status.textContent = minted ? 'Minted'
      : verifiedCheckpoint ? 'Ready to Mint - Game Paused'
      : scoreReached ? (snapshot.verifiedRun?.active ? 'Score reached - waiting for eligibility' : 'Score reached - practice only')
      : 'Locked';
  }

  updateMintButton(snapshot);
  updateStartButton();
  updateJumpButton(snapshot);

  if (Date.now() < protectedMessageUntil) return;
  if (mintInProgress) return;


  if (snapshot.mintPaused && snapshot.mintAllowed && snapshot.mintableMilestone) {
    messageEl.textContent = `${milestoneLabel(snapshot.mintableMilestone)} ready. Game frozen: approve Mint NFT and wait for its blockchain confirmation.`;
    return;
  }

  if (snapshot.retrySeconds > 0) {
    const mintNote = snapshot.mintAllowed && snapshot.mintableMilestone
      ? ` ${milestoneLabel(snapshot.mintableMilestone)} can still be minted.`
      : '';
    messageEl.textContent = `All 3 lives are used. Retry available in ${formatRetryTime(snapshot.retrySeconds)}.${mintNote}`;
    return;
  }

  if (snapshot.antiCheat && !snapshot.antiCheat.clean) {
    messageEl.textContent = `${snapshot.antiCheat.status} Start a new run to mint.`;
    return;
  }

  if (snapshot.mintableMilestone && snapshot.mintAllowed) {
    if (mintedMilestones.has(snapshot.mintableMilestone.milestone)) {
      messageEl.textContent = `${milestoneLabel(snapshot.mintableMilestone)} was already minted. The next milestone uses this same verified session.`;
      return;
    }

    messageEl.textContent = `${milestoneLabel(snapshot.mintableMilestone)} is mintable now. Accidental jump/tap will not restart it.`;
    return;
  }

  if (snapshot.mintableMilestone && !snapshot.mintAllowed) {
    messageEl.textContent = `${milestoneLabel(snapshot.mintableMilestone)} reached, but mint is locked. ${snapshot.mintBlockedReason}`;
    return;
  }

  if (snapshot.scoreUnlockedMilestone) {
    if (!CONFIG.contractAddress) {
      messageEl.textContent = 'Practice only: the NFT contract is not configured. Score progress does not mint NFTs. Deploy BOT V2, set VITE_CONTRACT_ADDRESS to its address, redeploy the site, connect a wallet, then start a verified run.';
      return;
    }
    if (!snapshot.verifiedRun?.active) {
      messageEl.textContent = 'Practice only: this run did not start with a verified on-chain transaction. Start Verified Run is required to unlock an actual mint checkpoint.';
      return;
    }
    messageEl.textContent = `Score reached for ${milestoneLabel(snapshot.scoreUnlockedMilestone)}. Gameplay freezes automatically once the matching verified checkpoint meets BOTH score and play-time requirements. ${requirementText(snapshot)}`;
  }
}

startBtn.addEventListener('click', async () => {
  if (startInProgress) return;

  const beforeStart = game.snapshot();
  // Honor the persistent 59-second retry lock before any on-chain start.
  if (beforeStart.retrySeconds > 0) {
    setProtectedMessage(`Retry is locked for ${formatRetryTime(beforeStart.retrySeconds)}. Wait for the timer to finish.`, 2500);
    updateWalletButtons();
    return;
  }
  if (!beforeStart.running && beforeStart.verifiedRun?.active) {
    setProtectedMessage('Your verified session is still active. After the 59-second retry, the game restarts automatically with no wallet transaction.', 7000);
    return;
  }
  if (beforeStart.running) {
    setProtectedMessage('A run is already active. Finish the current run before starting another one.', 3500);
    updateWalletButtons();
    return;
  }
  if (beforeStart.startLockedByMintableNft && beforeStart.mintableMilestone && beforeStart.mintAllowed) {
    setProtectedMessage(`NFT #${beforeStart.mintableMilestone.milestone} is ready. Mint it before starting another verified run.`, 5000);
    updateWalletButtons();
    return;
  }
  if (beforeStart.retrySeconds > 0) {
    setProtectedMessage(`Retry is locked for ${formatRetryTime(beforeStart.retrySeconds)}. Wait for the timer to finish.`, 2500);
    updateWalletButtons();
    return;
  }

  clearProtectedMessage();

  // GitHub Pages has no trusted server runtime. When a wallet and V2 contract
  // are available, the BOT Chain contract itself stores the run authorization.
  if (!walletState.account || !CONFIG.contractAddress) {
    const started = game.start();
    if (!started) {
      const locked = game.snapshot();
      setProtectedMessage(`Retry is locked for ${formatRetryTime(locked.retrySeconds)}.`, 2500);
      updateWalletButtons();
      return;
    }
    setProtectedMessage('Practice run started. Practice runs cannot mint. Connect a wallet and deploy/configure V2 to start a verified run.', 12000);
    updateStats(game.snapshot());
    return;
  }

  startInProgress = true;
  updateWalletButtons();

  try {
    await syncMintedMilestones(true);
    const next = nextSequentialMilestone();
    if (!next) throw new Error('All 12 milestone NFTs are already minted by this wallet.');

    setProtectedMessage(`Approve the Start Verified Run transaction for #${next.milestone}. Gameplay begins only after it confirms.`, 120000);
    const session = await startVerifiedRun(next.milestone);
    // A successful contract startRun(N) proves all protocol mints 1..N-1.
    // Keep the in-memory display in step if wallet events raced with syncing.
    if (session.milestone !== next.milestone) {
      throw new Error('The wallet authorized a different milestone than requested.');
    }
    for (let m = 1; m < session.milestone; m += 1) mintedMilestones.add(m);
    mintedSyncAccount = String(walletState.account || '').toLowerCase();

    const started = game.start(session);
    if (!started) {
      throw new Error(`Retry is still locked for ${formatRetryTime(game.snapshot().retrySeconds)}.`);
    }
    updateStats(game.snapshot());
    saveProgressSnapshot();
    protectedMessageUntil = Date.now() + 20000;
    setTransactionMessage(`Verified run #${session.nonce} started for NFT #${next.milestone}. Progress resumed from protocol-minted NFT #${next.milestone - 1}.`, session.hash, 'View start transaction');
  } catch (err) {
    console.error(err);
    setProtectedMessage(err.shortMessage || err.message || 'Could not start a verified run.', 30000);
  } finally {
    startInProgress = false;
    updateWalletButtons();
  }
});

$('#jumpBtn').addEventListener('click', () => game.jump());

soundBtn.addEventListener('click', () => {
  game.setSoundEnabled(!game.isSoundEnabled());
  updateSoundButton();
});

networkSwitchBtn.addEventListener('click', async () => {
  if (!walletState.account || walletState.chainOk || networkSwitchBtn.disabled) return;
  networkSwitchBtn.disabled = true;
  walletStatus.textContent = `Waiting for wallet approval to add / switch to ${CONFIG.chainName}...`;
  try {
    await requestBotNetwork();
    await refreshWalletUi();
  } catch (err) {
    const message = err?.shortMessage || err?.message || 'Could not switch networks.';
    setProtectedMessage(message, 20000);
    walletStatus.textContent = `${CONFIG.chainName} is not active. ${message}`;
  } finally {
    updateWalletButtons();
  }
});

window.addEventListener('bqm-wallet-network-error', (event) => {
  const message = event?.detail?.message || `Approve ${CONFIG.chainName} in your wallet.`;
  setProtectedMessage(message, 20000);
  walletStatus.textContent = message;
});

connectBtn.addEventListener('click', async () => {
  if (connectInProgress || walletState.account) return;

  connectInProgress = true;
  updateWalletButtons();
  walletStatus.textContent = 'Opening EVM wallet list...';

  try {
    await openWalletModal();
    walletStatus.textContent = CONFIG.walletConnectProjectId
      ? 'Wallet list opened. WalletConnect can pair by QR on desktop or mobile wallet selector.'
      : 'Wallet list opened. Use an installed wallet, or Mobile / QR to open the game inside a mobile wallet.';
  } catch (err) {
    console.error(err);
    const message = err.shortMessage || err.message || 'Could not open wallet list.';
    walletStatus.textContent = message;
    messageEl.textContent = message;
  } finally {
    connectInProgress = false;
    updateWalletButtons();
  }
});

disconnectBtn.addEventListener('click', async () => {
  if (disconnectInProgress) return;

  disconnectInProgress = true;
  updateWalletButtons();
  walletStatus.textContent = 'Disconnecting wallet and revoking permission when supported...';

  try {
    const result = await disconnectWallet();
    await refreshWalletUi();
    messageEl.textContent = result?.revoked
      ? 'Wallet disconnected and account permission was revoked by the wallet.'
      : 'Wallet disconnected from the site. Some wallets require removing the dapp from their own connections screen.';
  } catch (err) {
    console.error(err);
    const message = err.shortMessage || err.message || 'Disconnect failed.';
    walletStatus.textContent = message;
    messageEl.textContent = message;
  } finally {
    disconnectInProgress = false;
    updateWalletButtons();
  }
});

function appAssetUrl(path) {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${String(path).replace(/^\//, '')}`;
}

function nftImageUrl(milestone) {
  const safeMilestone = Math.max(1, Math.min(CONFIG.maxMilestone || 12, Math.floor(Number(milestone) || 1)));
  return appAssetUrl(`nft/${safeMilestone}.png`);
}

function removeMintPreview() {
  document.querySelector('.mint-preview-overlay')?.remove();
}

function showMintedNftPreview({ milestone, name, txHash, onDismiss = () => {} }) {
  removeMintPreview();

  const imageUrl = nftImageUrl(milestone);
  const explorerUrl = txHash ? safeExplorerTxUrl(txHash) : '';
  const overlay = document.createElement('div');
  overlay.className = 'mint-preview-overlay';
  overlay.innerHTML = `
    <div class="mint-preview-card" role="dialog" aria-modal="true" aria-label="Mint successful">
      <button class="mint-preview-close" type="button" aria-label="Close">×</button>
      <div class="mint-preview-badge">Mint successful</div>
      <div class="mint-preview-art-wrap">
        <img class="mint-preview-art" src="${imageUrl}" alt="NFT #${milestone} ${escapeHtml(name || 'Base Quest Milestone')}" />
      </div>
      <h2>Your NFT is minted</h2>
      <p class="mint-preview-title">#${milestone} ${escapeHtml(name || 'Base Quest Milestone')}</p>
      <div class="mint-preview-actions">
        ${explorerUrl ? `<a class="mint-preview-link" href="${explorerUrl}" target="_blank" rel="noopener noreferrer">View transaction</a>` : ''}
        <button class="mint-preview-secondary" type="button">Close</button>
      </div>
    </div>
  `;

  overlay.addEventListener('click', (event) => {
    if (
      event.target === overlay
      || event.target.closest('.mint-preview-close')
      || event.target.closest('.mint-preview-secondary')
    ) {
      if (!overlay.isConnected) return;
      removeMintPreview();
      onDismiss();
    }
  });

  document.body.appendChild(overlay);
}

async function loadNextRunCooldown() {
  nextRunCooldownPending = true;
  nextRunAvailableAt = Number.POSITIVE_INFINITY;
  updateMintButton(game.snapshot());
  try {
    const contract = walletState.contract;
    if (!contract || !walletState.account || !walletState.chainOk) {
      throw new Error('Wallet contract unavailable for cooldown read.');
    }
    const [lastMintAt, mintCooldown] = await Promise.all([
      contract.lastMintAt(walletState.account),
      contract.mintCooldown(),
    ]);
    nextRunAvailableAt = (Number(lastMintAt) + Number(mintCooldown)) * 1000;
    if (!Number.isFinite(nextRunAvailableAt)) throw new Error('Invalid chain cooldown.');
  } catch (err) {
    // Conservative fallback; the contract always enforces its actual cooldown.
    nextRunAvailableAt = Date.now() + 40000;
    console.warn('On-chain cooldown read failed; using temporary 40s UI fallback:', err);
  } finally {
    nextRunCooldownPending = false;
    updateMintButton(game.snapshot());
  }
}

async function syncConfirmedMintWithoutTransaction() {
  if (!mintedReceiptPending) return false;
  const pending = mintedReceiptPending;
  const chain = await getActiveRun(); // read-only eth_call
  if (!chain?.active || chain.nonce !== pending.runNonce || chain.milestone !== pending.milestone + 1) {
    throw new Error('The V2 next-stage session is not available yet; check the configured contract and RPC.');
  }
  chain.player = walletState.account;
  mintedMilestones.add(pending.milestone);
  game.markMinted(pending.milestone, chain);
  mintedReceiptPending = null;
  void loadNextRunCooldown();
  updateStats(game.snapshot());
  return true;
}

mintBtn.addEventListener('click', async () => {
  if (mintInProgress) return;
  if (mintedReceiptPending) {
    mintInProgress = true;
    try {
      await syncConfirmedMintWithoutTransaction();
    } catch (err) {
      setProtectedMessage(err.message || 'Could not sync confirmed mint; try again.', 15000);
    } finally {
      mintInProgress = false;
      updateWalletButtons();
    }
    return;
  }
  if (nextRunCooldownPending || Date.now() < nextRunAvailableAt) return;

  try {
    const mintable = lastSnapshot?.mintableMilestone;
    if (!mintable) {
      throw new Error('No NFT is mintable yet. Reach the required score and play time first.');
    }

    const payload = game.getMintPayload(mintable.milestone);

    mintInProgress = true;
    updateMintButton(lastSnapshot);
    updateWalletButtons();
    setProtectedMessage(`Preparing mint #${payload.milestone}. Your wallet should ask for gas only. Do not close this page.`, 120000);

    const result = await mintMilestone(payload.milestone, payload.score, payload.playSeconds, payload.runNonce);
    if (payload.milestone < STAGE_CONFIG.length) {
      mintedReceiptPending = { milestone: payload.milestone, runNonce: payload.runNonce, hash: result.hash };
    }

    // Confirmed receipt is not enough to guess the NEXT run: read V2's updated
    // session and ensure the SAME nonce authorizes exactly milestone + 1.
    const nextChainSession = payload.milestone < STAGE_CONFIG.length
      ? await getActiveRun()
      : null;
    if (payload.milestone < STAGE_CONFIG.length && (
      !nextChainSession?.active || nextChainSession.nonce !== payload.runNonce
      || nextChainSession.milestone !== payload.milestone + 1
    )) {
      throw new Error('NFT minted on-chain but the next-stage session is not yet readable. Check that VITE_CONTRACT_ADDRESS points to V2 and reconnect if RPC is delayed. Never send a second startRun for this NFT.');
    }
    if (nextChainSession) nextChainSession.player = walletState.account;
    mintedMilestones.add(payload.milestone);
    mintedSyncAccount = walletState.account ? walletState.account.toLowerCase() : mintedSyncAccount;
    protectedMessageUntil = Date.now() + 20000;
    setTransactionMessage(
      `NFT #${payload.milestone} confirmed. Close the NFT preview to continue from the same spot without another transaction.`,
      result.hash, 'View transaction'
    );
    // Remain frozen under the NFT preview. Otherwise hazards continue moving
    // behind the modal while the player cannot see or jump over them.
    showMintedNftPreview({
      milestone: payload.milestone,
      name: mintable.name,
      txHash: result.hash,
      onDismiss() {
        try {
          game.markMinted(payload.milestone, nextChainSession);
          mintedReceiptPending = null;
          if (payload.milestone < STAGE_CONFIG.length) {
            void loadNextRunCooldown(); // read-only; only the NEXT mint waits
          } else {
            nextRunAvailableAt = 0;
          }
          updateStats(game.snapshot());
          saveProgressSnapshot();
        } catch (err) {
          console.error('Could not resume after a confirmed mint:', err);
          setProtectedMessage(err.message || 'Mint confirmed, but next-stage sync is pending.', 15000);
          if (payload.milestone < STAGE_CONFIG.length) {
            mintedReceiptPending = { milestone: payload.milestone, runNonce: payload.runNonce, hash: result.hash };
          }
          updateWalletButtons();
        }
      },
    });
    saveProgressSnapshot();
  } catch (err) {
    console.error(err);
    setProtectedMessage(err.shortMessage || err.message || 'Mint failed.', 30000);
  } finally {
    mintInProgress = false;
    updateWalletButtons();
    updateStats(lastSnapshot || game.snapshot());
  }
});

window.addEventListener('bqm-wallet-changed', (event) => {
  if (!event?.detail?.account) mintedReceiptPending = null;
  const verified = game.snapshot()?.verifiedRun;
  const nextAccount = String(event?.detail?.account || '').toLowerCase();
  const runOwner = String(verified?.player || '').toLowerCase();
  if (verified?.active && runOwner && nextAccount !== runOwner) {
    game.clearVerifiedRun();
    setProtectedMessage('Wallet account changed. The previous verified run belongs to another address; start a new verified run.', 20000);
  }
  refreshWalletUi().catch((err) => console.warn('Wallet UI refresh failed:', err));
});

// V24.4 professional application shell
function installV244Interface() {
  const nav = document.createElement('aside');
  nav.className = 'v244-menu';
  nav.innerHTML = `
    <button class="v244-toggle" aria-label="Open navigation">☰</button>
    <nav class="v244-drawer">
      <a href="./pages/home.html">Home</a>
      <a href="./index.html" aria-current="page">Play</a>
      <a href="./pages/dashboard.html">Dashboard</a>
      <a href="./pages/nfts.html">NFT Gallery</a>
      <a href="./pages/xp.html">XP System</a>
      <a href="./pages/rules.html">Rules</a>
      <a href="./pages/about.html">About</a>
      <a href="./pages/contact.html">Contact</a>
      <a href="./pages/community.html">Community</a>
    </nav>`;
  document.body.appendChild(nav);

  const toggle = nav.querySelector('.v244-toggle');
  const drawer = nav.querySelector('.v244-drawer');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'v244-navigation');
  drawer.id = 'v244-navigation';

  const setMenuOpen = (open) => {
    nav.classList.toggle('open', Boolean(open));
    toggle.setAttribute('aria-expanded', String(Boolean(open)));
  };
  toggle.addEventListener('click', () => setMenuOpen(!nav.classList.contains('open')));
  document.addEventListener('pointerdown', (event) => {
    if (nav.classList.contains('open') && !nav.contains(event.target)) setMenuOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenuOpen(false);
  });

  const canvas = document.querySelector('#gameCanvas');
  if (canvas && !document.querySelector('.v244-canvas-wrap')) {
    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'v244-canvas-wrap';
    canvas.parentNode.insertBefore(canvasWrap, canvas);
    canvasWrap.appendChild(canvas);

    const hearts = document.createElement('div');
    hearts.className = 'v244-side-lives';
    hearts.setAttribute('aria-label', 'Player lives');
    hearts.innerHTML = '<span class="alive">❤</span><span class="alive">❤</span><span class="alive">❤</span>';
    canvasWrap.appendChild(hearts);
  }

  // V24.4 uses dedicated HTML pages. Main page keeps only the runner UI.

}
installV244Interface();

installMobilePageJump();
updateSoundButton();
updateWalletButtons();
updateStats(game.snapshot());

let previousRetrySeconds = game.snapshot().retrySeconds;
window.setInterval(() => {
  const current = game.snapshot();
  if (current.awaitingNextRun || current.retrySeconds > 0 || previousRetrySeconds > 0) {
    updateStats(current);
    updateWalletButtons();
    saveProgressSnapshot();
  }
  previousRetrySeconds = current.retrySeconds;
}, 1000);

if (!CONFIG.contractAddress) {
  messageEl.textContent = 'V2 contract is not configured. Practice mode works, but verified minting requires VITE_CONTRACT_ADDRESS pointing at deployed BOT V2.';
}
