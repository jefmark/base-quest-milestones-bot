# V20 BOT Integration Readiness Report

Base: `BaseQuest_BOT_Testnet_v19_WHITEHAT_FIXED`

## Findings in V19

V19 was already a 12-milestone build. `src/game.js`, the Solidity constructor, `MAX_MILESTONE`, progression rules, NFT artwork, and metadata all contained milestones 1 through 12.

The following integration defects/inconsistencies remained:

1. `src/wallet.js` attempted to add the target chain with native currency `Ether / ETH`, which is incorrect for BOT Chain. BOT Chain uses BOT as the native gas asset.
2. `src/main.js` still had a stale `|| 6` fallback when selecting NFT preview artwork.
3. `README.md`, `CONTRIBUTING.md`, and `site.webmanifest` still described the project as a six-stage Base Mainnet build in several places.
4. `.github/workflows/build.yml` used `npm ci` and npm cache even though no `package-lock.json` was present, making that workflow prone to deterministic failure before the actual build.
5. `.env.example` did not document the required frontend/testnet variables or metadata base URI.
6. There was no automatic check preventing future divergence between the 12 frontend milestone values and the 12 Solidity milestone values.
7. The game selected the highest score/time-qualified milestone even when earlier NFTs were not minted. That could make the UI offer #3 while the contract correctly rejected it because #2 was still required.
8. After a successful mint, the same completed run could potentially become eligible for the next milestone in the UI instead of requiring a fresh run.

## Changes applied in V20

- Preserved the 12 V19 milestone values exactly; no gameplay thresholds were changed.
- Changed wallet network-add native currency to configurable values defaulting to `BOT / BOT / 18`.
- Changed the frontend default chain display name to `Bohr Testnet`.
- Kept official Bohr defaults: chain ID `968`, RPC `https://rpc.bohr.life`, explorer `https://scan.bohr.life`.
- Changed stale NFT preview fallback from 6 to 12.
- Changed mint selection to the first unminted sequential milestone, matching the contract previous-milestone rule.
- Added frontend prechecks for already-minted and missing-previous-milestone conditions.
- Added one-claim-per-run state; after a successful mint the next milestone requires a new run.
- Added `scripts/validate-project.mjs`.
- Added `npm run validate:project` and made `npm run build` execute validation first.
- Repaired the GitHub build workflow to avoid the missing-lock-file `npm ci/cache` failure.
- Standardized GitHub Actions on Node 20.
- Expanded `.env.example` with BOT testnet/frontend variables.
- Updated GitHub Pages workflow to pass optional native-currency variables.
- Rewrote README for the BOT testnet acceptance build and 12 milestones.
- Rewrote `BOT_TESTNET_GUIDE.md` with the actual deployment/acceptance sequence.
- Updated the migration-status document while explicitly preserving the original Base deployment.
- Updated the web manifest description for BOT Chain testnet.

## Validation performed

The local dependency-free validation script passed all checks:

- 12 milestones found in frontend
- 12 milestones found in Solidity
- Names/scores/minimum times match for all 12
- Contract `MAX_MILESTONE = 12`
- Frontend `maxMilestone = 12`
- Default chain ID = 968
- Default RPC = `https://rpc.bohr.life`
- Default explorer = `https://scan.bohr.life`
- Native token = BOT
- No hard-coded `Ether/ETH` remains in the wallet network-add flow
- Progression rules contain 12 stages
- NFT artwork and metadata exist for all 12 stages
- JavaScript syntax checks passed for all source/config/deployment files

## Build/compile limitation in this environment

A full `npm install` could not complete in the isolated execution environment within the available network timeout, so Vite build and Hardhat compile were not claimed as completed here. GitHub Actions or a normal development machine should perform those dependency-based checks after upload.

## Next external action

Deploy the contract on Bohr Testnet using Remix + MetaMask, then add the resulting contract address to `VITE_CONTRACT_ADDRESS` and run the end-to-end mint acceptance flow.
