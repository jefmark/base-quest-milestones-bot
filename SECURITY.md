# Security Policy — V23

## Current trust model

V23 uses GitHub Pages only as static hosting. Trusted run-session and progression state lives in the BOT Chain smart contract; no private server is required.

## Progression invariant

Later milestones are unlocked by historical protocol mint records (`mintedByProtocol`), not by current ERC-721 ownership. Purchased or transferred NFTs do not unlock progression for the receiving wallet.

## Wallet safety

- Verify chain ID `968` before testnet writes.
- Verify the expected V23 contract address before approving transactions.
- Never enter a seed phrase/private key into the site or repository.
- Reject any wallet popup that does not match the expected `startRun`, `mintMilestone`, or explicit network-switch flow.

## On-chain controls

V23 requires an on-chain verified run before minting and enforces nonce binding, minimum chain time, run expiry, sequential protocol progression, one protocol mint per milestone per wallet, score bounds, pause controls and replay resistance.

## Browser controls

The browser also checks tab visibility, frame gaps, wall/performance clock drift, score ledger consistency, input rate, run duration and one-claim-per-run state. These improve abuse resistance but are not a cryptographic proof of gameplay.

## Remaining limitation

A sophisticated attacker can still bypass browser logic, start a legitimate on-chain run, wait the required time, and submit a fabricated but plausible score. Do not attach high-value financial rewards to browser score alone without a trusted verifier or cryptographic gameplay proof.

## Secrets

Commit `.env.example` only. Never commit `.env`, private keys, seed phrases, mnemonics, PATs or verifier keys.
