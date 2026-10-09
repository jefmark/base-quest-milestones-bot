# Game Progress Architecture — V23

## Permanent authoritative state

BOT Chain contract state is authoritative for:

- historical protocol mint progression (`mintedByProtocol`)
- ERC-721 token ownership (separate from progression)
- current verified run nonce
- verified run start timestamp
- verified run target milestone
- run challenge and active/consumed state

NFT ownership is **not** used to unlock later stages. A purchased/transferred NFT does not create protocol progression for the recipient.

## Browser state

Browser/localStorage data is UX-only: best score, sound preference and temporary game state. It is never trusted as permanent progression.

## Verified run

A connected wallet starts `startRun(nextMilestone)` before mint-eligible gameplay. The confirmed session is passed into the game and its challenge seeds gameplay randomness. `mintMilestone` must present the matching run nonce and pass browser integrity checks plus contract checks.

## Practice run

A run started without a verified on-chain session is practice-only and cannot mint.

## Remaining boundary

The contract can verify session age, protocol progression and replay constraints, but without a trusted gameplay verifier it cannot fully prove that the browser-reported score was honestly generated.
