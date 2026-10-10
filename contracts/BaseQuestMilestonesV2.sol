// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface ILegacyQuestMilestones {
    function highestCompletedMilestone(address player) external view returns (uint256);
}

/// @title BaseQuestMilestonesV2
/// @notice One verified start per page visit; later checkpoints mint on the SAME nonce.
/// @dev A fresh browser visit starts a new on-chain run. Browser score and elapsed
///      active time are client-reported, not cryptographic proof of gameplay.
///      Legacy NFTs remain at legacyProtocol; only progression is carried forward.
contract BaseQuestMilestonesV2 is ERC721, Ownable, Pausable, ReentrancyGuard {
    using Strings for uint256;

    struct Milestone {
        uint32 requiredScore;
        uint32 minPlaySeconds;
        bool active;
        string name;
    }
    struct RunSession {
        uint64 nonce;
        uint64 startedAt;
        uint32 milestone;
        bool active;
        bytes32 challenge;
    }

    uint256 public constant MAX_MILESTONE = 12;
    uint256 public constant MAX_RUN_SECONDS = 86400; // per-checkpoint wall-clock lifetime
    uint256 public constant MAX_SCORE_PER_SECOND = 540;
    uint256 public constant SCORE_BURST_ALLOWANCE = 1_000;
    uint256 public constant CLOCK_AHEAD_TOLERANCE_SECONDS = 10;
    uint256 public totalMinted;
    uint256 public mintCooldown = 40;
    address public immutable legacyProtocol;
    string private baseTokenURI;

    mapping(uint256 => Milestone) public milestones;
    mapping(address => mapping(uint256 => bool)) private _mintedHere;
    mapping(uint256 => uint256) public tokenMilestone;
    mapping(address => uint256) public lastMintAt;
    mapping(address => uint64) public runNonce;
    mapping(address => RunSession) private activeRuns;

    event MilestoneConfigured(uint256 indexed milestone, uint32 requiredScore, uint32 minPlaySeconds, bool active, string name);
    event RunStarted(address indexed player, uint256 indexed milestone, uint64 indexed nonce, uint64 startedAt, bytes32 challenge);
    event RunCancelled(address indexed player, uint64 indexed nonce);
    event RunConsumed(address indexed player, uint64 indexed nonce, uint256 indexed milestone);
    event RunAdvanced(address indexed player, uint64 indexed nonce, uint256 indexed nextMilestone, uint64 startedAt, bytes32 challenge);
    event MilestoneMinted(address indexed player, uint256 indexed milestone, uint256 indexed tokenId, uint256 clientScore, uint256 playSeconds, uint64 runNonce);
    event BaseTokenURIUpdated(string newBaseTokenURI);
    event MintCooldownUpdated(uint256 newCooldown);

    /// @param legacyContract Existing BOT V23 NFT contract. Pass address(0) ONLY if
    ///                       existing players do not need their prior mints recognized.
    constructor(address initialOwner, string memory initialBaseURI, address legacyContract)
        ERC721("Base Quest Milestones", "BQM") Ownable(initialOwner)
    {
        require(initialOwner != address(0), "ZERO_OWNER");
        require(bytes(initialBaseURI).length > 0, "EMPTY_BASE_URI");
        require(legacyContract == address(0) || legacyContract.code.length > 0, "INVALID_LEGACY");
        legacyProtocol = legacyContract;
        baseTokenURI = initialBaseURI;
        _setMilestone(1, 1200, 20, true, "Rookie Runner");
        _setMilestone(2, 2600, 35, true, "Chain Jumper");
        _setMilestone(3, 4500, 50, true, "Base Sprinter");
        _setMilestone(4, 7000, 70, true, "Gasless Ghost");
        _setMilestone(5, 10000, 90, true, "Block Master");
        _setMilestone(6, 13500, 110, true, "Onchain Legend");
        _setMilestone(7, 18000, 140, true, "Quest Hunter");
        _setMilestone(8, 23000, 170, true, "Base Champion");
        _setMilestone(9, 30000, 210, true, "Chain Warrior");
        _setMilestone(10, 38000, 260, true, "Protocol Hero");
        _setMilestone(11, 48000, 320, true, "Elite Player");
        _setMilestone(12, 60000, 400, true, "Genesis Legend");
    }

    function _legacyHighest(address player) internal view returns (uint256) {
        if (legacyProtocol == address(0)) return 0;
        uint256 highest = ILegacyQuestMilestones(legacyProtocol).highestCompletedMilestone(player);
        require(highest <= MAX_MILESTONE, "INVALID_LEGACY_PROGRESS");
        return highest;
    }

    function highestCompletedMilestone(address player) public view returns (uint256 highest) {
        highest = _legacyHighest(player);
        while (highest < MAX_MILESTONE && _mintedHere[player][highest + 1]) ++highest;
    }

    // Preserve the ABI expected by src/wallet.js, including previous V23 mints.
    function mintedByProtocol(address player, uint256 milestone) public view returns (bool) {
        if (milestone < 1 || milestone > MAX_MILESTONE) return false;
        return milestone <= _legacyHighest(player) || _mintedHere[player][milestone];
    }

    function hasMintedMilestone(address player, uint256 milestone) external view returns (bool) {
        return mintedByProtocol(player, milestone);
    }

    function _validateMilestoneProgress(address player, uint256 milestone) internal view {
        require(milestone >= 1 && milestone <= MAX_MILESTONE, "BAD_MILESTONE");
        require(milestones[milestone].active, "MILESTONE_OFF");
        require(milestone == highestCompletedMilestone(player) + 1, "WRONG_NEXT_MILESTONE");
        require(!mintedByProtocol(player, milestone), "ALREADY_MINTED");
    }

    /// @notice Called once when entering the game. No additional startRun is required
    ///         after NFTs or after a 59-second in-page retry.
    function startRun(uint256 milestone) external nonReentrant whenNotPaused returns (uint64 nonce, bytes32 challenge) {
        _validateMilestoneProgress(msg.sender, milestone);
        nonce = ++runNonce[msg.sender];
        uint64 startedAt = uint64(block.timestamp);
        challenge = keccak256(abi.encodePacked(
            blockhash(block.number - 1), address(this), block.chainid,
            msg.sender, milestone, nonce, startedAt
        ));
        activeRuns[msg.sender] = RunSession(nonce, startedAt, uint32(milestone), true, challenge);
        emit RunStarted(msg.sender, milestone, nonce, startedAt, challenge);
    }

    function cancelRun() external nonReentrant {
        RunSession storage run = activeRuns[msg.sender];
        require(run.active, "NO_ACTIVE_RUN");
        uint64 nonce = run.nonce;
        run.active = false;
        emit RunCancelled(msg.sender, nonce);
    }

    /// @notice The only transaction after the initial start is each actual NFT mint.
    /// @dev Changes to the next milestone BEFORE _safeMint external callbacks.
    ///      Refresh and replay with an old milestone/nonce cannot double-mint.
    function mintMilestone(uint256 milestone, uint256 clientScore, uint256 playSeconds, uint64 expectedRunNonce)
        external nonReentrant whenNotPaused returns (uint256 tokenId)
    {
        _validateMilestoneProgress(msg.sender, milestone);
        RunSession storage run = activeRuns[msg.sender];
        require(run.active, "NO_ACTIVE_RUN");
        require(run.nonce == expectedRunNonce, "BAD_RUN_NONCE");
        require(uint256(run.milestone) == milestone, "RUN_MILESTONE_MISMATCH");

        _validateMintEligibility(milestone, clientScore, playSeconds, run);

        // All effects occur before safe receiver callbacks (plus nonReentrant).
        _mintedHere[msg.sender][milestone] = true;
        lastMintAt[msg.sender] = block.timestamp;
        tokenId = ++totalMinted;
        tokenMilestone[tokenId] = milestone;
        if (milestone == MAX_MILESTONE) {
            run.active = false;
            emit RunConsumed(msg.sender, run.nonce, milestone);
        } else {
            // Same nonce remains authorized. Reset only the on-chain checkpoint
            // timer and the random challenge; no new wallet transaction required.
            run.milestone = uint32(milestone + 1);
            run.startedAt = uint64(block.timestamp);
            run.challenge = keccak256(abi.encodePacked(
                run.challenge, msg.sender, run.nonce, tokenId, milestone + 1, block.timestamp
            ));
            emit RunAdvanced(msg.sender, run.nonce, milestone + 1, run.startedAt, run.challenge);
        }

        _safeMint(msg.sender, tokenId);
        emit MilestoneMinted(msg.sender, milestone, tokenId, clientScore, playSeconds, expectedRunNonce);
    }

    function _validateMintEligibility(
        uint256 milestone, uint256 clientScore, uint256 playSeconds, RunSession storage run
    ) internal view {
        uint256 elapsed = block.timestamp - uint256(run.startedAt);
        Milestone memory m = milestones[milestone];
        require(elapsed >= m.minPlaySeconds, "RUN_TOO_FAST");
        require(elapsed <= MAX_RUN_SECONDS, "RUN_EXPIRED");
        require(playSeconds >= m.minPlaySeconds, "PLAY_TIME_TOO_LOW");
        require(playSeconds <= elapsed + CLOCK_AHEAD_TOLERANCE_SECONDS, "CLIENT_TIME_AHEAD");
        require(clientScore >= m.requiredScore, "SCORE_TOO_LOW");
        // Cumulative score is bounded relative to the previous checkpoint.
        uint256 baseScore = milestone == 1 ? 0 : milestones[milestone - 1].requiredScore;
        require(clientScore <= baseScore + elapsed * MAX_SCORE_PER_SECOND + SCORE_BURST_ALLOWANCE, "SCORE_RATE_TOO_HIGH");
        require(block.timestamp >= lastMintAt[msg.sender] + mintCooldown, "COOLDOWN");
    }

    function getActiveRun(address player) external view returns (uint64 nonce, uint64 startedAt, uint32 milestone, bytes32 challenge, bool active) {
        RunSession memory run = activeRuns[player];
        return (run.nonce, run.startedAt, run.milestone, run.challenge, run.active);
    }
    function getMilestone(uint256 milestone) external view returns (Milestone memory) {
        require(milestone >= 1 && milestone <= MAX_MILESTONE, "BAD_MILESTONE");
        return milestones[milestone];
    }
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ownerOf(tokenId);
        return string.concat(baseTokenURI, tokenMilestone[tokenId].toString(), ".json");
    }
    function setMilestone(uint256 milestone, uint32 requiredScore, uint32 minPlaySeconds, bool active, string calldata name) external onlyOwner {
        require(milestone >= 1 && milestone <= MAX_MILESTONE, "BAD_MILESTONE");
        _setMilestone(milestone, requiredScore, minPlaySeconds, active, name);
    }
    function _setMilestone(uint256 milestone, uint32 requiredScore, uint32 minPlaySeconds, bool active, string memory name) internal {
        require(requiredScore > 0 && minPlaySeconds > 0 && bytes(name).length > 0, "INVALID_MILESTONE");
        milestones[milestone] = Milestone(requiredScore, minPlaySeconds, active, name);
        emit MilestoneConfigured(milestone, requiredScore, minPlaySeconds, active, name);
    }
    function setBaseTokenURI(string calldata newBaseTokenURI) external onlyOwner {
        require(bytes(newBaseTokenURI).length > 0, "EMPTY_BASE_URI");
        baseTokenURI = newBaseTokenURI;
        emit BaseTokenURIUpdated(newBaseTokenURI);
    }
    function setMintCooldown(uint256 newCooldown) external onlyOwner {
        require(newCooldown <= 1 days, "TOO_LONG");
        mintCooldown = newCooldown;
        emit MintCooldownUpdated(newCooldown);
    }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    receive() external payable { revert("NO_NATIVE_TOKEN_ACCEPTED"); }
    fallback() external payable { revert("NO_NATIVE_TOKEN_ACCEPTED"); }
}
