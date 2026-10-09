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
  shortAddress,
  startVerifiedRun,
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
  <article class="milestone-card">
    <div class="milestone-topline">
      <span class="milestone-number">${escapeHtml(m.milestone)}</span>
      <span class="milestone-pill">${escapeHtml(m.minPlaySeconds)}s clean run</span>
    </div>
    <h3>${escapeHtml(m.name)}</h3>
    <p>${Number(m.score).toLocaleString()} score required to unlock this Base Quest milestone NFT.</p>
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

        <div id="livesHud" class="lives-hud" aria-label="Lives">❤️ ❤️ ❤️</div>

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
        <p id="message" class="message">Finish a clean run to unlock minting.</p>
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
          Verified minting uses two contract calls: <code>startRun</code> before gameplay and
          <code>mintMilestone</code> after a valid game over. Reject approvals, transfers, or unlimited permissions.
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
        <div id="xpProgress" class="xp-progress"><span></span></div>
      </article>
      <article class="info-card" id="community">
        <h2>Community</h2>
        <p>Add your official community links here:</p>
        <div class="community-links">
          <a href="#" aria-label="Telegram">Telegram</a>
          <a href="#" aria-label="Discord">Discord</a>
          <a href="#" aria-label="X">X / Twitter</a>
          <a href="#" aria-label="GitHub">GitHub</a>
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
const soundBtn = $('#soundBtn');
const startBtn = $('#startBtn');
const antiCheatEl = $('#antiCheat');

let lastSnapshot = null;
let connectInProgress = false;
let disconnectInProgress = false;
let startInProgress = false;
let mintInProgress = false;
let mintedMilestones = new Set();
let mintedSyncAccount = '';
let mintedSyncPromise = null;
let protectedMessageUntil = 0;

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

function updateStartButton() {
  if (!startBtn) return;
  if (startInProgress) {
    startBtn.disabled = true;
    startBtn.textContent = 'Authorizing Run...';
    return;
  }

  startBtn.disabled = false;
  if (walletState.account && CONFIG.contractAddress) {
    const next = nextSequentialMilestone();
    startBtn.textContent = next ? `Start Verified Run #${next.milestone}` : 'All NFTs Minted';
    startBtn.disabled = !next;
    return;
  }

  startBtn.textContent = 'Start Practice Run';
}

function updateWalletButtons() {
  const connected = Boolean(walletState.account);
  const busy = connectInProgress || disconnectInProgress || mintInProgress || startInProgress;

  connectBtn.hidden = connected;
  disconnectBtn.hidden = !connected;
  connectBtn.disabled = busy;
  disconnectBtn.disabled = busy;

  connectBtn.textContent = connectInProgress ? 'Opening wallet list...' : 'Connect Wallet';
  disconnectBtn.textContent = connected
    ? (disconnectInProgress ? 'Disconnecting...' : `Disconnect ${shortAddress(walletState.account)}`)
    : 'Disconnect';
  updateStartButton();
}

function updateMintButton(snapshot) {
  const mintable = snapshot?.mintableMilestone;
  const alreadyMintedLocally = mintable ? mintedMilestones.has(mintable.milestone) : false;
  const canMint = Boolean(
    CONFIG.contractAddress
      && walletState.account
      && mintable
      && snapshot.mintAllowed
      && !mintInProgress
      && !alreadyMintedLocally
  );

  mintBtn.disabled = !canMint;

  if (mintInProgress) {
    mintBtn.textContent = 'Waiting for wallet...';
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
    mintedMilestones = new Set();
    mintedSyncAccount = '';
    mintedSyncPromise = null;
    return;
  }

  if (!force && mintedSyncAccount === account) return;
  if (mintedSyncPromise && !force) return mintedSyncPromise;

  mintedSyncPromise = (async () => {
    const nextMinted = new Set();

    try {
      const highest = await getHighestCompletedMilestone();
      for (let milestone = 1; milestone <= highest; milestone += 1) {
        nextMinted.add(milestone);
      }
    } catch (highestErr) {
      // Fallback for wallet/provider implementations that fail this aggregate eth_call.
      console.warn('Could not read highest milestone in one call; falling back to individual checks:', highestErr);
      for (const milestone of STAGE_CONFIG) {
        try {
          if (await hasMintedMilestone(milestone.milestone)) {
            nextMinted.add(milestone.milestone);
          } else {
            // Contract progression is sequential, so the first unminted milestone ends the scan.
            break;
          }
        } catch (err) {
          console.warn(`Could not check minted status for #${milestone.milestone}:`, err);
          break;
        }
      }
    }

    mintedMilestones = nextMinted;
    mintedSyncAccount = account;
    updateStats(lastSnapshot || game.snapshot());
  })().finally(() => {
    mintedSyncPromise = null;
  });

  return mintedSyncPromise;
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
    if (!event.target.closest('.shell')) return;

    event.preventDefault();
    game.jump();
  }, { passive: false });
}

