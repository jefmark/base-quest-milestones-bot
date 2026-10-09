# Base Quest Milestones — BOT Chain Testnet V21

V21 is the **GitHub Pages + BOT Chain on-chain verified-run** build of Base Quest Milestones.

The original Base deployment/history remains separate. V21 is intended for **Bohr Testnet validation** before any BOT Chain mainnet decision.

## What changed in V21

V20 still relied on browser-only gameplay validation. V21 keeps GitHub Pages as the static host but moves run authorization into the smart contract, so no separate application server is required.

A mintable run now follows this sequence:

```text
Connect wallet
→ Start Verified Run
→ approve startRun transaction
→ wait for confirmation
→ browser game starts with the contract challenge
→ finish a clean run
→ Mint NFT
→ mintMilestone validates the active on-chain nonce/time/progression
→ run is consumed
```

Practice mode remains available without a configured contract/wallet, but **practice runs cannot mint**.

See `GITHUB_ONCHAIN_ANTI_CHEAT.md` for the security model and remaining limitations.

## BOT Chain test environment

```txt
Network: Bohr Testnet
Chain ID: 968
RPC: https://rpc.bohr.life
Native gas token: BOT
Explorer: https://scan.bohr.life
Faucet: https://faucet.botchain.ai
```

BOT Mainnet is separate:

```txt
Chain ID: 677
RPC: https://rpc.botchain.ai
Explorer: https://scan.botchain.ai
```

Never reuse a Bohr contract address as a BOT Mainnet address.

## 12 milestone rules

| # | Milestone | Required score | Minimum play time |
|---:|---|---:|---:|
| 1 | Rookie Runner | 1,200 | 20 s |
| 2 | Chain Jumper | 2,600 | 35 s |
| 3 | Base Sprinter | 4,500 | 50 s |
| 4 | Gasless Ghost | 7,000 | 70 s |
| 5 | Block Master | 10,000 | 90 s |
| 6 | Onchain Legend | 13,500 | 110 s |
| 7 | Quest Hunter | 18,000 | 140 s |
| 8 | Base Champion | 23,000 | 170 s |
| 9 | Chain Warrior | 30,000 | 210 s |
| 10 | Protocol Hero | 38,000 | 260 s |
| 11 | Elite Player | 48,000 | 320 s |
| 12 | Genesis Legend | 60,000 | 400 s |

The validator checks that `src/game.js` and `contracts/BaseQuestMilestones.sol` contain the same names/scores/times.

## V21 contract security controls

`contracts/BaseQuestMilestones.sol` now includes:

- `startRun(milestone)` before verified gameplay
- per-wallet monotonically increasing run nonce
- on-chain start timestamp
- run-specific challenge
- target milestone binding
- sequential NFT ownership enforcement
- one active session per wallet; a newer run invalidates the older nonce
- minimum chain-time check
- 900-second run expiry
- client/chain time consistency window
- score floor and score-rate ceiling
- consumed-run replay protection
- one NFT per milestone per wallet
- pause/unpause and mint cooldown
- non-payable flow; direct BOT transfers to the contract revert
- verified runs cannot be paused with the client pause key while chain time advances

The run is marked inactive before `_safeMint`, reducing reentrancy/replay exposure around ERC-721 receiver callbacks.

### Important limitation

The score is still submitted by the browser. With no separate trusted verifier, V21 cannot cryptographically prove that the player physically generated the score. A sophisticated attacker can open a real run, wait long enough, and fabricate a score within allowed bounds.

V21 is therefore a substantial no-server hardening, **not a substitute for a signed backend gameplay attestation system** if future rewards have high monetary value.

## GitHub Pages architecture

GitHub is used for:

- source repository
- GitHub Actions validation/compile/tests
- frontend build
- GitHub Pages hosting
- CI audit artifacts

BOT Chain is used for the persistent trusted run-session state. GitHub Pages is not used as a fake database.

## GitHub Repository Variables

Set these under:

```text
Repository → Settings → Secrets and variables → Actions → Variables
```

```txt
VITE_CHAIN_ID=968
VITE_CHAIN_NAME=Bohr Testnet
VITE_RPC_URL=https://rpc.bohr.life
VITE_EXPLORER_URL=https://scan.bohr.life
VITE_NATIVE_CURRENCY_NAME=BOT
VITE_NATIVE_CURRENCY_SYMBOL=BOT
VITE_NATIVE_CURRENCY_DECIMALS=18
VITE_CONTRACT_ADDRESS=<V21_BOHR_CONTRACT_ADDRESS>
VITE_WALLETCONNECT_PROJECT_ID=<YOUR_REOWN_PROJECT_ID>
VITE_PUBLIC_APP_URL=<OPTIONAL_CUSTOM_HTTPS_APP_URL>
```

`VITE_CONTRACT_ADDRESS` must be the **new V21 deployment**. The V20/V19 contract ABI is not compatible with the V21 verified-run mint flow.

## GitHub Actions

`.github/workflows/build.yml` performs:

1. dependency install
2. JS syntax checks
3. project consistency/security checks
4. Solidity compile
5. Hardhat contract tests
6. Vite frontend build
7. upload of CI audit logs as a 30-day GitHub artifact

`.github/workflows/deploy-pages.yml` refuses to publish until validation, contract compile, tests, and frontend build all pass.

## Local commands

```bash
npm install
npm run check
npm run compile
npm test
npm run build
npm run dev
```

## NFT metadata

Artwork:

```txt
public/nft/1.png ... public/nft/12.png
```

Metadata:

```txt
public/metadata/1.json ... public/metadata/12.json
```

The constructor base URI must point to the final GitHub Pages metadata folder and end in `/`. During `npm run build`, `scripts/finalize-metadata.mjs` rewrites the **deployed** metadata copies in `dist/metadata/` so `image` and `external_url` are absolute HTTPS URLs. On GitHub Actions the Pages URL is derived automatically from `GITHUB_REPOSITORY`; `VITE_PUBLIC_APP_URL` is only needed for a custom domain/override.

Example if the repository name remains `base-quest-milestones`:

```txt
https://jefmark.github.io/base-quest-milestones/metadata/
```

If V21 is deployed from a different repository name, use that repository's Pages URL instead.

## Deployment order

1. Push V21 to the BOT testnet repository.
2. Confirm GitHub Actions passes.
3. Enable GitHub Pages using **GitHub Actions** as the source.
4. Confirm the Pages URL and metadata URL.
5. Deploy the **V21 contract** to Bohr Testnet using that metadata base URI.
6. Put the new contract address in `VITE_CONTRACT_ADDRESS`.
7. Re-run Pages deployment.
8. Connect wallet.
9. Start Verified Run #1 and approve `startRun`.
10. Finish a valid run and mint #1.
11. Confirm both the start transaction and mint transaction on the explorer.
12. Send the V21 contract address, mint transaction hash, and live app/demo URL to the BOT Chain integration group.

## Preservation rule

Do not replace or modify the original Base deployment contract. V21 is a separate BOT Chain testnet deployment path.
