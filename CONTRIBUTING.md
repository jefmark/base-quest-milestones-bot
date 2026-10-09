# Contributing — V23

This repository is the BOT Chain / Bohr Testnet V23 integration build of Base Quest Milestones. Preserve the original Base deployment/history and never reuse a BOT testnet contract address on Base or BOT Mainnet.

## Target network

```txt
Network: Bohr Testnet
Chain ID: 968
RPC: https://rpc.bohr.life
Explorer: https://scan.bohr.life
Native gas token: BOT
```

## Required checks

```bash
npm install
npm run check
npm run compile
npm test
npm run build
```

## Invariants

- Exactly 12 milestones unless contract, frontend, metadata, art, progression and docs are migrated together.
- Milestone `n > 1` requires `mintedByProtocol[player][n-1] == true`; ERC-721 ownership alone must never unlock progression.
- Verified minting requires an active `startRun` session and matching run nonce.
- A consumed/stale run nonce must never be reusable.
- A life loss must not reset the run timer or integrity state.
- No paid mint, ERC-20 approval, NFT approval or asset-transfer request is introduced without explicit review.
- No secret/private key/PAT is placed in browser code or committed to GitHub.
- `VITE_CONTRACT_ADDRESS` remains environment-specific.
- Every write validates/switches to chain ID 968.
