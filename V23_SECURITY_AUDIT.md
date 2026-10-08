# V23 Security Audit

## Reviewed

- ERC-721 mint flow
- 12-stage sequential protocol progression
- run nonce / replay protection
- run lifecycle and expiry
- chain/client time bounds
- score plausibility bounds
- wallet/network synchronization
- BOT Bohr Testnet configuration
- GitHub Pages static-hosting assumptions

## Critical V23 property

`_validateMilestoneProgress` requires `mintedByProtocol[player][milestone - 1]` for later stages. ERC-721 ownership is not used as progression proof. Static validation and a Hardhat test cover this rule.

## Residual risk

Browser-reported score is not cryptographic gameplay proof. A sophisticated attacker may fabricate a plausible score after opening a legitimate run and waiting enough chain time. High-value rewards require an additional trusted or cryptographic verifier.

No claim is made here that the current repository has already passed live Bohr deployment or real-wallet acceptance tests; those remain deployment gates.
