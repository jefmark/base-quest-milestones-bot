import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const fail = (msg) => { console.error(`FAIL: ${msg}`); process.exitCode = 1; };
const ok = (msg) => console.log(`OK: ${msg}`);
const requireText = (text, needle, message) => {
  if (!text.includes(needle)) fail(message);
  else ok(message.replace(/^missing\s*/i, '').replace(/^does not\s*/i, ''));
};

const expectedNetwork = {
  chainId: 968,
  rpc: 'https://rpc.bohr.life',
  explorer: 'https://scan.bohr.life',
  symbol: 'BOT',
};

const gameText = read('src/game.js');
const contractText = read('contracts/BaseQuestMilestones.sol');
const configText = read('src/config.js');
const walletText = read('src/wallet.js');
const mainText = read('src/main.js');
const workflowText = read('.github/workflows/deploy-pages.yml');
const hardhatText = read('hardhat.config.cjs');
const indexText = read('index.html');
const progression = JSON.parse(read('public/progression-rules.json'));
const styleText = read('src/style.css');

const gameMilestones = [...gameText.matchAll(/\{\s*milestone:\s*(\d+),\s*name:\s*'([^']+)',\s*score:\s*(\d+),\s*minPlaySeconds:\s*(\d+)/g)]
  .map((m) => ({ id: Number(m[1]), name: m[2], score: Number(m[3]), seconds: Number(m[4]) }));

const contractMilestones = [...contractText.matchAll(/_setMilestone\((\d+),\s*(\d+),\s*(\d+),\s*true,\s*"([^"]+)"\);/g)]
  .map((m) => ({ id: Number(m[1]), score: Number(m[2]), seconds: Number(m[3]), name: m[4] }));

if (gameMilestones.length !== 12) fail(`src/game.js defines ${gameMilestones.length} milestones, expected 12`);
else ok('src/game.js defines 12 milestones');

if (contractMilestones.length !== 12) fail(`contract defines ${contractMilestones.length} milestones, expected 12`);
else ok('contract defines 12 milestones');

for (let i = 1; i <= 12; i++) {
  const g = gameMilestones.find((x) => x.id === i);
  const c = contractMilestones.find((x) => x.id === i);
  if (!g || !c) {
    fail(`milestone ${i} missing from game or contract`);
    continue;
  }
  if (g.name !== c.name || g.score !== c.score || g.seconds !== c.seconds) {
    fail(`milestone ${i} mismatch: game=${JSON.stringify(g)} contract=${JSON.stringify(c)}`);
  }
}
if (!process.exitCode) ok('frontend and contract milestone rules match');

if (!/MAX_MILESTONE\s*=\s*12/.test(contractText)) fail('contract MAX_MILESTONE is not 12');
else ok('contract MAX_MILESTONE = 12');

if (!/MAX_RUN_SECONDS\s*=\s*900/.test(contractText)) fail('contract MAX_RUN_SECONDS is not 900');
else ok('contract run expiry = 900 seconds');

if (!/MAX_SCORE_PER_SECOND\s*=\s*540/.test(contractText)) fail('contract MAX_SCORE_PER_SECOND is not 540');
else ok('contract score-rate ceiling = 540/sec');

if (!contractText.includes('function startRun(uint256 milestone)')) fail('V23 on-chain startRun authorization is missing');
else ok('V23 on-chain startRun authorization is present');

if (!contractText.includes('expectedRunNonce')) fail('V23 mint replay nonce check is missing');
else ok('V23 mint binds to an expected run nonce');

if (!contractText.includes('require(run.nonce == expectedRunNonce, "BAD_RUN_NONCE")')) fail('contract does not reject stale/replayed run nonces');
else ok('contract rejects stale/replayed run nonces');

if (!contractText.includes('mapping(address => mapping(uint256 => bool)) public mintedByProtocol')) fail('V23 protocol mint history mapping is missing');
else ok('V23 protocol mint history mapping is present');

if (!contractText.includes('require(mintedByProtocol[player][milestone - 1], "PREVIOUS_MILESTONE_REQUIRED")')) fail('V23 progression can be unlocked without protocol mint history');
else ok('V23 progression requires protocol mint history, not NFT ownership');

if (!contractText.includes('require(elapsed >= m.minPlaySeconds, "RUN_TOO_FAST")')) fail('contract lacks chain-time minimum');
else ok('contract enforces minimum duration using block timestamp');

if (!contractText.includes('require(elapsed <= MAX_RUN_SECONDS, "RUN_EXPIRED")')) fail('contract lacks verified-run expiry');
else ok('contract expires stale verified runs');

if (!contractText.includes('run.active = false;')) fail('contract does not consume verified run before mint callback');
else ok('verified run is consumed before ERC-721 receiver callback');

if (!/maxMilestone:\s*12/.test(configText)) fail('frontend maxMilestone is not 12');
else ok('frontend maxMilestone = 12');

if (!configText.includes("version: 'V24.4'")) fail('frontend CONFIG version is not V24.4');
else ok('frontend CONFIG version = V24.4');

if (!new RegExp(`chainId: Number\\(import\\.meta\\.env\\.VITE_CHAIN_ID \\|\\| ${expectedNetwork.chainId}\\)`).test(configText)) {
  fail(`default frontend chain ID is not ${expectedNetwork.chainId}`);
} else ok(`default chain ID = ${expectedNetwork.chainId}`);

if (!configText.includes(expectedNetwork.rpc)) fail('default BOT testnet RPC is missing');
else ok(`default RPC = ${expectedNetwork.rpc}`);

if (!configText.includes(expectedNetwork.explorer)) fail('default BOT testnet explorer is missing');
else ok(`default explorer = ${expectedNetwork.explorer}`);

if (!configText.includes("VITE_NATIVE_CURRENCY_SYMBOL || 'BOT'")) fail('native currency default is not BOT');
else ok('native currency default = BOT');

if (/name:\s*'Ether'|symbol:\s*'ETH'|toFixed\(5\)\} ETH/.test(walletText)) fail('wallet still contains a hard-coded ETH/Ether network/balance label');
else ok('wallet has no hard-coded ETH/Ether network/balance label');

if (!walletText.includes('symbol: CONFIG.nativeCurrencySymbol')) fail('wallet does not use configured native currency symbol');
else ok('wallet uses configured native currency for network-add flow');

if (!walletText.includes("walletState.account = accounts?.[0] || '';")) fail('wallet signer refresh can retain a stale disconnected account');
else ok('wallet signer refresh clears stale accounts');

if (walletText.includes('rdns.includes(normalize(known))')) fail('wallet RDNS matching accepts unsafe substring identity matches');
else ok('wallet RDNS matching uses exact wallet identity values');

if (!walletText.includes('readContractFunctionDirect') || !walletText.includes("method: 'eth_call'")) fail('raw EIP-1193 contract read fallback is missing');
else ok('raw EIP-1193 contract read fallback is available for mobile wallet compatibility');

if (!walletText.includes("iface.encodeFunctionData(functionName, args)")) fail('mobile-safe raw transaction helper is missing');
else ok('mobile-safe raw transaction helper handles contract writes');

if (!walletText.includes("'startRun'")) fail('wallet has no verified-run start transaction');
else ok('wallet can send verified-run start transaction');

if (!walletText.includes('runNonce')) fail('wallet mint path does not pass run nonce');
else ok('wallet mint path passes run nonce');

if (!gameText.includes('function getNextUnmintedMilestone()')) fail('game does not select the next unminted sequential milestone');
else ok('game selects the next unminted sequential milestone');

if (!gameText.includes('mintCompletedForRun')) fail('one-claim-per-run guard is missing');
else ok('one-claim-per-run guard is present');

if (!gameText.includes('verifiedSession')) fail('game has no verified-session state');
else ok('game tracks verified-session state');

if (!gameText.includes('seededRandomFromChallenge')) fail('game does not bind gameplay RNG to the on-chain run challenge');
else ok('verified gameplay RNG is seeded from the on-chain challenge');

const loseLifeBlock = gameText.slice(gameText.indexOf('function loseLife()'), gameText.indexOf('function endGame()'));
if (/createIntegrityState\(\)|state\.startedAt\s*=/.test(loseLifeBlock)) fail('life loss resets run timer/integrity state');
else ok('life loss preserves the same run timer and integrity state');

if (/state\.obstacles\s*=\s*\[\]|state\.orbs\s*=\s*\[\]|state\.player\.y\s*=/.test(loseLifeBlock)) {
  fail('single-life loss still resets world objects or player position');
} else ok('single-life loss continues from the same gameplay position');

if (/state\.player\.shield\s*=/.test(loseLifeBlock)) {
  fail('single-life damage grace incorrectly mutates collectible shield state');
} else ok('single-life damage grace is independent from collectible shield state');

if (!gameText.includes('performance.now() < state.hitCooldownUntil')) {
  fail('post-hit invulnerability guard is missing from collision handling');
} else ok('post-hit invulnerability guard prevents rapid multi-life loss');

if (!gameText.includes('const RETRY_LOCK_MS = 3 * 60 * 1000')) fail('3-minute retry lock constant is missing');
else ok('3-minute retry lock is configured');

if (!gameText.includes('writeRetryLock(state.retryLockedUntil)')) fail('retry lock is not persisted after all lives are consumed');
else ok('retry lock persists across refresh/reopen');

const startBlock = gameText.slice(gameText.indexOf('function start(verifiedSession'), gameText.indexOf('resize();', gameText.indexOf('function start(verifiedSession')));
if (!startBlock.includes('Date.now() < state.retryLockedUntil') || !startBlock.includes('return false')) {
  fail('game.start can bypass the retry timer');
} else ok('game.start cannot bypass the retry timer');

const retryGuardIndex = mainText.indexOf('if (beforeStart.retrySeconds > 0)');
const verifiedStartIndex = mainText.indexOf('const session = await startVerifiedRun(next.milestone)');
if (retryGuardIndex < 0 || verifiedStartIndex < 0 || retryGuardIndex > verifiedStartIndex) {
  fail('Start button handler can submit/start during retry lock');
} else ok('Start button handler blocks gameplay before wallet/on-chain start while retry is active');

if (!mainText.includes('if (beforeStart.running)')) fail('Start button can replace a currently active run');
else ok('Start button cannot replace a currently active run');

if (!mainText.includes("event.target.closest('.v244-canvas-wrap, #gameCanvas')") || mainText.includes("event.target.closest('.shell')")) {
  fail('mobile jump input is not safely scoped to the runner canvas');
} else ok('mobile jump input is scoped to the runner canvas and does not hijack page scrolling');

if (!mainText.includes('getHighestMintedMilestone()')) fail('game is not wired to protocol-minted checkpoint state');
else ok('game restart checkpoint is driven by protocol-minted milestones');

if (!gameText.includes('state.score = checkpointScore') || !gameText.includes('state.integrity.scoreLedger = checkpointScore')) {
  fail('checkpoint score and anti-cheat ledger are not restored together');
} else ok('checkpoint score and anti-cheat ledger restart together');

if (!mainText.includes('game.markMinted(payload.milestone)')) fail('main flow does not mark a successful run claim as consumed');
else ok('successful mint consumes the current run claim');

if (!mainText.includes('startVerifiedRun(next.milestone)')) fail('UI does not create an on-chain run before verified gameplay');
else ok('UI creates on-chain run before verified gameplay');

if (!mainText.includes('payload.runNonce')) fail('UI mint does not use the verified run nonce');
else ok('UI mint uses the verified run nonce');

if (!workflowText.includes('actions/deploy-pages@v4')) fail('GitHub Pages deploy action is missing');
else ok('GitHub Pages deployment workflow is present');

if (!gameText.includes("if (state.verifiedSession?.active) return;")) fail('verified runs can still be paused with KeyP');
else ok('verified runs cannot advance on-chain time while client gameplay is paused');

if (!walletText.includes("escapeHtml(pickerState.message ||")) fail('wallet picker status can be injected into HTML without escaping');
else ok('wallet picker dynamic status text is HTML-escaped');

if (walletText.includes('window.alert(message)')) fail('wallet connection errors still fall back to blocking browser alerts');
else ok('wallet connection errors stay inside the wallet UI');

if (walletText.includes('renderWalletConnectFallback') || walletText.includes('mobile-connect-qr.png')) {
  fail('wallet contains a fake website URL QR fallback instead of genuine WalletConnect pairing');
} else ok('wallet no longer presents website-link QR as a WalletConnect pairing code');

if (!walletText.includes("if (!walletConnectProjectId())") || !walletText.includes('showQrModal: true')) {
  fail('WalletConnect Project ID validation or official QR modal is missing');
} else ok('WalletConnect requires a configured Project ID and displays its official QR modal');

if (!/const OPTIONAL_METHODS = \[\s*'eth_sendTransaction'/.test(walletText)) {
  fail('WalletConnect optional BOT namespace does not include eth_sendTransaction');
} else ok('optional BOT namespace requests eth_sendTransaction for authorized mint/startRun');

if (!walletText.includes('optionalChains: [TARGET_CHAIN_ID]') || walletText.includes('chains: [TARGET_CHAIN_ID]')) {
  fail('WalletConnect BOT chain configuration is not optional-only');
} else ok('WalletConnect uses optional BOT chain to preserve pairing compatibility');

if (!walletText.includes('resetWalletState(false);') || !walletText.includes('clearProviderListeners();')) {
  fail('failed wallet connections do not fully roll back provider state/listeners');
} else ok('failed wallet connections roll back provider state/listeners');

if (!fs.existsSync(path.join(root, 'public', 'mobile-connect-qr.png'))) fail('desktop mobile-connect QR asset is missing');
else ok('desktop mobile-connect QR asset is present');

if (!mainText.includes("v244-canvas-wrap") || !styleText.includes('.v244-canvas-wrap')) {
  fail('lives HUD is not scoped to the V24.4 runner canvas');
} else ok('lives HUD is scoped to the V24.4 runner canvas');

if (styleText.includes('.v241-') || styleText.includes('.v242-') || styleText.includes('.v243-')) {
  fail('legacy V24.1/V24.2/V24.3 UI selectors remain and can conflict with V24.4');
} else ok('legacy UI selectors do not conflict with V24.4');

const requiredPages = ['home', 'dashboard', 'nfts', 'xp', 'rules', 'about', 'contact', 'community'];
for (const pageName of requiredPages) {
  const pagePath = path.join(root, 'public', 'pages', `${pageName}.html`);
  if (!fs.existsSync(pagePath)) {
    fail(`missing real page: ${pageName}.html`);
    continue;
  }
  const pageText = fs.readFileSync(pagePath, 'utf8');
  if (!pageText.includes('page-menu') || !pageText.includes('page-drawer')) {
    fail(`${pageName}.html does not include the shared left navigation drawer`);
  }
  if (!pageText.includes('../pages.css') || !pageText.includes('../pages.js')) {
    fail(`${pageName}.html is missing shared page assets`);
  }
}
if (!process.exitCode) ok('real pages share the left navigation drawer and page assets');

if (!fs.existsSync(path.join(root, 'public', 'pages.css')) || !fs.existsSync(path.join(root, 'public', 'pages.js'))) {
  fail('shared real-page CSS/JS assets are missing');
} else ok('shared real-page CSS/JS assets are present');

if (!indexText.includes('%BASE_URL%site.webmanifest') || !indexText.includes('%BASE_URL%favicon.svg')) {
  fail('manifest/favicon URLs are not GitHub Pages subpath-safe');
} else ok('manifest/favicon URLs are GitHub Pages subpath-safe');

if (/baseSepolia|baseMainnet|84532|8453/.test(hardhatText)) fail('BOT V23 Hardhat config still exposes legacy Base deployment networks');
else ok('BOT V23 Hardhat config is isolated from legacy Base deployment networks');


if (String(progression.version) !== '2.3') fail('progression-rules.json version must be 2.3');
else ok('progression-rules.json version = 2.3');

if (progression.unlockRule !== 'previous protocol mint required' || progression.progressionSource !== 'mintedByProtocol') {
  fail('progression-rules.json must use mintedByProtocol progression, not NFT ownership');
} else ok('progression-rules.json uses protocol-mint progression');

if (!walletText.includes("if (Number(receipt.status) !== 1)")) fail('wallet transaction helper does not reject mined-but-reverted receipts');
else ok('wallet rejects mined-but-reverted transaction receipts');

if (walletText.includes('https://jefmark.github.io/base-quest-milestones/')) fail('wallet still contains the legacy Base GitHub Pages fallback URL');
else ok('wallet fallback URL targets the BOT repository');

if (!Array.isArray(progression.stages) || progression.stages.length !== 12) fail('progression-rules.json must define 12 stages');
else ok('progression-rules.json defines 12 stages');

for (let i = 1; i <= 12; i++) {
  const imagePath = path.join(root, 'public', 'nft', `${i}.png`);
  const metadataPath = path.join(root, 'public', 'metadata', `${i}.json`);
  if (!fs.existsSync(imagePath)) fail(`missing NFT image ${i}.png`);
  if (!fs.existsSync(metadataPath)) {
    fail(`missing metadata ${i}.json`);
    continue;
  }
  const meta = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const g = gameMilestones.find((x) => x.id === i);
  if (g && !String(meta.name || '').startsWith(g.name)) fail(`metadata ${i}.json name does not match game title`);
  if (!meta.image) fail(`metadata ${i}.json has no image`);
  if (!Array.isArray(meta.attributes)) fail(`metadata ${i}.json attributes must be an array`);
}
if (!process.exitCode) ok('12 NFT images and metadata files are present and aligned');

if (process.exitCode) {
  console.error('\nProject validation failed.');
  process.exit(process.exitCode);
}
console.log('\nProject validation passed.');
