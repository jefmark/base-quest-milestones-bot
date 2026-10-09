# Base Quest Milestones — V21 GitHub/On-Chain Security Audit

## Scope

Source: `BaseQuest_BOT_Testnet_v20_INTEGRATION_READY`
Output: `BaseQuest_BOT_Testnet_v21_GITHUB_ONCHAIN_HARDENED`
Target: BOT Chain Bohr Testnet, GitHub Actions + GitHub Pages, no separate application server.

## Architecture decision

A true mutable server-side anti-cheat API cannot be hosted inside GitHub Pages. GitHub Actions/cache/artifacts are CI storage, not a live trusted API/database for browser sessions. V21 therefore keeps the frontend on GitHub Pages and places the trusted run-session state in the BOT Chain smart contract that the project already needs.

GitHub Actions artifacts are used only to preserve CI audit evidence for 30 days.

## High-impact fixes

### 1. Added on-chain verified run sessions

New `startRun(milestone)` transaction stores:

- player wallet (mapping key)
- monotonically increasing nonce
- chain timestamp
- target milestone
- active flag
- per-run challenge

`mintMilestone` now requires the matching nonce and consumes the run.

### 2. Blocked stale/replayed run claims

Starting a newer run increments the nonce. A mint using an older nonce reverts with `BAD_RUN_NONCE`. A successful mint marks the active run inactive before `_safeMint`.

### 3. Added authoritative chain-time checks

The contract now enforces:

- milestone minimum elapsed time from `block.timestamp`
- maximum verified-run age: 900 seconds
- client time cannot materially exceed chain elapsed time
- claim must arrive within the post-run grace window

### 4. Added on-chain score plausibility ceiling

The contract retains the milestone score floor and adds a maximum score-rate ceiling of 540 points/second plus a small burst allowance. This blocks obviously impossible score submissions even if the browser is bypassed.

This is a plausibility check, not full gameplay proof.

### 5. Fixed a V20 integrity reset bug on life loss

V20 recreated `startedAt` and the entire integrity state whenever a life was lost while preserving accumulated score. Consequences included:

- total play time could restart after a collision
- previous anti-cheat flags could be erased
- browser time could diverge from an on-chain start time

V21 preserves one timer and one integrity object across all three lives. Only the player/hazards are reset between lives.

### 6. Bound verified gameplay RNG to the on-chain challenge

Verified runs seed hazard/orb generation from the contract challenge. This gives each authorized run its own deterministic gameplay seed and reduces simple reuse of a precomputed identical random stream.

The challenge is public and is not treated as a secret/proof.

### 7. Added explicit practice mode

Without a connected wallet/configured V21 contract, the game can still run as practice. Practice runs are explicitly non-mintable.

When a wallet + V21 contract are available, auto-start through Space/tap is blocked while idle; the player must use **Start Verified Run** so the on-chain session is created first.

### 8. Corrected BOT balance display

The network-add flow already used BOT, but the wallet balance string still displayed `ETH`. V21 displays the configured native symbol (`BOT`).

### 9. Hardened transaction hash handling / DOM output

V20 accepted any string returned by `eth_sendTransaction` as a transaction hash and later inserted it into HTML messages. V21:

- requires a canonical `0x` + 64 hex transaction hash
- builds transaction-message links with DOM APIs rather than raw `innerHTML`
- only creates explorer links from an HTTPS explorer base
- adds `noopener noreferrer` to external transaction links

### 10. Improved NFT metadata deployment compatibility

Source metadata remains repository-portable, but `npm run build` now runs `scripts/finalize-metadata.mjs`, which rewrites deployed `dist/metadata/*.json` image/external URLs to absolute HTTPS GitHub Pages URLs. GitHub repository owner/name are used automatically; `VITE_PUBLIC_APP_URL` can override for a custom domain.

### 11. Removed stale platform configuration

- removed the old `base:app_id` meta tag from the BOT testnet build
- changed the HTML description/title to BOT Chain Testnet
- removed unused `vercel.json`; V21's deployment target is GitHub Pages
- added the web manifest link and favicon link

### 12. Added missing Lives UI