async function refreshWalletUi() {
  updateWalletButtons();

  if (!walletState.account) {
    mintedMilestones = new Set();
    mintedSyncAccount = '';
    mintedSyncPromise = null;
    walletStatus.textContent = 'Live on BOT Chain Testnet. Connect an EVM wallet. On mobile, MetaMask/Trust opens the wallet app; WalletConnect keeps this page open.';
    updateStats(lastSnapshot || game.snapshot());
    updateStartButton();
    return;
  }

  await syncMintedMilestones().catch((err) => console.warn('Minted milestone sync failed:', err));

  try {
    const balance = await getBalanceText();
    const name = walletState.walletName || walletState.connectionType || 'Wallet';
    const networkLabel = walletState.chainOk ? CONFIG.chainName : `wrong network - switch to ${CONFIG.chainName}`;
    walletStatus.textContent = `${name} connected on ${networkLabel} • ${shortAddress(walletState.account)} • ${balance}`;
  } catch {
    walletStatus.textContent = `${CONFIG.chainName} connected • ${shortAddress(walletState.account)}`;
  }

  updateStats(lastSnapshot || game.snapshot());
}

const game = createGame($('#gameCanvas'), {
  isMilestoneMinted(milestoneNumber) {
    return mintedMilestones.has(Number(milestoneNumber));
  },
  allowAutoStart() {
    return !(walletState.account && CONFIG.contractAddress);
  },
  onAutoStartBlocked() {
    setProtectedMessage('Wallet is connected. Use Start Verified Run so the run is registered on-chain before gameplay.', 12000);
  },
  onUpdate: updateStats,
  onMilestone(snapshot) {
    updateStats(snapshot);
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

    if (snapshot.mintAllowed && snapshot.mintableMilestone) {
      if (mintedMilestones.has(snapshot.mintableMilestone.milestone)) {
        messageEl.textContent = `${milestoneLabel(snapshot.mintableMilestone)} was already minted. Tap/Space can start the next run normally.`;
        return;
      }

      messageEl.textContent = `${milestoneLabel(snapshot.mintableMilestone)} is ready to mint. Accidental Space/tap will not restart this run. Use Mint NFT now, or intentionally create a new verified run.`;
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
  const livesText = '❤️'.repeat(snapshot.lives || 0) + '♡'.repeat(Math.max(0, (snapshot.maxLives || 3) - (snapshot.lives || 0)));
  const livesEl = $('#lives');
  if (livesEl) livesEl.textContent = livesText;
  const sideLivesEl = document.querySelector('.v243-side-lives');
  if (sideLivesEl) {
    sideLivesEl.innerHTML = Array.from({length: snapshot.maxLives || 3}, (_, i) =>
      `<span class="${i < (snapshot.lives || 0) ? 'alive' : 'dead'}">${i < (snapshot.lives || 0) ? '❤' : '♡'}</span>`
    ).join('');
  }
  lastPenaltyEl.textContent = snapshot.lastPenalty ? `-${snapshot.lastPenalty.toLocaleString()}` : 'None';
  requirementEl.textContent = requirementText(snapshot);
  antiCheatEl.textContent = snapshot.antiCheat?.status || 'Unknown';

  updateMintButton(snapshot);

  if (Date.now() < protectedMessageUntil) return;
  if (mintInProgress) return;

  if (snapshot.antiCheat && !snapshot.antiCheat.clean) {
    messageEl.textContent = `${snapshot.antiCheat.status} Start a new run to mint.`;
    return;
  }

  if (snapshot.mintableMilestone && snapshot.mintAllowed) {
    if (mintedMilestones.has(snapshot.mintableMilestone.milestone)) {
      messageEl.textContent = `${milestoneLabel(snapshot.mintableMilestone)} was already minted. Use Start Verified Run for the next milestone.`;
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
    messageEl.textContent = `Score reached for ${milestoneLabel(snapshot.scoreUnlockedMilestone)}, but mint is still locked. ${requirementText(snapshot)}`;
  }
}

startBtn.addEventListener('click', async () => {
  if (startInProgress) return;
  clearProtectedMessage();

  // GitHub Pages has no trusted server runtime. When a wallet and V23 contract
  // are available, the BOT Chain contract itself stores the run authorization.
  if (!walletState.account || !CONFIG.contractAddress) {
    game.start();
    setProtectedMessage('Practice run started. Practice runs cannot mint. Connect a wallet and deploy/configure V23 to start a verified run.', 12000);
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

    game.start(session);
    updateStats(game.snapshot());
    protectedMessageUntil = Date.now() + 20000;
    setTransactionMessage(`Verified run #${session.nonce} started for NFT #${next.milestone}.`, session.hash, 'View start transaction');
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

connectBtn.addEventListener('click', async () => {
  if (connectInProgress || walletState.account) return;

  connectInProgress = true;
  updateWalletButtons();
  walletStatus.textContent = 'Opening EVM wallet list...';

  try {
    await openWalletModal();
    walletStatus.textContent = 'Wallet list opened. On Android Chrome, choose MetaMask/Trust to open the app, or WalletConnect to stay on this page.';
    await syncMintedMilestones(true).catch((err) => console.warn('Minted milestone sync failed:', err));
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

function showMintedNftPreview({ milestone, name, txHash }) {
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
      removeMintPreview();
    }
  });

  document.body.appendChild(overlay);
}

mintBtn.addEventListener('click', async () => {
  if (mintInProgress) return;

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

    mintedMilestones.add(payload.milestone);
    game.markMinted(payload.milestone);
    mintedSyncAccount = walletState.account ? walletState.account.toLowerCase() : mintedSyncAccount;
    protectedMessageUntil = Date.now() + 60000;
    setTransactionMessage(`NFT #${payload.milestone} minted.`, result.hash, 'View transaction');
    showMintedNftPreview({
      milestone: payload.milestone,
      name: mintable.name,
      txHash: result.hash,
    });
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
  const verified = game.snapshot()?.verifiedRun;
  const nextAccount = String(event?.detail?.account || '').toLowerCase();
  const runOwner = String(verified?.player || '').toLowerCase();
  if (verified?.active && runOwner && nextAccount && runOwner !== nextAccount) {
    game.clearVerifiedRun();
    setProtectedMessage('Wallet account changed. The previous verified run belongs to another address; start a new verified run.', 20000);
  }
  refreshWalletUi();
});

// V24.3 professional application shell
function installV243Interface() {
  const nav = document.createElement('aside');
  nav.className = 'v243-menu';
  nav.innerHTML = `
    <button class="v243-toggle" aria-label="Open navigation">☰</button>
    <nav class="v243-drawer">
      <a href="./pages/home.html">Home</a>
      <a href="./index.html">Play</a>
      <a href="./pages/dashboard.html">Dashboard</a>
      <a href="./pages/nfts.html">NFT Gallery</a>
      <a href="./pages/xp.html">XP System</a>
      <a href="./pages/rules.html">Rules</a>
      <a href="./pages/about.html">About</a>
      <a href="./pages/contact.html">Contact</a>
      <a href="./pages/community.html">Community</a>
    </nav>`;
  document.body.appendChild(nav);

  nav.querySelector('.v243-toggle').onclick = () => nav.classList.toggle('open');

  const canvasWrap = document.querySelector('canvas')?.parentElement;
  if (canvasWrap && !document.querySelector('.v243-side-lives')) {
    const hearts = document.createElement('div');
    hearts.className = 'v243-side-lives';
    hearts.innerHTML = '<span class="alive">❤</span><span class="alive">❤</span><span class="alive">❤</span>';
    canvasWrap.appendChild(hearts);
  }


  // V24.3 uses dedicated HTML pages. Main page keeps only the runner UI.

}
installV243Interface();

installMobilePageJump();
updateSoundButton();
updateWalletButtons();
updateStats(game.snapshot());

if (!CONFIG.contractAddress) {
  messageEl.textContent = 'V23 contract is not configured. Practice mode works, but verified minting requires VITE_CONTRACT_ADDRESS in GitHub Actions variables.';
}
