# Base Quest Milestones — V21 Final Delivery Report

Date: 2026-10-08
Target: BOT Chain Bohr Testnet
Hosting: GitHub Pages + GitHub Actions
Trusted live run state: BOT Chain V21 smart contract (not GitHub storage)

## Requirement decision

GitHub Pages is static hosting and GitHub-hosted Actions runners are ephemeral. Therefore V21 does not fake a server/database with GitHub cache or artifacts. GitHub remains the source/build/hosting/audit-log platform, while live verified-run state is persisted in the BOT Chain contract.

## Main V21 security architecture

1. Wallet connects on Bohr Testnet (chain ID 968).
2. Player presses Start Verified Run.
3. Frontend submits `startRun(nextMilestone)`.
4. Contract stores wallet, monotonically increasing run nonce, chain timestamp, target milestone, active state and challenge.
5. Gameplay starts only after the transaction confirms.
6. Verified gameplay RNG is seeded from the on-chain challenge.
7. Browser still performs local integrity checks during the run.
8. After game over, mint submits milestone, score, play time and the verified run nonce.
9. Contract validates progression, active run, nonce, milestone binding, minimum/maximum chain time, client/chain time bounds, score floor/rate ceiling and cooldown.
10. Run is consumed before `_safeMint`, preventing replay of that authorization.

## High-impact defects corrected

- V20 life-loss behavior reset the run timer/integrity object while retaining score. V21 preserves one timer/integrity context for all three lives.
- V20 browser-only mint validation could be bypassed by directly calling the contract. V21 requires a real on-chain run session and nonce before mint.
- Frontend progression is explicitly sequential and syncs from contract state.
- Successful mint consumes the local verified session and the on-chain session.
- Verified runs cannot use the client `P` pause key while on-chain time advances.
- Dynamic wallet-picker status text is HTML-escaped before insertion into modal HTML.
- Transaction hashes must match canonical 32-byte hex form before explorer links are created.
- Transaction links use HTTPS-only explorer URLs and `noopener noreferrer`.
- Wallet native currency labels use BOT rather than stale ETH text.
- GitHub Pages manifest/favicon paths use Vite `%BASE_URL%` and work under repository subpaths.
- Deployed NFT metadata is rewritten at build time to absolute HTTPS Pages URLs.
- Missing Lives UI was added.
- Owner milestone configuration rejects zero score, zero play time and empty names.
- Cooldown is enforced at verified-run start as well as mint.
- Old unused V15 progression/lives modules were removed.
- Legacy Base Sepolia/Mainnet Hardhat deployment targets were removed from the BOT-only V21 package to reduce accidental deployment risk to the preserved Base project.
- `.env.example` no longer points at the old Base Pages metadata path.

## GitHub CI/CD changes

`V21 Build and Security Test` runs:

- dependency installation
- JavaScript syntax checks
- project consistency/security validator
- Solidity compilation
- Hardhat contract tests
- Vite production build
- 30-day upload of CI audit logs as a GitHub Actions artifact

`Deploy V21 to GitHub Pages` repeats validation/compile/tests/build and only publishes `dist/` if all preceding gates pass.

GitHub artifacts are retained only as CI evidence; they are not used as live anti-cheat state.

## Contract test cases included

- mint without `startRun` rejected
- verified session creation
- too-fast mint rejected
- valid mint consumes run
- sequential progression enforced
- cooldown blocks premature next run
- stale nonce rejected
- implausible score rate rejected
- expired run rejected
- cancelled run cannot mint
- materially client-ahead time rejected
- delayed claim outside grace period rejected
- progression and tokenURI checked after mint
- unsafe owner milestone configuration rejected
- direct native BOT transfer rejected

## Validation completed locally

PASS:

- syntax check across Vite/Hardhat config, source, scripts and tests
- 12 frontend milestone definitions
- 12 contract milestone definitions
- name/score/minimum-time parity between frontend and contract
- chain ID 968 / RPC / explorer / BOT currency defaults
- verified-run/nonce/time/expiry/consumption pattern checks
- sequential progression checks
- life-loss integrity regression check
- challenge-seeded verified RNG check
- verified-run pause restriction check
- wallet-picker escaping check
- GitHub Pages subpath asset check
- BOT-only Hardhat deployment isolation check
- both workflow YAML files parsed
- package/manifest/progression/12 metadata JSON files parsed
- no duplicate authored DOM IDs
- 12 NFT/metadata pairs present and aligned
- no TODO/FIXME/HACK/XXX markers in active source
- no high-risk Solidity primitive pattern (`tx.origin`, `delegatecall`, `selfdestruct`, inline assembly, raw value calls)
- no embedded deployer private key / private-key PEM / obvious seed phrase pattern
- metadata finalizer smoke test for `https://jefmark.github.io/base-quest-milestones-bot/`

## Environment limitation

This execution environment cannot resolve `registry.npmjs.org`, so dependencies cannot be installed here. Consequently I do **not** claim that Hardhat compilation, Hardhat runtime tests, or the Vite production build executed locally.

The GitHub workflows deliberately make all three mandatory gates before Pages publication. After upload, the first acceptance condition is that both V21 GitHub Actions workflows turn green.

## Remaining security boundary

V21 is stronger than a browser-only anti-cheat system but is not equivalent to a trusted gameplay server. Without a separate verifier, the contract cannot cryptographically prove each jump/collision/score event. A sophisticated attacker can still open a legitimate on-chain run, wait enough chain time, bypass the browser, and submit a fabricated score that remains within the contract's plausibility bounds.

For future high-value economic rewards, use a trusted signed verifier (for example EIP-712 authorization), verifiable execution/ZK gameplay proof, or another authoritative execution layer.

## Deployment rule

V21 changed the contract ABI. Deploy a **new V21 contract on Bohr Testnet** and configure `VITE_CONTRACT_ADDRESS` with that address. Do not use a V19/V20 contract address, and do not modify the preserved Base deployment.
