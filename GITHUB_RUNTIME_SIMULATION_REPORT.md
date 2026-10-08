# GitHub Runtime Simulation Audit - V17

## Completed checks

### 1. GitHub Actions Build Test
Added:
`.github/workflows/build.yml`

Purpose:
- automatic npm install
- production build validation
- dist output check

### 2. Vite GitHub Pages preparation
Reviewed:
`vite.config.js`

Current configuration keeps compatibility with:
- custom domain deployment
- repository deployment after changing base path

Before final Pages deployment set:
`base: '/repository-name/'`

### 3. NFT and metadata paths
Checked:
- public/nft/1.png ... 12.png
- public/metadata/1.json ... 12.json

Metadata image references use:
`../nft/{id}.png`

This matches the metadata folder structure.

### 4. Console/runtime risks checked
Reviewed:
- missing asset paths
- missing metadata references
- stage asset numbering
- build workflow

### 5. Remix BOT Testnet preparation
No private key or deployment secret added.

Deployment remains:
- Remix
- manual wallet confirmation
- external ABI/address update after deployment

## Remaining real-world test
The final verification must be performed after pushing to GitHub:
1. GitHub Actions green build
2. Open GitHub Pages URL
3. Browser console check
4. Wallet connection test
5. BOT Testnet mint test
