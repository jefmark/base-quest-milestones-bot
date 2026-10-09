# Game Progress Architecture — V21

## Permanent state

BOT Chain contract state is authoritative for:

- NFT ownership / completed milestones
- sequential progression
- current verified run nonce
- verified run start timestamp
- verified run target milestone
- verified run challenge and active/consumed state

## Browser state

Browser/localStorage data is UX-only:

- best score display
- sound preference
- temporary game state

It is never trusted as permanent progression.

## Verified run

A connected wallet starts `startRun(nextMilestone)` before mint-eligible gameplay. The confirmed session is passed into the game and its challenge seeds gameplay hazard randomness. `mintMilestone` must present the matching nonce and pass both browser integrity checks and contract checks.

## Practice run

A run started without a verified on-chain session is explicitly practice-only and cannot mint.

## Remaining boundary

The contract can verify session age/progression/replay constraints, but without a trusted gameplay verifier it cannot fully prove that the browser-reported score was generated honestly.
