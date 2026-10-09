# V6 Fix Report

Fixes:
- Game progression now starts from stored progression instead of always stage 1.
- Local progress is treated only as UX cache. Blockchain remains source of truth.
- Added safer progression helpers.

Remaining limitation:
Client-only anti-cheat cannot be fully trusted. Production version should use signed achievements.
