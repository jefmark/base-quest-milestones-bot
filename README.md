# Base Quest Milestones — BOT Chain Bohr Testnet — Client V24.5 / Contract V23

V24.5 is the current **GitHub Pages client**. It remains compatible with the hardened **V23 smart contract** for BOT Chain on-chain verified runs and protocol-mint progression.

The original Base deployment remains separate and must not be modified. This repository is for **Bohr Testnet validation** before any BOT Chain mainnet decision.

## V24.5 client + V23 contract security model

A mint-eligible run follows:

```text
Connect wallet
→ Start Verified Run
→ approve startRun(nextMilestone)
→ wait for confirmation
→ browser game starts using the on-chain run challenge
→ reach the authorized score + minimum play time
→ client auto-stops the verified run and locks gameplay
→ Mint NFT
→ wait for wallet + on-chain confirmation
→ next verified milestone becomes available
→ mintMilestone validates run nonce, chain time, score bounds and protocol progression
→ run is consumed
→ protocol mint history is recorded
```

Practice mode remains available without a configured contract/wallet, but practice runs cannot mint.

### Protocol-mint progression

V23 does **not** use current NFT ownership as proof of progression.

For milestone `n > 1`, the contract requires:

```solidity
mintedByProtocol[player][n - 1] == true
```

Therefore an NFT that was purchased or transferred into a wallet does not unlock the next milestone. The original wallet that legitimately minted a milestone keeps its protocol progression record even if it later transfers the NFT away.

## V24.5 final pre-deploy behavior

- A verified run stops immediately when the currently authorized milestone reaches both its score and minimum-play-time requirement. Gameplay stays locked until that NFT mint confirms on-chain.
- After a successful mint, the next sequential milestone becomes available for a fresh verified `startRun` transaction; the contract default mint cooldown is `0` for seamless progression.
- Losing life 1 or 2 keeps the same run/score/time/world state. Losing life 3 starts the persisted 3-minute gameplay retry lock.
- WalletConnect uses its official QR/mobile modal with Bohr Testnet explicitly requested for the pairing session.
- BOT writes use canonical ABI calldata only; no legacy Base builder-code suffix is appended.

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

The project validator checks that `src/game.js` and `contracts/BaseQuestMilestones.sol` contain the same milestone names, score requirements and minimum times.

## Contract security controls

`contracts/BaseQuestMilestones.sol` includes:

- `startRun(milestone)` before verified gameplay
- per-wallet monotonically increasing run nonce
- on-chain start timestamp
- run-specific challenge
- target milestone binding
- protocol-mint progression (`mintedByProtocol`), independent of NFT transfers
- one active session per wallet; a newer run invalidates the older nonce
- minimum chain-time check
- 900-second run expiry
- client/chain time consistency window
- score floor and score-rate ceiling
- consumed-run replay protection
- one protocol mint per milestone per wallet
- pause/unpause and mint cooldown
- non-payable flow; direct BOT transfers to the contract revert
- verified runs cannot be paused with the client pause key while chain time advances

The run is marked inactive before `_safeMint`, reducing reentrancy/replay exposure around ERC-721 receiver callbacks.

### Important limitation

The final score is still submitted by the browser. Without a separate trusted verifier, V23 cannot cryptographically prove that every jump/collision/score event was honestly produced. V23 substantially hardens progression and replay resistance without a server, but it is not equivalent to server-signed gameplay attestation for high-value financial rewards.

## GitHub architecture

GitHub is used for source control, Actions validation/compile/tests, frontend build, GitHub Pages hosting, and CI audit artifacts. BOT Chain stores the trusted on-chain run session and protocol-mint progression. GitHub Pages is not used as a gameplay database.

## Repository Variables

Set under `Settings → Secrets and variables → Actions → Variables`:

```txt
VITE_CONTRACT_ADDRESS=<V23_BOHR_CONTRACT_ADDRESS>
VITE_WALLETCONNECT_PROJECT_ID=<YOUR_REOWN_PROJECT_ID>
VITE_PUBLIC_APP_URL=https://jefmark.github.io/base-quest-milestones-bot/
```

Bohr Testnet identity (Chain ID `968`, RPC, explorer, BOT currency) is intentionally pinned in `src/config.js`; do not recreate the old Base-era network variables in GitHub Actions.

Do not commit private keys, seed phrases or `.env` files.

## NFT metadata

Artwork: `public/nft/1.png` ... `public/nft/12.png`

Metadata: `public/metadata/1.json` ... `public/metadata/12.json`

For this repository, the final metadata base URI is:

```txt
https://jefmark.github.io/base-quest-milestones-bot/metadata/
```

The metadata base URI **must keep the trailing `/`** because the contract appends `<milestone>.json` directly.

Use that exact URI (ending in `/`) as the constructor `initialBaseURI` when deploying the V23 contract to Bohr Testnet.

## Deployment order

1. Push the V24.5 client + V23 contract repository to `jefmark/base-quest-milestones-bot`.
2. Confirm the V24.5 Client + V23 Contract Audit workflow is green.
3. Enable GitHub Pages using **GitHub Actions** as the source.
4. Confirm `https://jefmark.github.io/base-quest-milestones-bot/` opens.
5. Confirm `/metadata/1.json` and `/nft/1.png` load from the Pages URL.
6. Deploy the **V23 contract** to Bohr Testnet with constructor base URI `https://jefmark.github.io/base-quest-milestones-bot/metadata/`.
7. Put the new address in `VITE_CONTRACT_ADDRESS`.
8. Re-run Pages deployment.
9. Connect a wallet and start Verified Run #1.
10. Finish a valid run and mint #1.
11. Verify both start and mint transactions on the Bohr explorer.
12. Test the V23 progression invariant: transferring NFT #1 to a second wallet must **not** allow that second wallet to start milestone #2.
13. Send the V23 contract address, successful mint transaction hash, and live app/demo URL to the BOT Chain integration group.

## Preservation rule

Do not replace or modify the original Base deployment contract. V23 is a separate BOT Chain testnet deployment path.
