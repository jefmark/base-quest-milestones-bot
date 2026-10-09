const BOT_TESTNET = Object.freeze({
  chainId: 968,
  chainName: 'Bohr Testnet',
  rpcUrl: 'https://rpc.bohr.life',
  explorerUrl: 'https://scan.bohr.life',
  nativeCurrencyName: 'BOT',
  nativeCurrencySymbol: 'BOT',
  nativeCurrencyDecimals: 18,
});

export const CONFIG = {
  // V24.5 is a BOT/Bohr-testnet build. Keep the network identity fixed here so
  // stale repository variables from the older Base deployment cannot redirect
  // wallet_switchEthereumChain to the wrong chain.
  ...BOT_TESTNET,
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS || '',
  walletConnectProjectId: String(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '').trim(),
  publicAppUrl: import.meta.env.VITE_PUBLIC_APP_URL || '',
  maxMilestone: 12,
  verifiedRunRequiredForMint: true,
  version: 'V24.5',
};

export const CONTRACT_ABI = [
  'function startRun(uint256 milestone) external returns (uint64 nonce,bytes32 challenge)',
  'function cancelRun() external',
  'function mintMilestone(uint256 milestone,uint256 clientScore,uint256 playSeconds,uint64 expectedRunNonce) external returns (uint256)',
  'function getActiveRun(address player) external view returns (uint64 nonce,uint64 startedAt,uint32 milestone,bytes32 challenge,bool active)',
  'function hasMintedMilestone(address player,uint256 milestone) external view returns (bool)',
  'function mintedByProtocol(address player,uint256 milestone) external view returns (bool)',
  'function highestCompletedMilestone(address player) external view returns (uint256)',
  'function getMilestone(uint256 milestone) external view returns (tuple(uint32 requiredScore,uint32 minPlaySeconds,bool active,string name))',
  'function paused() external view returns (bool)',
  'function MAX_RUN_SECONDS() external view returns (uint256)',
  'function MAX_SCORE_PER_SECOND() external view returns (uint256)',
  'event RunStarted(address indexed player,uint256 indexed milestone,uint64 indexed nonce,uint64 startedAt,bytes32 challenge)',
  'event RunCancelled(address indexed player,uint64 indexed nonce)',
  'event RunConsumed(address indexed player,uint64 indexed nonce,uint256 indexed milestone)',
  'event MilestoneMinted(address indexed player,uint256 indexed milestone,uint256 indexed tokenId,uint256 clientScore,uint256 playSeconds,uint64 runNonce)',
];
