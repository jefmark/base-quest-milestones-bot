# Security Policy — Base Quest Milestones

**Project:** Base Quest Milestones × BOT Chain  
**Current application:** V24.4 browser client  
**Current active contract source:** `contracts/BaseQuestMilestonesV2.sol`  
**Deployment status:** Bohr Testnet. **No BOT Mainnet release is represented by this policy.**  
**Last updated:** 2026-10-11

> **Security disclosure:** This is a public security policy and risk description, **not** a third-party audit, certification, bug-bounty offer, proof of exploit resistance, or endorsement by BOT Chain. Source-code review and successful testnet transactions do not establish production security.

## 1. Supported releases and networks

| Component | Status | Security support scope |
| --- | --- | --- |
| V24.4 frontend using V2 | Active testnet version | Security reports welcomed |
| `BaseQuestMilestonesV2.sol` | Active Bohr Testnet contract | Security reports welcomed |
| Previous Bohr contract (`BaseQuestMilestones.sol`) | Legacy / history | Critical reports affecting historical progression are relevant; feature development is not planned here |
| Earlier V20–V23 clients and legacy deployment scripts | Superseded | Not supported as the primary app release |
| BOT Mainnet deployment | Not yet released | Support scope and addresses will be updated **after deployment and validation** |
| Proposed creator-fee / treasury contracts | **Not implemented in the current V2 contract** | A separate review and policy update will be required before deployment |

**Current active Bohr network parameters**

