# V10 Frontend Security Audit

Changes:
- Separated permanent NFT progression from temporary run state.
- Browser cache cannot increase unlocked progression.
- Run stage is restored from blockchain-derived milestone.
- Lives remain temporary gameplay state.

Security model:
Blockchain ownership = source of truth.
LocalStorage = UX cache only.

Remaining future upgrade:
Signed achievement verification for production anti-cheat.
