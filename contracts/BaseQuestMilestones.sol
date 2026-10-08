// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title BaseQuestMilestones
/// @notice No-payment ERC-721 milestone NFTs for the Base Quest browser game on BOT Chain.
/// @dev V22 stores a per-wallet run session and protocol-mint progression on-chain so a mint must reference a run that
///      was opened before gameplay. This removes replay/instant-mint classes of abuse without
///      requiring a separate application server. Client score is still not a cryptographic
///      proof of gameplay; see SECURITY.md for the remaining trust boundary.
contract BaseQuestMilestones is ERC721, Ownable, Pausable, ReentrancyGuard {
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
    uint256 public constant MAX_RUN_SECONDS = 900;
    uint256 public constant MAX_SCORE_PER_SECOND = 540;
    uint256 public constant SCORE_BURST_ALLOWANCE = 1_000;
    uint256 public constant CLAIM_GRACE_SECONDS = 120;
    uint256 public constant CLOCK_AHEAD_TOLERANCE_SECONDS = 10;

    uint256 public totalMinted;
    uint256 public mintCooldown = 60;
    string private baseTokenURI;

    mapping(uint256 => Milestone) public milestones;
    mapping(address => mapping(uint256 => bool)) public hasMintedMilestone;
    /// @notice Historical protocol mint record. Unlike ERC721 ownership, this is not affected by NFT transfers.
    mapping(address => mapping(uint256 => bool)) public mintedByProtocol;
    mapping(uint256 => uint256) public tokenMilestone;
    mapping(address => uint256) public lastMintAt;
    mapping(address => uint64) public runNonce;
    mapping(address => RunSession) private activeRuns;

    event MilestoneConfigured(
        uint256 indexed milestone,
        uint32 requiredScore,
        uint32 minPlaySeconds,
        bool active,
        string name
    );
    event RunStarted(
        address indexed player,
        uint256 indexed milestone,
        uint64 indexed nonce,
        uint64 startedAt,
        bytes32 challenge
    );
    event RunCancelled(address indexed player, uint64 indexed nonce);
    event RunConsumed(address indexed player, uint64 indexed nonce, uint256 indexed milestone);
    event MilestoneMinted(
        address indexed player,
        uint256 indexed milestone,
        uint256 indexed tokenId,
        uint256 clientScore,
        uint256 playSeconds,
        uint64 runNonce
    );
    event BaseTokenURIUpdated(string newBaseTokenURI);
    event MintCooldownUpdated(uint256 newCooldown);

    constructor(address initialOwner, string memory initialBaseURI)
        ERC721("Base Quest Milestones", "BQM")
        Ownable(initialOwner)
    {
        require(initialOwner != address(0), "ZERO_OWNER");
        require(bytes(initialBaseURI).length > 0, "EMPTY_BASE_URI");
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

    /// @notice Open/replace the caller's active verified run for the next sequential milestone.
    /// @dev Starting another run invalidates the previous run by incrementing the nonce.
    function startRun(uint256 milestone)
        external
        whenNotPaused
        returns (uint64 nonce, bytes32 challenge)
    {
        _validateMilestoneProgress(msg.sender, milestone);
        require(block.timestamp >= lastMintAt[msg.sender] + mintCooldown, "COOLDOWN");

        nonce = ++runNonce[msg.sender];
        uint64 startedAt = uint64(block.timestamp);
        challenge = keccak256(
            abi.encodePacked(
                blockhash(block.number - 1),
                address(this),
                block.chainid,
                msg.sender,
                milestone,
                nonce,
                startedAt
            )
        );

        activeRuns[msg.sender] = RunSession({
            nonce: nonce,
            startedAt: startedAt,
            milestone: uint32(milestone),
            active: true,
            challenge: challenge
        });

        emit RunStarted(msg.sender, milestone, nonce, startedAt, challenge);
    }

    /// @notice Explicitly invalidate the caller's active run.
    function cancelRun() external {
        RunSession storage run = activeRuns[msg.sender];
        require(run.active, "NO_ACTIVE_RUN");
        uint64 nonce = run.nonce;
        run.active = false;
        emit RunCancelled(msg.sender, nonce);
    }

    /// @notice Mint the NFT for an on-chain-started run.
    /// @param milestone Sequential milestone number.
    /// @param clientScore Final browser score. It is range-checked, not cryptographically proven.
    /// @param playSeconds Browser-measured play duration.
    /// @param expectedRunNonce Nonce returned by startRun; prevents stale/replayed runs.
    function mintMilestone(
        uint256 milestone,
        uint256 clientScore,
        uint256 playSeconds,
        uint64 expectedRunNonce
    ) external nonReentrant whenNotPaused returns (uint256 tokenId) {
        _validateMilestoneProgress(msg.sender, milestone);

        RunSession storage run = activeRuns[msg.sender];
        require(run.active, "NO_ACTIVE_RUN");
        require(run.nonce == expectedRunNonce, "BAD_RUN_NONCE");
        require(uint256(run.milestone) == milestone, "RUN_MILESTONE_MISMATCH");

        uint256 elapsed = block.timestamp - uint256(run.startedAt);
        Milestone memory m = milestones[milestone];

        require(elapsed >= m.minPlaySeconds, "RUN_TOO_FAST");
        require(elapsed <= MAX_RUN_SECONDS, "RUN_EXPIRED");
        require(playSeconds >= m.minPlaySeconds, "PLAY_TIME_TOO_LOW");
        require(playSeconds <= elapsed + CLOCK_AHEAD_TOLERANCE_SECONDS, "CLIENT_TIME_AHEAD");
        require(elapsed <= playSeconds + CLAIM_GRACE_SECONDS, "CLAIM_TOO_LATE");
        require(clientScore >= m.requiredScore, "SCORE_TOO_LOW");
        require(
            clientScore <= (elapsed * MAX_SCORE_PER_SECOND) + SCORE_BURST_ALLOWANCE,
            "SCORE_RATE_TOO_HIGH"
        );
        require(block.timestamp >= lastMintAt[msg.sender] + mintCooldown, "COOLDOWN");

        // Consume the run before external ERC-721 receiver callbacks.
        uint64 consumedNonce = run.nonce;
        run.active = false;
        lastMintAt[msg.sender] = block.timestamp;
        hasMintedMilestone[msg.sender][milestone] = true;
        mintedByProtocol[msg.sender][milestone] = true;

        tokenId = ++totalMinted;
        tokenMilestone[tokenId] = milestone;
        _safeMint(msg.sender, tokenId);

        emit RunConsumed(msg.sender, consumedNonce, milestone);
        emit MilestoneMinted(
            msg.sender,
            milestone,
            tokenId,
            clientScore,
            playSeconds,
            consumedNonce
        );
    }

    function getActiveRun(address player)
        external
        view
        returns (
            uint64 nonce,
            uint64 startedAt,
            uint32 milestone,
            bytes32 challenge,
            bool active
        )
    {
        RunSession memory run = activeRuns[player];
        return (run.nonce, run.startedAt, run.milestone, run.challenge, run.active);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ownerOf(tokenId); // reverts for nonexistent token
        uint256 milestone = tokenMilestone[tokenId];
        return string.concat(baseTokenURI, milestone.toString(), ".json");
    }

    function highestCompletedMilestone(address player) external view returns (uint256 highest) {
        for (uint256 i = 1; i <= MAX_MILESTONE; i++) {
            if (mintedByProtocol[player][i]) highest = i;
            else break;
        }
    }

    function getMilestone(uint256 milestone) external view returns (Milestone memory) {
        require(milestone >= 1 && milestone <= MAX_MILESTONE, "BAD_MILESTONE");
        return milestones[milestone];
    }

    function setMilestone(
        uint256 milestone,
        uint32 requiredScore,
        uint32 minPlaySeconds,
        bool active,
        string calldata name
    ) external onlyOwner {
        require(milestone >= 1 && milestone <= MAX_MILESTONE, "BAD_MILESTONE");
        _setMilestone(milestone, requiredScore, minPlaySeconds, active, name);
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

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _validateMilestoneProgress(address player, uint256 milestone) internal view {
        require(milestone >= 1 && milestone <= MAX_MILESTONE, "BAD_MILESTONE");
        Milestone memory m = milestones[milestone];
        require(m.active, "MILESTONE_OFF");
        require(!hasMintedMilestone[player][milestone], "ALREADY_MINTED");
        if (milestone > 1) {
            // Progression must come from a mint performed by this protocol, not from
            // a transferred or purchased NFT. ERC721 ownership is intentionally not
            // used as proof of progression.
            require(mintedByProtocol[player][milestone - 1], "PREVIOUS_MILESTONE_REQUIRED");
        }
    }

    function _setMilestone(
        uint256 milestone,
        uint32 requiredScore,
        uint32 minPlaySeconds,
        bool active,
        string memory name
    ) internal {
        require(requiredScore > 0, "ZERO_SCORE");
        require(minPlaySeconds > 0, "ZERO_PLAY_TIME");
        require(bytes(name).length > 0, "EMPTY_NAME");
        milestones[milestone] = Milestone(requiredScore, minPlaySeconds, active, name);
        emit MilestoneConfigured(milestone, requiredScore, minPlaySeconds, active, name);
    }

    receive() external payable {
        revert("NO_NATIVE_TOKEN_ACCEPTED");
    }

    fallback() external payable {
        revert("NO_NATIVE_TOKEN_ACCEPTED");
    }
}
