# V21 GitHub Pages + On-Chain Anti-Cheat Architecture

## Why V21 does not pretend GitHub Pages is a backend

GitHub Pages hosts the built HTML/CSS/JavaScript files. GitHub Actions runs temporary CI jobs and can preserve build/test artifacts, but it is not a low-latency mutable database/API for live game sessions.

V21 therefore keeps the site on GitHub Pages and moves the **trusted run-session state** into the existing BOT Chain smart contract. No separate web server is required.

## Verified run lifecycle

```text
GitHub Pages frontend
      |
      | 1. startRun(nextMilestone)
      v
BOT Chain V21 contract
      | stores wallet + milestone + nonce + start block time + challenge
      v
Browser game starts only after start transaction confirms
      |
      | challenge seeds gameplay hazard RNG
      | browser anti-cheat watches clock/frame/input/score ledger
      v
Game over
      |
      | 2. mintMilestone(milestone, score, playSeconds, runNonce)
      v
BOT Chain V21 contract
      | verifies active session, nonce, sequential progression,
      | chain elapsed time, run expiry, score floor and score-rate ceiling
      | consumes the run before ERC-721 receiver callback
      v
NFT minted
```

## What is stored on-chain

Per wallet, only the current verified run is stored:

- monotonically increasing run nonce
- chain timestamp when the run was opened
- target milestone
- active/inactive flag
- run-specific challenge

The contract also stores the existing NFT/milestone progression.

## What GitHub stores

GitHub continues to store:

- source code
- Pages build output
- Actions logs
- 30-day CI audit artifacts containing validation/compile/test/build logs

Those GitHub artifacts are **audit evidence**, not gameplay authority.

## Threats V21 blocks or raises the cost of

- direct instant mint without a prior run session
- replaying an old run nonce after a new run begins
- reusing a consumed run for another NFT
- skipping sequential milestone ownership
- claiming before the minimum chain elapsed time
- stale run claims after 900 seconds
- obviously impossible score rates
- resetting client anti-cheat/timer state by intentionally losing a life (V20 bug fixed)
- precomputed identical obstacle streams across verified runs (challenge-seeded gameplay RNG)

## Remaining trust boundary

Without a separate trusted gameplay verifier, the contract cannot prove that a human actually produced the submitted score by playing. A technical attacker can start a real on-chain run, wait for the minimum duration, then submit a fabricated score that remains inside the contract's plausibility bounds.

Therefore V21 is materially stronger than V20 and requires no separate server, but it is **not equivalent to server-authorized/EIP-712 score attestations**. Do not attach high-value financial rewards to the score alone without adding a trusted verifier or cryptographic gameplay proof.
