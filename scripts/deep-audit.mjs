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
const contract = read('contracts/BaseQuestMilestones.sol');
const deployWorkflow = read('.github/workflows/deploy-pages.yml');
const finalizeMetadata = read('scripts/finalize-metadata.mjs');
const pkg = JSON.parse(read('package.json'));

assert(pkg.version === '2.4.5-testnet', 'package version is V24.5 testnet');
assert(config.includes("version: 'V24.5'"), 'runtime CONFIG version is V24.5');
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
const loseLifeEnd = game.indexOf('function endGame(', loseLifeStart);
const loseLife = game.slice(loseLifeStart, loseLifeEnd);
assert(loseLifeStart >= 0 && loseLifeEnd > loseLifeStart, 'life-loss handler exists');
assert(!/state\.(score|startedAt|distance|stageIndex|obstacles|orbs|player)\s*=/.test(loseLife), 'first/second life loss does not reset run score/time/stage/world/player');
assert(!/player\.shield\s*=/.test(loseLife), 'post-hit grace is separate from collectible shield state');
assert(loseLife.includes('state.hitCooldownUntil = performance.now() + 1500'), 'life loss applies a 1.5 second damage grace period');
assert(loseLife.includes('state.retryLockedUntil = Date.now() + RETRY_LOCK_MS'), 'third life starts retry lock');
assert(game.includes('const RETRY_LOCK_MS = 3 * 60 * 1000'), 'retry lock duration is exactly three minutes');
assert(game.includes('verifiedMilestoneReadyToStop') && game.includes("endGame('mint-ready')"), 'verified milestone auto-stops when mint conditions are reached');
assert(game.includes('state.startLockedByMintableNft && shouldPreserveMintOnGameOver'), 'pending mint lock cannot be bypassed by direct start()');
assert(!wallet.includes('BUILDER_CODE_DATA_SUFFIX') && !wallet.includes('appendBuilderCodeDataSuffix'), 'BOT transactions contain no legacy Base builder-code suffix');
assert(game.includes('writeRetryLock(state.retryLockedUntil)'), 'retry lock is persisted across refresh/reopen');
assert(game.includes('state.score = checkpointScore') && game.includes('state.integrity.scoreLedger = checkpointScore'), 'checkpoint score and anti-cheat ledger restore together');
assert(game.includes('getHighestMintedMilestone()'), 'checkpoint source is the highest protocol-minted milestone');
assert(game.includes('best: Math.floor(Math.max(state.best, getCheckpointScore()))'), 'displayed best score cannot be lower than a permanent protocol checkpoint');
assert(game.includes("endGame('retry-lock-sync')"), 'retry lock propagated from another tab stops active gameplay');
assert(game.includes("flagCheat('TAB_HIDDEN'") && game.includes("endGame('anti-cheat')"), 'hidden-tab anti-cheat ends invalidated active runs cleanly');
assert(game.includes('const checkpointFloor = getCheckpointScore()') && game.includes('Math.max(checkpointFloor, state.score + amount)'), 'penalties cannot push score below permanent protocol-minted checkpoint');
assert(game.includes("endGame('verified-run-cleared')"), 'clearing an invalid verified session stops active gameplay');
assert(main.includes('mintedSyncAccount && mintedSyncAccount !== account') && main.includes('mintedMilestones = new Set()'), 'account changes cannot temporarily inherit the previous wallet progression set');
assert(main.includes('sessionPlayer !== currentAccount'), 'verified-run start confirmation is rejected if the wallet account changed mid-transaction');
assert(main.includes('confirmedFor !== accountAfterConfirmation'), 'mint confirmation is never attributed to a different active wallet');
assert(wallet.includes("const from = String(walletState.account || '')") && wallet.includes('return { hash: receipt.hash || hash, receipt, from }'), 'transaction helper binds results to the exact sending account');
assert(wallet.includes('const confirmationProvider = new BrowserProvider(provider);') && wallet.includes('confirmationProvider.waitForTransaction(hash, 1)'), 'transaction confirmation is isolated from mutable global wallet provider state');
assert(wallet.includes("readContractFunctionDirect('getActiveRun', [result.from])"), 'start-run receipt fallback reads the exact transaction sender, not the current UI account');
assert(contract.includes('uint256 public mintCooldown = 0;'), 'contract default mint cooldown allows immediate sequential progression after confirmed mint');
assert(!/VITE_CHAIN_ID|VITE_RPC_URL|VITE_EXPLORER_URL|VITE_NATIVE_CURRENCY/.test(deployWorkflow), 'Pages workflow has no stale configurable network identity variables');
assert(deployWorkflow.includes('VITE_CONTRACT_ADDRESS must be a 20-byte EVM address') && deployWorkflow.includes('VITE_CONTRACT_ADDRESS cannot be the zero address'), 'Pages deployment rejects malformed or zero contract addresses when configured');
assert(finalizeMetadata.includes("localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])") && finalizeMetadata.includes("url.protocol !== 'https:' && !localHttp"), 'metadata finalizer rejects insecure non-local HTTP app URLs');

assert(wallet.includes("const REQUIRED_METHODS = [\n  'eth_sendTransaction'") && wallet.includes('optionalMethods: OPTIONAL_METHODS'), 'WalletConnect optional namespace includes the transaction method');
assert(wallet.includes('...REQUIRED_METHODS,') && wallet.includes("'wallet_switchEthereumChain'") && wallet.includes("'wallet_addEthereumChain'"), 'WalletConnect optional namespace includes send + chain-management methods');
assert(wallet.includes('optionalChains: [TARGET_CHAIN_ID]'), 'WalletConnect uses optionalChains for target BOT chain');
assert((wallet.match(/optionalChains: \[TARGET_CHAIN_ID\]/g) || []).length >= 2, 'WalletConnect init and connect keep BOT in the optional pairing namespace');
assert(wallet.includes('optionalEvents: OPTIONAL_EVENTS'), 'WalletConnect optional namespace subscribes to account/chain events');
assert(wallet.includes('enableMobileFullScreen: true'), 'WalletConnect mobile modal uses full-screen mobile mode');
assert(wallet.includes('walletConnectSessionSupportsTarget(provider)'), 'stale WalletConnect sessions are capability-checked before reuse');
assert(wallet.includes('const providerAccounts = Array.isArray(provider.accounts) ? provider.accounts : []'), 'WalletConnect session reuse reads provider session accounts before public RPC fallback');
assert(wallet.includes("const sessionAccounts = type === 'walletconnect' && Array.isArray(provider.accounts)") && wallet.includes("await provider.request({ method: 'eth_requestAccounts' })"), 'WalletConnect post-pair connection prefers approved session accounts over a redundant account RPC prompt');
assert(wallet.includes('normalize(walletState.account) !== normalize(nextAccount)'), 'rapid injected account-change events cannot attach a stale signer');
assert(wallet.includes('waitForTargetChain(activeProvider, 8000)'), 'wallet network switching waits for delayed mobile chain updates');
assert(config.includes('chainId: 968') && config.includes("chainName: 'Bohr Testnet'") && config.includes("rpcUrl: 'https://rpc.bohr.life'"), 'V24.5 runtime is pinned to official Bohr Testnet network identity');
assert(wallet.includes("pickerState.view = 'mobile-fallback'"), 'missing WalletConnect Project ID uses non-blocking mobile/QR fallback');
assert(wallet.includes("CONFIG.walletConnectProjectId ? 'WalletConnect' : 'Mobile / QR'"), 'wallet picker labels missing-ID fallback accurately');
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
