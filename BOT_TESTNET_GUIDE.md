# BOT Chain / Bohr Testnet — V23 Deployment Guide

## Network

```txt
Network: Bohr Testnet
Chain ID: 968
RPC: https://rpc.bohr.life
Explorer: https://scan.bohr.life
Gas token: BOT
Faucet: https://faucet.botchain.ai
```

## V23 verified mint flow

```text
startRun(next milestone)
→ confirmation
→ gameplay
→ game over
→ mintMilestone(..., runNonce)
→ protocol progression recorded on-chain
```

For milestone `n > 1`, the previous milestone must have been minted by the same wallet through this protocol. Purchased/transferred NFT ownership does not satisfy this rule.

## Phase A — GitHub validation

1. Push V23 to `jefmark/base-quest-milestones-bot`.
2. Open **Actions**.
3. Confirm **V23 Build and Security Test** is green.
4. In **Settings → Pages**, use **GitHub Actions** as the source.
5. Confirm `https://jefmark.github.io/base-quest-milestones-bot/` opens.
6. Confirm `https://jefmark.github.io/base-quest-milestones-bot/metadata/1.json` and `/nft/1.png` load.

## Phase B — Deploy V23 contract

Preferred initial testnet method: Remix + MetaMask.

Constructor arguments:

- `initialOwner`: deployer wallet address
- `initialBaseURI`: `https://jefmark.github.io/base-quest-milestones-bot/metadata/`

Deploy only on chain ID `968` and save the new V23 contract address.

## Phase C — GitHub Variables

```txt
VITE_CHAIN_ID=968
VITE_CHAIN_NAME=Bohr Testnet
VITE_RPC_URL=https://rpc.bohr.life
VITE_EXPLORER_URL=https://scan.bohr.life
VITE_NATIVE_CURRENCY_NAME=BOT
VITE_NATIVE_CURRENCY_SYMBOL=BOT
VITE_NATIVE_CURRENCY_DECIMALS=18
VITE_CONTRACT_ADDRESS=<NEW_V23_CONTRACT>
VITE_WALLETCONNECT_PROJECT_ID=<YOUR_PROJECT_ID>
VITE_PUBLIC_APP_URL=https://jefmark.github.io/base-quest-milestones-bot/
```

Re-run **Deploy V23 to GitHub Pages**.

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
