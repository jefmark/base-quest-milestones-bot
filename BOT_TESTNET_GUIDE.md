# BOT Chain / Bohr Testnet — V24.5 Client + V23 Contract Deployment Guide

## Network

```txt
Network: Bohr Testnet
Chain ID: 968
RPC: https://rpc.bohr.life
Explorer: https://scan.bohr.life
Gas token: BOT
Faucet: https://faucet.botchain.ai
```

## V24.5 verified mint flow

```text
startRun(next milestone)
→ confirmation
→ gameplay
→ authorized score + minimum play time reached
→ client auto-stops and locks the run for mint
→ mintMilestone(..., runNonce)
→ wallet + on-chain confirmation
→ protocol progression recorded on-chain
→ next sequential verified milestone may start
```

For milestone `n > 1`, the previous milestone must have been minted by the same wallet through this protocol. Purchased/transferred NFT ownership does not satisfy this rule.

## Phase A — GitHub validation

1. Push the V24.5 client + V23 contract to `jefmark/base-quest-milestones-bot`.
2. Open **Actions**.
3. Confirm **V24.5 Client + V23 Contract Audit** is green.
4. In **Settings → Pages**, use **GitHub Actions** as the source.
5. Confirm `https://jefmark.github.io/base-quest-milestones-bot/` opens.
6. Confirm `https://jefmark.github.io/base-quest-milestones-bot/metadata/1.json` and `/nft/1.png` load.

## Phase B — Deploy V23 contract

Preferred initial testnet method: Remix + MetaMask.

Constructor arguments:

- `initialOwner`: deployer wallet address
- `initialBaseURI`: `https://jefmark.github.io/base-quest-milestones-bot/metadata/`

**Important:** `initialBaseURI` must end with `/`. The contract builds each token URI by appending `<milestone>.json`; omitting the trailing slash would produce an invalid URL such as `metadata1.json`.

Deploy only on chain ID `968` and save the new V23 contract address.

## Phase C — GitHub Variables

```txt
VITE_CONTRACT_ADDRESS=<NEW_V23_CONTRACT>
VITE_WALLETCONNECT_PROJECT_ID=<YOUR_PROJECT_ID>
VITE_PUBLIC_APP_URL=https://jefmark.github.io/base-quest-milestones-bot/
```

The Bohr Testnet network identity is fixed in `src/config.js` (Chain ID `968`). This avoids stale GitHub variables redirecting mobile wallets to the old Base network.

Re-run **Deploy V24.5 Client to GitHub Pages**.

## Phase D — Acceptance tests

1. Wallet A starts verified milestone #1 and mints NFT #1.
2. Transfer NFT #1 from Wallet A to Wallet B.
3. Wallet B attempts to start milestone #2: it must revert with `PREVIOUS_MILESTONE_REQUIRED`.
4. Wallet A attempts to start milestone #2: it must succeed because its protocol mint history remains true.
5. Reuse an old/consumed nonce: it must fail.
6. Verify `tokenURI` resolves to the GitHub Pages metadata and artwork.

## BOT Chain review deliverables

- V23 Bohr contract address
- successful milestone mint transaction hash
- live GitHub Pages app URL
- optional full-flow screen recording

Do not deploy to BOT Mainnet until testnet review is complete.
