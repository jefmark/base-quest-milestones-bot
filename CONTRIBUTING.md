# Contributing — V21

This repository is the BOT Chain / Bohr Testnet integration build of Base Quest Milestones. Preserve the existing Base deployment/history and never reuse a BOT testnet contract address on Base or BOT Mainnet.

## Development target

```txt
Network: Bohr Testnet
Chain ID: 968
RPC: https://rpc.bohr.life
Explorer: https://scan.bohr.life
Native gas token: BOT
```

## Required checks before a change is accepted

```bash
npm install
npm run check
npm run compile
npm test
npm run build
```

GitHub Actions runs the same validation/compile/test/build gate before Pages deployment.

## Invariants

- Exactly 12 milestones unless contract, frontend, metadata, art, progression and docs are migrated together.
- Milestone `n > 1` requires milestone `n-1` on-chain.
- Verified minting requires an active `startRun` session and matching run nonce.
- A consumed/stale run nonce must never be reusable.
- A life loss must not reset the run timer or integrity state.
- No paid mint, ERC-20 approval, NFT approval or asset-transfer request is introduced without explicit review.
- No secret/private key/PAT is placed in browser code or committed to GitHub.
- `VITE_CONTRACT_ADDRESS` remains environment-specific.
- Every write validates/switches to chain ID 968.

## Security model

GitHub Pages is static hosting. Runtime verified-run authority lives in the BOT Chain contract, not in GitHub cache/artifacts/localStorage.

Client score is still not cryptographic gameplay proof. See `GITHUB_ONCHAIN_ANTI_CHEAT.md` and `SECURITY.md` before changing reward value or trust assumptions.
