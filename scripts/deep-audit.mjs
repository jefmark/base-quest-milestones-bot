import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let failures = 0;
const fail = (message) => { failures += 1; console.error(`FAIL: ${message}`); };
const pass = (message) => console.log(`OK: ${message}`);
const assert = (condition, message) => condition ? pass(message) : fail(message);

const main = read('src/main.js');
const game = read('src/game.js');
const wallet = read('src/wallet.js');
const config = read('src/config.js');
const style = read('src/style.css');
const pagesJs = read('public/pages.js');
const pagesCss = read('public/pages.css');
const pkg = JSON.parse(read('package.json'));

assert(pkg.version === '2.4.4-testnet', 'package version is V24.4 testnet');
assert(config.includes("version: 'V24.4'"), 'runtime CONFIG version is V24.4');
assert(!/v24[123]-/i.test(main + style), 'active runner UI has no legacy V24.1/V24.2/V24.3 class namespace');
assert(!/href=["']#["']/.test(main), 'runner UI has no dead # navigation links');
assert(!/window\.alert\s*\(/.test(wallet), 'wallet flow has no blocking browser alert fallback');
assert(!/javascript:/i.test(main + wallet + pagesJs), 'UI has no javascript: links');
assert(!/http:\/\//i.test(wallet.match(/function safeWalletIconSrc[\s\S]*?\n}/)?.[0] || ''), 'wallet icon sanitizer does not allow insecure HTTP');

assert(main.includes("event.target.closest('.v244-canvas-wrap, #gameCanvas')"), 'mobile jump input is scoped to the runner canvas');
assert(!main.includes("event.target.closest('.shell')"), 'mobile jump handler does not hijack the whole page');
assert(main.includes("if (beforeStart.retrySeconds > 0)"), 'Start UI checks retry lock before starting');
assert(main.includes("if (beforeStart.running)"), 'Start UI cannot replace a currently active run');
assert(main.includes('mintedSyncGeneration') && main.includes('generation !== mintedSyncGeneration'), 'mint progression sync rejects stale async wallet responses');
assert(main.includes('walletUiGeneration') && main.includes('generation !== walletUiGeneration'), 'wallet status UI rejects stale async responses');
assert(main.includes('highestSequentialMintedMilestone()'), 'cached/static progression derives from sequential protocol-mint state');

const loseLifeStart = game.indexOf('function loseLife()');
const loseLifeEnd = game.indexOf('function endGame()', loseLifeStart);
const loseLife = game.slice(loseLifeStart, loseLifeEnd);
assert(loseLifeStart >= 0 && loseLifeEnd > loseLifeStart, 'life-loss handler exists');
assert(!/state\.(score|startedAt|distance|stageIndex|obstacles|orbs|player)\s*=/.test(loseLife), 'first/second life loss does not reset run score/time/stage/world/player');
assert(!/player\.shield\s*=/.test(loseLife), 'post-hit grace is separate from collectible shield state');
assert(loseLife.includes('state.hitCooldownUntil = performance.now() + 1500'), 'life loss applies a 1.5 second damage grace period');
assert(loseLife.includes('state.retryLockedUntil = Date.now() + RETRY_LOCK_MS'), 'third life starts retry lock');
assert(game.includes('const RETRY_LOCK_MS = 59 * 1000'), 'retry lock duration is exactly 59 seconds');
assert(game.includes('reset(state.verifiedSession);'), 'automatic retry reuses the same active verified nonce');
assert(main.includes('game.markMinted(pending.milestone, next)') &&
  main.includes('const fromReceipt = nextSessionFromMintReceipt(pending.receipt, pending)') &&
  main.includes('showMintedNftPreview({'),
  'confirmed NFT preview and next-stage resume use the same transaction receipt');
assert(main.includes("String(log?.address || '').toLowerCase() !== expectedAddress"),
  'RunAdvanced proof must come from the configured V2 contract');
assert(main.includes('const chain = await getActiveRun();'),
  'read-only eth_call fallback remains for wallets with receipts lacking logs');
assert(!main.includes('game.continueAfterMint(session)'), 'no mandatory post-mint startRun transaction in UI');
const v2Contract = read('contracts/BaseQuestMilestonesV2.sol');
assert(v2Contract.includes('legacyProtocol') && v2Contract.includes('run.milestone = uint32(milestone + 1)'), 'V2 carries historic NFTs forward and advances active nonce after mint');
assert(game.includes('writeRetryLock(state.retryLockedUntil)'), 'retry lock is persisted across refresh/reopen');
assert(game.includes('state.score = checkpointScore') && game.includes('state.integrity.scoreLedger = checkpointScore'), 'checkpoint score and anti-cheat ledger restore together');
assert(game.includes('getHighestMintedMilestone()'), 'checkpoint source is the highest protocol-minted milestone');
assert(game.includes("flagCheat('TAB_HIDDEN'") && game.includes('endGame();'), 'hidden-tab anti-cheat ends invalidated active runs cleanly');

assert(wallet.includes("const REQUIRED_METHODS = [\n  'eth_sendTransaction'"), 'WalletConnect required namespace is minimal');
assert(wallet.includes("'wallet_switchEthereumChain'") && wallet.includes("'wallet_addEthereumChain'"), 'WalletConnect chain-switch methods remain optional/compatible');
assert(wallet.includes('optionalChains: [TARGET_CHAIN_ID]'), 'WalletConnect uses optionalChains for target BOT chain');
assert(!wallet.includes('chains: [TARGET_CHAIN_ID]'), 'WalletConnect does not send deprecated/redundant required chains config');
assert(!wallet.includes('renderWalletConnectFallback') && !wallet.includes('mobile-connect-qr.png'), 'wallet picker never substitutes a website URL QR for a WalletConnect pairing QR');
assert(wallet.includes('showQrModal: true') && wallet.includes('enableExplorer: true'), 'official WalletConnect modal and wallet explorer stay enabled');
assert(wallet.includes('if (!walletConnectProjectId())'), 'wallet connection clearly requires valid WalletConnect Project ID');
assert(/const OPTIONAL_METHODS = \[\s*'eth_sendTransaction'/.test(wallet), 'BOT optional namespace contains transaction authorization');
assert(wallet.includes('optionalEvents: OPTIONAL_EVENTS'), 'BOT optional namespace declares required account/chain events');
assert(wallet.includes('resetWalletState(false);') && wallet.includes('clearProviderListeners();'), 'failed wallet connection rolls back partial provider state/listeners');
assert(wallet.includes("connectionType === 'walletconnect'"), 'disconnect path distinguishes WalletConnect sessions');
assert(wallet.includes('formatDecimalForUi'), 'wallet balance UI avoids lossy Number conversion for formatted balances');
assert(wallet.includes("walletState.account = accounts?.[0] || '';"), 'wallet signer refresh clears stale account when provider returns no accounts');
assert(!wallet.includes('rdns.includes(normalize(known))'), 'wallet identity matching uses exact RDNS instead of substring matching');
assert(wallet.includes('readContractFunctionDirect') && wallet.includes("method: 'eth_call'"), 'wallet read path has raw EIP-1193 eth_call fallback for mobile provider compatibility');
assert(main.includes('Could not verify protocol progression at milestone'), 'progression sync refuses partial/unknown protocol state on RPC failure');

const requiredPages = ['home','dashboard','nfts','xp','rules','about','contact','community'];
for (const name of requiredPages) {
  const rel = `public/pages/${name}.html`;
  if (!fs.existsSync(path.join(root, rel))) { fail(`${rel} exists`); continue; }
  const html = read(rel);
  assert(html.includes('page-menu') && html.includes('page-drawer'), `${name}.html includes shared left drawer`);
  assert(html.includes('../pages.css') && html.includes('../pages.js'), `${name}.html includes shared assets`);

  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((m) => m[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert(duplicates.length === 0, `${name}.html has no duplicate element IDs`);

  for (const match of html.matchAll(/href=["']([^"']+)["']/g)) {
    const href = match[1];
    if (/^(?:https?:|mailto:|tel:|#)/i.test(href)) continue;
    const cleanHref = href.split(/[?#]/)[0];
    let target = path.resolve(path.dirname(path.join(root, rel)), cleanHref);
    // public/ is copied to the Vite dist root, while the app index is built from root/index.html.
    // Therefore pages/*.html -> ../index.html is valid in dist even though public/index.html is absent in source.
    if (!fs.existsSync(target) && cleanHref === '../index.html') target = path.join(root, 'index.html');
    assert(fs.existsSync(target), `${name}.html internal link target exists: ${href}`);
  }
}
assert(!/V24\.3/.test(read('public/pages/rules.html')), 'Rules page no longer advertises stale V24.3 client');
assert(pagesJs.includes("window.localStorage?.getItem(PROGRESS_STORAGE_KEY)"), 'static pages read progress cache defensively');
assert(pagesJs.includes("event.key === 'Escape'"), 'static page drawer supports Escape close');

const braceBalanced = (text) => [...text].reduce((n, ch) => n + (ch === '{' ? 1 : ch === '}' ? -1 : 0), 0) === 0;
assert(braceBalanced(style), 'runner CSS braces are balanced');
assert(braceBalanced(pagesCss), 'static-pages CSS braces are balanced');

for (let i = 1; i <= 12; i += 1) {
  for (const rel of [`public/nft/${i}.png`, `public/metadata/${i}.json`, `public/nft/thumbs/${i}.webp`]) {
    const file = path.join(root, rel);
    assert(fs.existsSync(file) && fs.statSync(file).size > 0, `${rel} exists and is non-empty`);
  }
}
const nftPage = read('public/pages/nfts.html');
assert((nftPage.match(/loading="lazy"/g) || []).length === 12, 'NFT Gallery lazy-loads all 12 preview images');
assert((nftPage.match(/\.webp/g) || []).length >= 12, 'NFT Gallery uses optimized WebP previews instead of full-size mint artwork');

if (failures) {
  console.error(`\nDeep audit failed with ${failures} issue(s).`);
  process.exit(1);
}
console.log('\nDeep audit passed.');