The game already maintained three lives but the current UI had no `#lives` element, so the update code silently found nothing. V21 adds the Lives stat (`3/3`).

### 13. Hardened owner milestone configuration

`_setMilestone` now rejects zero score, zero play time and empty milestone names.

### 14. Moved cooldown enforcement to run start as well

A player cannot open a new verified run while still inside the mint cooldown, preventing a confusing case where a short next run succeeds in-game but then reverts at mint solely because the previous cooldown is still active. The mint path also retains the cooldown check.

### 15. CI/CD security gate expanded

Before GitHub Pages deployment, Actions now performs:

1. JavaScript syntax checks
2. V21 consistency/security validator
3. Solidity compile
4. Hardhat security tests
5. Vite production build
6. Pages artifact upload/deploy

A separate build workflow stores CI log files in a 30-day GitHub artifact. `set -o pipefail` is used so piping output through `tee` cannot hide a failing test command.

## Added contract tests

`test/BaseQuestMilestones.v21.test.cjs` covers:

- mint without `startRun` rejected
- verified session creation
- too-fast mint rejected
- successful valid mint consumes run
- sequential milestone enforcement
- mint cooldown blocks premature next-run authorization
- stale nonce replay rejected
- impossible score rate rejected
- expired run rejected
- direct native-token transfer rejected
- cancelled run cannot mint
- materially client-ahead play time rejected
- delayed claim outside grace window rejected
- progression/tokenURI remain correct after mint
- unsafe zero/empty owner milestone configuration rejected

## Validation executed in this environment

Passed:

- syntax check for all source/scripts JavaScript
- 12 game milestone definitions found
- 12 contract milestone definitions found
- name/score/time equality across game + contract
- BOT chain ID/RPC/explorer/native symbol checks
- verified-run/nonce/time/expiry contract pattern checks
- wallet startRun/mint nonce integration checks
- V20 life-loss timer/integrity reset regression check
- challenge-seeded verified RNG check
- GitHub Pages workflow presence
- all 12 NFT image + metadata files present
- all JSON files parsed
- both GitHub workflow YAML files parsed
- no duplicate HTML IDs in generated main UI template
- no embedded private-key block detected

## Validation not executable locally

The execution environment could not resolve `registry.npmjs.org`, so dependency installation timed out. Therefore the following could not truthfully be executed locally:

- Vite production build
- Solidity/Hardhat compilation
- Hardhat runtime tests

The V21 GitHub workflows are deliberately configured to run all three and **block Pages deployment if any fails**. This is the first thing to verify after uploading V21 to GitHub.

## Remaining security limitation

V21 does not claim full server-grade score proof. A sophisticated attacker can still:

1. open a legitimate on-chain run,
2. wait the minimum required duration,
3. bypass the browser,
4. submit a fabricated score that is inside the contract's allowed plausibility range.

Fully preventing that class of attack requires a trusted gameplay verifier, signed EIP-712 authorization, verifiable execution/ZK proof, or another authoritative mechanism outside a static GitHub Pages client.

## Deployment compatibility warning

V21 changed the contract ABI from V20. The frontend must be paired with a **new V21 Bohr Testnet contract deployment**. Do not configure the V21 frontend with the V19/V20 contract address.

## Final hardening pass before delivery

A final static review added four additional corrections:

- Dynamic wallet-picker status messages are HTML-escaped before `innerHTML` rendering, closing an avoidable DOM-injection surface from wallet/provider error text.
- Manifest and favicon URLs use Vite `%BASE_URL%`, so they resolve correctly when GitHub Pages serves the project from a repository subpath.
- `KeyP` cannot pause a verified/mintable run. Practice mode may still pause, but an authorized on-chain run cannot intentionally freeze gameplay while chain time continues advancing.
- Unused V15 progression/lives modules and legacy Base Hardhat deployment networks/scripts were removed from the BOT-only V21 package, reducing dead code and protecting the preserved Base deployment from accidental use.
- `.env.example` no longer contains the old Base Pages metadata URL; `NFT_METADATA_BASE_URI` must be deliberately set to the final BOT repository Pages metadata path before Hardhat deployment.
