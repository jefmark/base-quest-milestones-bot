# V16 NFT Art & Metadata Fix Report

## Applied fixes

1. Replaced broken black placeholder images for milestones 7 through 12 with the new professional artwork.
2. Updated metadata for milestones 1 through 12 for consistency.
3. Fixed metadata image paths from `./nft/x.png` to `../nft/x.png` so the JSON resolves correctly when served from `/metadata/`.
4. Added richer metadata fields: `external_url`, `Collection`, `Title`, `Tier`, and `Theme`.
5. Preserved the existing project structure so the repo remains GitHub Pages friendly.

## Replaced milestone art
- 7: Quest Hunter
- 8: Base Champion
- 9: Chain Warrior
- 10: Protocol Hero
- 11: Elite Player
- 12: Genesis Legend

## Notes
- This update targets the NFT asset/metadata issue only and keeps the rest of the v15 project behavior intact.
- If you later change the GitHub Pages repo path, the relative metadata image paths will still continue to work.
