# BOT Chain / Bohr Testnet — V21 Deployment Guide

## Network

```txt
Network: Bohr Testnet
Chain ID: 968
RPC: https://rpc.bohr.life
Explorer: https://scan.bohr.life
Gas token: BOT
Faucet: https://faucet.botchain.ai
```

## Important V21 change

V21 uses a new contract interface. **Do not point V21 at a V19/V20 contract.**

Verified mint flow is now:

```text
startRun(next milestone) transaction
→ transaction confirms
→ gameplay begins
→ game over
→ mintMilestone(..., runNonce) transaction
```

No separate web server is required; run-session authority lives in the BOT Chain contract.

## Phase A — Push and validate on GitHub before deployment

1. Upload the V21 repository contents.
2. Commit/push to `main`.
3. Open **Actions**.
4. Confirm **V21 Build and Security Test** is green.
5. Download its `v21-ci-audit-*` artifact if you want the stored validation/compile/test/build logs.
6. In **Settings → Pages**, choose **GitHub Actions** as the source.
7. Confirm the Pages site opens.
8. Confirm `<Pages URL>/metadata/1.json` and `<Pages URL>/nft/1.png` load.

The site can run in practice mode before the contract address is configured.

## Phase B — Deploy V21 contract

Preferred first testnet method: Remix + MetaMask.

1. Select Bohr Testnet in MetaMask.
2. Confirm the deployer has test BOT.
3. Open Remix.
4. Compile `contracts/BaseQuestMilestones.sol` with Solidity `0.8.24`, optimizer enabled, 200 runs.
5. Environment: Injected Provider / MetaMask.
6. Verify chain ID is `968`.
7. Deploy constructor arguments:
   - `initialOwner`: deployer address
   - `initialBaseURI`: final GitHub Pages metadata URL ending `/`
8. Save the new V21 contract address.

## Phase C — Configure GitHub Pages

Repository Variables:

```txt
VITE_CHAIN_ID=968
VITE_CHAIN_NAME=Bohr Testnet
VITE_RPC_URL=https://rpc.bohr.life
VITE_EXPLORER_URL=https://scan.bohr.life
VITE_NATIVE_CURRENCY_NAME=BOT
VITE_NATIVE_CURRENCY_SYMBOL=BOT
VITE_NATIVE_CURRENCY_DECIMALS=18
VITE_CONTRACT_ADDRESS=<NEW_V21_CONTRACT>
VITE_WALLETCONNECT_PROJECT_ID=<YOUR_PROJECT_ID>
VITE_PUBLIC_APP_URL=<OPTIONAL_CUSTOM_DOMAIN_OVERRIDE>
```

Re-run **Deploy V21 to GitHub Pages**.

## Phase D — Acceptance test

1. Open the live GitHub Pages app.
2. Connect the test wallet.
3. The button should show `Start Verified Run #1`.
4. Press it and approve the `startRun(1)` transaction.
5. Wait for confirmation; only then does gameplay start.
6. Finish the run with at least 1,200 score and 20 seconds.
7. Mint NFT #1.
8. Approve the mint transaction.
9. Verify the start and mint transactions on `scan.bohr.life`.
10. Check `tokenURI(1)` resolves to metadata #1 and the artwork loads.

## Deliverables for BOT Chain review

- V21 Bohr contract address
- successful milestone-mint transaction hash
- live GitHub Pages app URL
- optional full-flow screen recording showing startRun → gameplay → mint

Do not deploy to BOT Mainnet until the testnet flow has been reviewed.
