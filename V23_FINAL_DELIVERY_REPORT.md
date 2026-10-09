# Base Quest Milestones — V23 Final Testnet Repository Review

## Scope

V23 is the current BOT Chain Bohr Testnet build with on-chain verified runs and protocol-mint progression.

## V23-specific invariant

Progression is based on `mintedByProtocol`, not current NFT ownership. A transferred or purchased NFT cannot unlock a later milestone for the recipient.

## Repository consistency fixes

- version labels standardized to V23 in current docs/UI/validator/test naming
- package version updated to `2.3.0-testnet`
- README metadata URL updated to `https://jefmark.github.io/base-quest-milestones-bot/metadata/`
- test coverage added for transfer/purchase progression bypass
- static validator checks for `mintedByProtocol` progression enforcement

## Remaining real-environment gates

- GitHub Actions dependency install
- Hardhat compile
- Hardhat runtime tests
- Vite production build
- GitHub Pages deployment
- Bohr Testnet deployment
- real-wallet startRun/mint flow
- transfer-bypass acceptance test using two wallets
