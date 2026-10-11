<div align="center">

<img src="public/favicon.svg" width="86" alt="Base Quest Milestones logo" />

# Base Quest Milestones

**A 12-milestone browser game with ERC-721 achievement NFTs on BOT Chain.**

**Current release:** V24.4 web client · Bohr Testnet · `BaseQuestMilestonesV2`  
**Status:** Testnet validated in project testing; **not yet deployed to BOT Mainnet**

[**Play the Testnet Game**](https://jefmark.github.io/base-quest-milestones-bot/) · [**Source Code**](https://github.com/jefmark/base-quest-milestones-bot) · [**V2 Contract on Bohr**](https://scan.bohr.life/address/0x6fFd9eaA24729257cdDC2C1EFBcEe785f31A736a) · [**Successful V2 Mint Transaction**](https://scan.bohr.life/tx/0x3762c08c8f7ea3e2d4531ba2a333d32f1108dc7638ad7f41555c96eac39481ab)

</div>

> **Project status and affiliation:** This repository documents an independent game integration built for BOT Chain testing. Testnet deployment, conversations with ecosystem reviewers, and a successful mint do **not** constitute a formal security audit, a Mainnet launch, an ecosystem grant award, or an official endorsement. Check current on-chain information before relying on a deployment.

## Contents

- [Overview](#overview)
- [Current deployments](#current-deployments)
- [How the game works](#how-the-game-works)
- [Milestones](#milestones)
- [Architecture](#architecture)
- [Smart-contract behavior and limitations](#smart-contract-behavior-and-limitations)
- [Running locally](#running-locally)
- [Configuration and GitHub Pages](#configuration-and-github-pages)
- [Contract deployment and verification](#contract-deployment-and-verification)
- [Checks and tests](#checks-and-tests)
- [Mainnet roadmap and planned creator fee](#mainnet-roadmap-and-planned-creator-fee)
- [Security](#security)
- [Contributing](#contributing)
- [Repository layout](#repository-layout)
- [License and project links](#license-and-project-links)

## Overview

Base Quest Milestones is a browser-based arcade runner. Players complete progressively more demanding challenges and can mint an ERC-721 NFT for each verified milestone. The project currently combines:

- **Twelve ordered milestones** with progressively higher score and minimum play-time requirements.
- **Connected EVM wallet support** through injected wallet providers and WalletConnect, with session recovery support where the wallet's authorization/session remains available.
- **Bohr Testnet smart-contract verification** of a run session, milestone order, mint history, nonces, elapsed time, score bounds, and cooldowns.
- **Sequential, wallet-specific progression** based on the protocol's historical mint record, not merely possession of a transferred NFT.
- **Static hosting** on GitHub Pages for the web app and public NFT metadata and artwork.
- **A legacy-to-V2 testnet transition** that preserves previous protocol mint history while using the V2 contract for current gameplay.

The client is designed to run without a dedicated game-progress database. This does **not** mean that a browser-reported score is cryptographically trustworthy; see [Security](#security).

## Current deployments

| Item | Value |
| --- | --- |
| Active development network | **Bohr Testnet** |
| Chain ID | `968` |
| RPC | `https://rpc.bohr.life` |
| Block explorer | `https://scan.bohr.life` |
| Active V2 NFT contract | [`0x6fFd9eaA24729257cdDC2C1EFBcEe785f31A736a`](https://scan.bohr.life/address/0x6fFd9eaA24729257cdDC2C1EFBcEe785f31A736a) |
| Historical Bohr contract (legacy) | [`0x3f00E384Cf3CcF7f431535efA8830f0FE5dF6Fd5`](https://scan.bohr.life/address/0x3f00E384Cf3CcF7f431535efA8830f0FE5dF6Fd5) |
| Example V2 NFT mint | [View the transaction](https://scan.bohr.life/tx/0x3762c08c8f7ea3e2d4531ba2a333d32f1108dc7638ad7f41555c96eac39481ab) |
| Web application | [`jefmark.github.io/base-quest-milestones-bot`](https://jefmark.github.io/base-quest-milestones-bot/) |
| NFT metadata base URL | [`/metadata/`](https://jefmark.github.io/base-quest-milestones-bot/metadata/1.json) |

**Important:** The historical contract remains deployed to preserve previous testnet history. The active V2 app must point to **V2**, not the legacy contract. The original Base-network project/deployment is separate and must not be overwritten.

### BOT Mainnet reference (not a deployment announcement)

| Item | Value |
| --- | --- |
| Network | BOT Mainnet |
| Chain ID | `677` |
| RPC | `https://rpc.botchain.ai` |
| Explorer | `https://scan.botchain.ai` |
| Project Mainnet contract | **Not yet deployed / not announced** |

Contracts and NFTs are network-specific. A Bohr contract address **must not** be presented as the BOT Mainnet address; a Mainnet contract cannot automatically read a historical record that exists only on Bohr or Base.

## How the game works

1. **Open the game.** Select a practice experience or connect a compatible wallet for verified milestone minting.
2. **Connect and use Bohr Testnet.** The app checks the network, contract configuration, connected account, and on-chain milestone state.
3. **Begin a verified run.** The first verified start for a visit calls `startRun(nextMilestone)` and **requires a wallet transaction and gas**.
4. **Complete the game challenge.** The browser enforces additional gameplay checks, while the contract validates its own on-chain conditions.
5. **Mint the achievement NFT.** A successful `mintMilestone(milestone, score, playSeconds, runNonce)` transaction mints the milestone NFT.
6. **Continue to the next milestone.** On V2, successful minting advances the active on-chain session to the next checkpoint using the **same run nonce**; another `startRun` transaction is not required merely because the previous NFT was minted.
7. **Return later.** The app checks the wallet and contract for existing achievements. A page reload may require a fresh verified start depending on the browser/session state; existing on-chain mint records remain independent of the page.

**Gas model today:** Verified-run starts and NFT mints are on-chain transactions. Reading progress with view functions does not require an on-chain transaction. The current V2 mint function is **nonpayable** and does **not** implement a creator fee or treasury.

### Protocol mint history vs. NFT ownership

The V2 contract exposes `highestCompletedMilestone(address)` and `mintedByProtocol(address, milestone)`. When deployed with the configured historical Bohr contract, it can recognize the prior protocol's completed milestones. Transferring or purchasing someone else's achievement NFT does not, by itself, give the recipient the original minter's protocol progression.

## Milestones

| # | Name | Minimum score | Minimum play time |
| ---: | --- | ---: | ---: |
| 1 | Rookie Runner | 1,200 | 20 s |
| 2 | Chain Jumper | 2,600 | 35 s |
| 3 | Base Sprinter | 4,500 | 50 s |
| 4 | Gasless Ghost | 7,000 | 70 s |
| 5 | Block Master | 10,000 | 90 s |
| 6 | Onchain Legend | 13,500 | 110 s |
| 7 | Quest Hunter | 18,000 | 140 s |
| 8 | Base Champion | 23,000 | 170 s |
| 9 | Chain Warrior | 30,000 | 210 s |
| 10 | Protocol Hero | 38,000 | 260 s |
| 11 | Elite Player | 48,000 | 320 s |
| 12 | Genesis Legend | 60,000 | 400 s |

Source of truth for deployed requirements: read `getMilestone(id)` from the **active deployed contract**. The table reflects the current `contracts/BaseQuestMilestonesV2.sol` source and matching game definitions; an authorized contract owner may change milestone parameters.

## Architecture

```text
Player's browser (Vite + vanilla JavaScript)
        │
        ├── src/game.js       Arcade loop, scoring and client-side checks
        ├── src/main.js       Pages, UI state, mint/start workflow
        ├── src/wallet.js     Wallet discovery, connection and recovery
        └── src/config.js     Chain settings and contract ABI
        │
        ├── Wallet / WalletConnect → signs on-chain transactions
        │
        └── BOT Chain JSON-RPC → reads contract state
                                   │
                      BaseQuestMilestonesV2.sol
                      ├─ run session + nonce
                      ├─ per-wallet protocol milestones
                      ├─ mint constraints + cooldown
                      └─ ERC-721 NFT issuance

GitHub Pages → site files, public NFT images, token metadata
GitHub Actions → static checks, Solidity compile, legacy tests, build, Pages deploy
```

Main technologies: JavaScript, Vite 5, ethers v6, WalletConnect Ethereum Provider, Solidity 0.8.24, OpenZeppelin Contracts 5.0.2, Hardhat 2, and GitHub Actions/Pages. See `package.json` for pinned dependencies.

## Smart-contract behavior and limitations

**Active testnet source:** [`contracts/BaseQuestMilestonesV2.sol`](contracts/BaseQuestMilestonesV2.sol).

V2 has these relevant properties:

- The `startRun` call establishes a wallet-specific active session, nonce, checkpoint and challenge.
- `mintMilestone` validates the next milestone, current run nonce, checkpoint, minimum on-chain elapsed time, reported play time, score floor and rate ceiling, and mint cooldown.
- On mint, the next checkpoint advances **within the same active run**; after milestone 12, the run is consumed.
- `MAX_RUN_SECONDS` is **86,400 seconds (24 hours)** in V2, not the 900 seconds documented for the older contract.
- `mintCooldown` initializes to **40 seconds** and is owner-configurable in V2.
- The legacy contract reference is **immutable** in V2. It is used only to read the highest previously completed milestone on that same chain, when configured during construction.
- Minting is nonpayable; the contract rejects unsolicited native-token transfers.
- The contract owner can pause minting and update permitted milestone settings and metadata URI.

**Important limitation:** V2 enforces meaningful on-chain constraints, but gameplay score and active play time are reported by the browser. A determined attacker may manipulate a client. Do **not** describe the game as cryptographically tamper-proof or use client-reported scores as the sole basis for high-value rewards.

## Running locally

Requirements: Node.js **20.x or 22.x** and npm, plus a modern browser and an EVM wallet for on-chain operations.

```bash
git clone https://github.com/jefmark/base-quest-milestones-bot.git
cd base-quest-milestones-bot
npm install
cp .env.example .env
npm run dev
```

Set the variables described below before attempting real wallet interactions. Local `npm run dev` is for development; it does not deploy a smart contract.

Common commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local Vite development server |
| `npm run check` | Syntax, project validation, client smoke, and deep static audit |
| `npm run compile` | Compile Solidity contracts (Hardhat) |
| `npm test` | Run current Hardhat test files (legacy V21/V23 focus) |
| `npm run build` | Validate and build the static site |
| `npm run preview` | Preview the built website |

**Testing caveat:** Passing `npm test` today is **not** equivalent to a dedicated V2 contract security test suite. The repository currently includes `test/BaseQuestMilestones.v21.test.cjs` and `test/BaseQuestMilestones.v23.test.cjs`, but no corresponding V2-specific Hardhat test file. Add V2 tests before a Mainnet launch.

## Configuration and GitHub Pages

The active client reads configuration from environment variables in `src/config.js`. For GitHub Pages, configure these under:

`Repository → Settings → Secrets and variables → Actions → Variables`

```dotenv
VITE_CHAIN_ID=968
VITE_CHAIN_NAME=Bohr Testnet
VITE_RPC_URL=https://rpc.bohr.life
VITE_EXPLORER_URL=https://scan.bohr.life
VITE_NATIVE_CURRENCY_NAME=BOT
VITE_NATIVE_CURRENCY_SYMBOL=BOT
VITE_NATIVE_CURRENCY_DECIMALS=18
VITE_CONTRACT_ADDRESS=0x6fFd9eaA24729257cdDC2C1EFBcEe785f31A736a
VITE_WALLETCONNECT_PROJECT_ID=<YOUR_WALLETCONNECT_PROJECT_ID>
VITE_PUBLIC_APP_URL=https://jefmark.github.io/base-quest-milestones-bot/
```

`VITE_*` values are **public build-time configuration**, not secret storage. Never put a private key, seed phrase, wallet recovery phrase, or privileged signing key in them. Store deployment keys outside the repository using a secure deployment process.

The [GitHub Pages deployment workflow](.github/workflows/deploy-pages.yml) runs checks and builds `dist/` on pushes to `main` or on manual dispatch. Changes to GitHub Actions Variables require a **new build/deployment** before the public app will reflect them.

The Vite base path is set in `vite.config.js` for GitHub Pages project hosting. Existing static pages and metadata assets live in `public/`.

### NFT metadata and artwork

- Metadata JSON: `public/metadata/1.json` … `public/metadata/12.json`.
- NFT artwork: `public/nft/1.png` … `public/nft/12.png`.
- Optimized gallery previews: `public/nft/thumbs/*.webp`.
- Testnet base URI: `https://jefmark.github.io/base-quest-milestones-bot/metadata/` (**trailing slash required**).

Before any Mainnet launch, check long-term asset availability, correct JSON/image URLs, and whether immutable or decentralized metadata storage is appropriate. GitHub Pages availability and repository ownership affect media persistence.

## Contract deployment and verification

### Current V2 on Bohr

The V2 contract constructor takes **three** arguments:

```solidity
constructor(address initialOwner, string memory initialBaseURI, address legacyContract)
```

Use the intended owner wallet, complete metadata base URI, and historical Bohr contract address **only where historical recognition is appropriate**. Passing `address(0)` intentionally disables V2 legacy-progression imports.

**Deployment tooling warning:** `scripts/deploy.js` currently deploys the **older** `BaseQuestMilestones` contract, not `BaseQuestMilestonesV2`. `hardhat.config.cjs` defines Bohr Testnet only. Do **not** use the existing `npm run deploy:bot-testnet` command expecting a new V2 deployment. Update and test the deployment tooling before using it for V2 or Mainnet. Do not modify the historical deployed contract.

Verify the deployed contract against its exact compiler settings and constructor arguments; verify the application points to the matching address/ABI and chain ID. After deployment, independently confirm a real mint on the intended contract in the explorer.

### Mainnet (future work)

Do **not** simply replace `VITE_CHAIN_ID` with `677` and assume migration is complete. Plan a separate, tested Mainnet deployment, on-chain owner checks, correct metadata, explicit chain parameters, any planned fee architecture, review of security assumptions, and an updated frontend release. Testnet NFTs are not automatically Mainnet NFTs.

## Checks and tests

The repository contains automated syntax and static project checks, browser/game smoke simulations, a deep source audit, Hardhat compilation, and **legacy-focused** Solidity unit tests.

Minimum release checks before Mainnet:

- [ ] Decide and freeze the exact Mainnet contract and constructor configuration.
- [ ] Add and pass **V2 or successor-specific** contract tests, including run advancement, refresh/restart, legacy handling, cooldowns, transfers, pause controls, and malformed score/timing inputs.
- [ ] Audit wallet reconnect and account/network switching on desktop and mobile wallets.
- [ ] Confirm a full 12-milestone path and the mint transaction for every checkpoint in a controlled test.
- [ ] Review threats to client-reported gameplay proof and document accepted limitations.
- [ ] Verify metadata, image permanence, contract source, and frontend chain/address alignment.
- [ ] If creator fees are introduced, test exact fee accounting, access control, safe withdrawals, and user-facing price disclosure.
- [ ] Re-run the full CI build and verify it tests the **contract actually being deployed**, not just legacy contracts.
- [ ] Obtain any required external review before moving real funds.

## Mainnet roadmap and planned creator fee

A **future Mainnet proposal** (not part of the current V2 Bohr deployment) is to collect a **disclosed creator fee of approximately USD $0.01 per successful NFT mint, in the same transaction as minting**. An optional treasury contract would accumulate those project fees for maintenance, security work, and future development, with withdrawals restricted to authorized project management.

- The fee would be separate from network gas, which is paid to execute a transaction.
- The treasury is **not** intended to custody players' NFTs, deposits, or private keys.
- A payment alone does **not** prove legitimate gameplay; the mint contract must validate eligibility independently.
- Exact USD-equivalent pricing in BOT requires an explicit pricing policy/oracle or periodically updated on-chain fee amount; a fixed BOT number is not necessarily equal to one US cent over time.
- **No fee or treasury is deployed by this README**, and the current V2 contract is nonpayable. Implementing this proposal requires new audited contract logic or a separate version and an explicit migration/launch decision.
- The transaction amount and the existence/purpose of any creator fee should be shown to users before they authorize a mint.

The first Mainnet version should be deployed **only after** full testing and project approval, not merely because a tentative date has been discussed.

## Security

- Never share private keys, mnemonic/seed phrases, or repository administrator access.
- Always check the network and the exact NFT contract address in a wallet before signing.
- `startRun` and `mintMilestone` are on-chain writes and incur gas; read-only checks do not require a blockchain transaction.
- Do not approve unexpected asset transfers or unlimited token allowances for basic gameplay.
- The frontend and metadata are public; never treat client-side checks as a secure secret.
- An open-source repository and a successful testnet mint do **not** prove that all security issues have been eliminated.

Report vulnerabilities privately to the repository maintainer (or via GitHub private vulnerability reporting if it is enabled). Avoid publishing exploitable details before a fix is available. A separate `SECURITY.md` can be retained if the project needs a dedicated disclosure policy.

## Contributing

- Open an issue describing a reproducible bug or proposed enhancement before introducing breaking contract changes.
- Preserve the legacy deployment and existing on-chain history.
- Run `npm run check`, `npm run compile`, `npm test`, and `npm run build` before proposing a release.
- Do not weaken progression checks, introduce unreviewed fees/approvals, or commit secrets.
- Add contract-version-specific tests for any change that affects minting, fees, or run authorization.

## Repository layout

```text
.github/workflows/      CI checks and GitHub Pages publishing
contracts/              Current V2 + historical Solidity contract source
src/                    App entry point, game engine, wallet, config and styles
public/                 Static pages, artwork, metadata and web manifest
scripts/                Validation, audit, metadata and deployment utilities
test/                   Legacy Solidity regression tests
hardhat.config.cjs       Hardhat compiler and Bohr network settings
vite.config.js          Vite/GitHub Pages base-path configuration
.env.example            Public env variable template + local-only deploy secrets
README.md               Primary project documentation
LICENSE                 MIT license text
```

## License and project links

The repository includes an [MIT License](LICENSE). The original licensing notice and copyright attribution must be preserved as required by that license.

- **Application:** https://jefmark.github.io/base-quest-milestones-bot/
- **GitHub:** https://github.com/jefmark/base-quest-milestones-bot
- **Bohr explorer:** https://scan.bohr.life
- **BOT Chain documentation:** https://dev-docs.botchain.ai/
- **Ecosystem program:** https://www.botchain.ai/en/ecosystem-support/

---

*Documentation describes the V24.4 / Bohr V2 code path and the currently declared deployment. It does not attest that every environment, user wallet, or future Mainnet build has been independently audited.*