- Chain ID: `968`
- Explorer: <https://scan.bohr.life>
- Active V2 contract: [`0x6fFd9eaA24729257cdDC2C1EFBcEe785f31A736a`](https://scan.bohr.life/address/0x6fFd9eaA24729257cdDC2C1EFBcEe785f31A736a)
- Historical Bohr contract: [`0x3f00E384Cf3CcF7f431535efA8830f0FE5dF6Fd5`](https://scan.bohr.life/address/0x3f00E384Cf3CcF7f431535efA8830f0FE5dF6Fd5)
- Web application: <https://jefmark.github.io/base-quest-milestones-bot/>

**BOT Mainnet** (reference only): Chain ID `677`; any contract address and transaction identifiers must be independently published and verified after deployment. An address on Bohr is **not** evidence of a contract on Mainnet. Prior testnet progress does not automatically carry over between networks.

## 2. Reporting a vulnerability privately

Please **do not** publish exploit instructions, private keys, proof-of-concept attacks against live accounts, or vulnerable transaction details in a public GitHub issue, pull request, discussion, Telegram chat, or social-media thread.

**Preferred reporting channel:**

1. Open the repository's [Security Advisories](https://github.com/jefmark/base-quest-milestones-bot/security/advisories) page.
2. Select **Report a vulnerability** *if the private vulnerability reporting feature is enabled*.
3. Provide a concise summary, affected file/contract/chain, reproducible steps, expected and observed behavior, evidence (redacted as necessary), and the potential impact.

If the private reporting action is unavailable, open a **minimal public issue requesting a private security contact** at [Issues](https://github.com/jefmark/base-quest-milestones-bot/issues), **without disclosing vulnerability details**. The maintainer can then establish a private communication channel.

The project's public issue tracker is suitable for normal, non-sensitive defects only. **Do not assume an email address, public Telegram account, or third-party community moderator is an authorized security contact.**

### Coordinated disclosure

- Give maintainers a reasonable opportunity to investigate and remediate before public disclosure.
- Do not exploit suspected weaknesses to obtain NFTs, native tokens, access to other wallets, or project funds.
- Use local environments and testnets wherever possible; avoid unapproved disruptive testing against the live application or other users.
- This project does **not** currently promise a response-time SLA, a vulnerability bounty, or compensation for submitted reports.

## 3. Trust boundaries and current controls

### Smart-contract enforcement (current V2 source)

The V2 Solidity code is designed to enforce:

- Ordered milestone progression based on historical **protocol-mint** records rather than mere NFT ownership.
- Legacy Bohr progression lookups through the `legacyProtocol` contract configured at construction (if provided).
- On-chain run sessions, per-address nonces, milestone binding, and a run-specific challenge.
- Minimum elapsed blockchain time, an upper bound on run age, client-reported play time bounded against elapsed chain time, and score-rate bounds.
- Mint cooldown, one protocol mint per eligible milestone and address, and anti-replay checks through state transitions.
- Permissioned configuration and emergency pause/unpause via the contract owner.
- OpenZeppelin ERC-721, `Ownable`, `Pausable`, and `ReentrancyGuard` primitives.
- Updates to the active run and mint-progression state before ERC-721 safe-receiver callbacks.

**These mechanisms limit some classes of abuse but do not cryptographically prove that gameplay occurred as reported.** A hostile browser can fabricate client-reported score or play-time values subject to the contract's bounds. Do not grant high-value assets or irreversible economic rewards on the assumption that the browser score is tamper-proof.

### Frontend and wallet

- Verify the **chain ID and contract address** inside the wallet before approving any transaction.
- `startRun` and `mintMilestone` are contract writes and require user approval and network gas; read-only status checks do not need a blockchain transaction.
- Wallet session restoration after a refresh relies on wallet/provider permissions and the continued validity of the session; it should never be interpreted as authorization to spend funds silently.
- `VITE_*` settings become part of a public browser bundle. They must **never contain secrets**.
- A successful wallet connection does not grant the site custody of users' private keys. Never enter a seed phrase or private key into the site.
- Browser-side checks (timing, focus, input patterns, and score consistency) are **defense-in-depth**, not a trusted anti-cheat authority.

### NFTs, metadata and network boundaries

- NFT ownership can change by transfer; historical protocol progress may remain attached to the wallet that originally minted the milestone.
- Verify the deployed contract's `tokenURI` behavior and the published metadata/artwork before launch.
- Changing an off-chain metadata URL or hosted content may affect how NFTs appear in wallets; do not describe off-chain metadata as immutable unless immutability is actually guaranteed.
- The testnet legacy link is network-specific. A Mainnet deployment must **not** be configured to assume a Bohr address provides existing Mainnet history.

## 4. Known limitations and release blockers

The following are **areas requiring verification**, not claims that a live exploit has been proven:

1. **Client-reported gameplay:** Score and some timing information are browser-generated. A sufficiently capable attacker may imitate plausible game results within on-chain limits.
2. **V2 test coverage:** Current repository contract tests are principally for the earlier `BaseQuestMilestones.sol`. Dedicated V2 tests are required, including same-nonce progression, legacy progress integration, invalid inputs, expiration, cooldowns, owner-only calls, pause behavior, and contract callbacks.
3. **Deployment tooling:** `scripts/deploy.js` currently targets `BaseQuestMilestones`, not the V2 contract. The deployment process must be updated and checked **before** Mainnet release.
4. **Network configuration:** Verify the exact BOT Mainnet chain ID, RPC, correct deployed address, constructor values, ownership, and frontend ABI; do not reuse Bohr-specific values by accident.
5. **Privileged owner actions:** Owner-only operations can alter milestone settings, token URI and cooldown or pause minting. The project must document who controls the owner address and secure that key.
6. **Continuous integration:** Existing compilation and contract-test jobs must be aligned with the intended Mainnet contract, and security-critical transaction paths require real-wallet testing.
7. **Client delivery integrity:** Third-party frontend dependencies, GitHub Actions permissions, updateable public metadata, and hosting controls are within the project threat model.
8. **Treasury / creator fee:** The current `mintMilestone` method is nonpayable and does not charge a creator fee. Adding a future fee requires a new, deliberately reviewed on-chain design and fresh tests; a README or JavaScript change alone does not implement it.

None of these items should be marked “passed” merely because a build succeeds or one NFT is minted successfully.

## 5. Minimum checklist before BOT Mainnet deployment

- [ ] Review the final Mainnet Solidity source and compiler settings; compare the deployment bytecode with the intended version.
- [ ] Add and run automated **V2-specific** unit, integration, negative-path, and regression tests.
- [ ] Test the full twelve-milestone lifecycle, fresh and returning wallets, expiry, refresh/reconnect, same-nonce progression, and failure/revert behavior.
- [ ] Review browser-score trust assumptions and document residual cheating risks.
- [ ] Confirm Mainnet-specific constructor arguments; do **not** assume the Bohr legacy contract exists on Mainnet.
- [ ] Update deployment scripts and require an explicit network and chain-ID assertion before deployment.
- [ ] Confirm metadata URLs, token URI format, chain ID, ABI, `VITE_CONTRACT_ADDRESS`, and front-end UI transaction disclosures.
- [ ] Check source/bytecode verification and publish the actual Mainnet contract address and deployment transaction.
- [ ] Use a dedicated deployment wallet; secure recovery material offline and never commit or send private keys.
- [ ] Confirm ownership, administrator privileges, emergency pause behavior, and a tested recovery procedure.
- [ ] Run dependency and workflow security checks; review least-privilege GitHub Actions permissions.
- [ ] Obtain independent expert review commensurate with financial exposure before inviting users to spend real funds.
- [ ] Test a minimal real Mainnet mint with a controlled wallet and verify resulting NFT ownership, event logs, and user-visible costs.
- [ ] Update `README.md` and this policy with **verified Mainnet facts only**.

### Additional requirements if a treasury or mint fee is introduced later

- [ ] Disclose the creator fee separately from network gas **before** wallet confirmation.
- [ ] Specify how any USD-target fee is converted into the chain's native currency and how changes are governed.
- [ ] Audit payable mint handling, fee accounting, unexpected native transfers, reentrancy, failed withdrawals, and destination authorization.
- [ ] Restrict withdrawals to an authorized operator and test ownership rotation and loss-of-key contingencies.
- [ ] Ensure fee settlement and NFT minting have explicitly defined atomicity and revert semantics.
- [ ] Verify that the treasury does not inadvertently receive or retain users' deposits or NFTs.
- [ ] Review collector wallet activity, accounting, transparency, and all user-facing disclosures.

## 6. Private keys, approvals and impersonation

- Never ask users, contributors or reviewers for seed phrases, signing keys, mnemonics, or wallet backups.
- Never store deployment private keys in committed files, `VITE_*` values, logs, screenshots, or public issue attachments.
- Keep `.env` and other private configuration out of version control; `.env.example` must contain placeholders only.
- Verify all unsolicited messages about deployment gas, grants, or additional wallet approvals through independently obtained official channels.
- A public wallet address is sufficient to receive chain-native gas funding; no seed phrase, wallet import, “validation deposit,” or unlimited token approval is necessary.
- Smart-contract source publication and visible blockchain transactions do not establish that any particular person or third party is an authorized project administrator.

## 7. Useful security references

- [GitHub: Security policy files](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/add-security-policy)
- [GitHub: Private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository)
- [OpenZeppelin Contracts: Access control](https://docs.openzeppelin.com/contracts/5.x/access-control)
- [OpenZeppelin Contracts: Security utilities](https://docs.openzeppelin.com/contracts/5.x/api/utils)
- [Ethereum: JSON-RPC interface](https://ethereum.org/en/developers/docs/apis/json-rpc/)

---

**Maintainer note:** This document describes the architecture and risks known from the repository source as of the update date. It is not a guarantee that deployed bytecode, wallet settings, explorer metadata or third-party services are identical to the source. Confirm those items independently before moving real value.
