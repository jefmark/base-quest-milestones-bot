# V13 Runtime Build Audit

Fixed issues found before BOT Testnet deployment:

- Restored missing progression exports required by main.js.
- Separated runStage/unlockedStage usage in game initialization.
- Added compatibility helpers without changing blockchain trust model.

Audit path:
Connect Wallet -> Load Progress -> Start -> Play -> Lives -> Mint.
