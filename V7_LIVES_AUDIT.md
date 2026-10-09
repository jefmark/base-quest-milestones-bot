# Base Quest BOT Testnet V7 Audit

Changes:
- Added 3-life run system.
- Added persistent run-state support.
- Failure no longer resets NFT progress.
- Blockchain NFT ownership remains the source of unlocked progression.
- Local storage remains UX cache only.

Test scenarios:
1. New wallet -> Stage 1, 3 lives.
2. Wallet with milestone 6 -> Stage 7, 3 lives.
3. Lose one life -> same stage, 2 lives.
4. Lose three lives -> restart current unlocked stage.

Remaining GameFi v2 item:
Server/signed achievement verification for strong anti-cheat.
