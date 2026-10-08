# V23 GitHub Pages + On-Chain Anti-Cheat Architecture

GitHub Pages is static hosting, not a mutable gameplay backend. V23 keeps the site on GitHub Pages and stores trusted run-session/progression state in the BOT Chain smart contract.

## Verified run lifecycle

```text
GitHub Pages frontend
  → startRun(nextMilestone)
BOT Chain V23 contract
  → stores wallet + milestone + nonce + chain timestamp + challenge
Browser game starts after confirmation
  → challenge seeds gameplay randomness
Game over
  → mintMilestone(milestone, score, playSeconds, runNonce)
BOT Chain V23 contract
  → validates active session, nonce, protocol progression, chain time, expiry and score bounds
  → consumes the run
  → records mintedByProtocol[player][milestone] = true
  → mints NFT
```

## V23 progression rule

Current NFT ownership is intentionally **not** proof of progression. Receiving/buying a prior milestone NFT does not unlock the next stage. Only a mint performed by this protocol for the same wallet creates the required progression record.

## What GitHub stores

GitHub stores source code, built Pages output, Actions logs and CI artifacts. Those artifacts are audit evidence only; they are not gameplay authority.

## Threats blocked or made harder

- mint without a prior on-chain run
- stale/replayed run nonce
- reusing a consumed run
- skipping sequential protocol progression
- unlocking progression by buying/transferring an NFT
- claiming before minimum chain elapsed time
- stale claims after 900 seconds
- obviously impossible score rates
- resetting timer/integrity state by losing a life
- identical precomputed verified-run hazard streams

## Remaining trust boundary

Without a trusted gameplay verifier, the contract cannot prove that a human honestly generated every submitted score. V23 is a substantial no-server hardening, not equivalent to server-signed or cryptographic gameplay attestation.
