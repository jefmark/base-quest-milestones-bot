# V9 Progress Separation Audit

Implemented separation between:

## Run Stage
Temporary gameplay state.
- Current attempt
- Current lives
- Current session

## Unlocked Stage
Permanent progression.
- Derived from NFT ownership
- Cannot be permanently changed by browser storage

Rules:
- A new run starts from unlockedStage.
- Losing all three lives restarts the current unlockedStage.
- LocalStorage is only a UX cache.
- Blockchain ownership remains the source of truth.

Security note:
Full anti-cheat requires signed achievements in a later GameFi version.
