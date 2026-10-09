# V8 Game Engine Audit

Implemented:
- Game loop now consumes lives on collision.
- Maximum lives: 3.
- Losing a life restarts the current run state without destroying NFT progression.
- Game over happens after all 3 lives are consumed.
- Progress remains controlled by wallet NFT ownership.

Review notes:
- Browser state is still not trusted for rewards.
- Smart contract progression rules remain the final authority.
