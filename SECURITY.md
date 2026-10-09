# Security Policy — V21

## Wallet safety

Verified gameplay uses exactly two contract-write types:

1. `startRun(uint256 milestone)` before gameplay
2. `mintMilestone(uint256 milestone,uint256 clientScore,uint256 playSeconds,uint64 expectedRunNonce)` after a valid game over

Neither call is payable. The game does not request ERC-20 approvals, unlimited allowances, token transfers, NFT approvals, or seed phrases.

Reject any wallet popup that does not match the expected V21 contract address/function.

## V21 no-separate-server model

GitHub Pages remains static hosting. V21 does **not** expose a secret token in browser code and does not attempt to write live gameplay data to GitHub through a PAT.

Instead, BOT Chain stores the trusted run authorization:

- wallet
- run nonce
- target milestone
- chain start time
- active state
- challenge

The mint transaction must match that active run.

## Client anti-cheat

The browser additionally checks:

- hidden-tab invalidation
- excessive frame gaps
- clock drift
- score ledger consistency
- excessive input rate
- verified runs cannot use the client pause key
- score/time ratio
- game-over-before-mint
- one claim per local run
- sequential next milestone selection

V21 fixes a V20 flaw where losing a life reset the timer and integrity object. Lives now remain inside one continuous run, so previous anti-cheat flags are not erased.

## On-chain anti-cheat

The contract independently enforces:

- a verified run must exist
- run nonce must match
- run milestone must match
- previous milestone must already be minted
- milestone cannot already be minted
- minimum chain elapsed time
- maximum run age of 900 seconds
- client time cannot be materially ahead of chain time
- claim must arrive within the configured grace period
- minimum score
- maximum plausible score rate
- mint cooldown
- run is consumed before ERC-721 receiver callbacks

## Remaining limitation

A static browser cannot provide cryptographic proof that its reported score came from honest human gameplay. The on-chain session proves that the wallet opened a run and waited for required time; it does not fully prove every jump/collision/score event.

For high-value rewards, add a trusted verifier/signature system, ZK/verifiable gameplay proof, or another authoritative execution mechanism.

## Owner safety

Use a dedicated deployer wallet with only enough test BOT for testnet deployment. Never commit a private key, seed phrase, recovery phrase, or wallet export.

## Reporting

Use a private GitHub security advisory or direct private contact for exploitable vulnerabilities. Do not publish an active exploit before remediation.
