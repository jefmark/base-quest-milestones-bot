# BaseQuest BOT Testnet V22

## Purpose
V22 changes progression verification from NFT ownership based checks to protocol mint history checks.

## Security change
`mintedByProtocol[wallet][milestone]` records NFTs minted by the official contract. Transfers or marketplace purchases do not unlock progression.

## Checks performed
- Contract source updated from V21 baseline
- ERC721 ownership is no longer the only progression signal
- Previous milestone progression uses protocol mint history
- Existing BOT Testnet/GitHub Pages architecture preserved

## Remaining limitation
Browser gameplay input is still not a cryptographic proof; score validation remains bounded by on-chain rules.
