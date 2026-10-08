# Base Quest Milestones → BOT Chain Integration Status

## Preservation rule

The existing Base deployment and project history are preserved. This BOT build is a separate integration path and must not overwrite the existing Base smart contract.

## Current target

- Network: Bohr Testnet (BOT Chain test environment)
- Chain ID: 968
- RPC: https://rpc.bohr.life
- Explorer: https://scan.bohr.life
- Native gas token: Test BOT
- Milestones: 12

## Integration sequence

1. Keep the 12-stage game/contract configuration synchronized.
2. Deploy `BaseQuestMilestones.sol` to Bohr Testnet.
3. Set the deployed address as `VITE_CONTRACT_ADDRESS`.
4. Rebuild/redeploy the frontend.
5. Complete a clean run and mint at least milestone #1.
6. Confirm the transaction and NFT contract on the Bohr explorer.
7. Confirm `tokenURI` resolves to the correct metadata and artwork.
8. Share contract address, mint transaction hash, and app/demo link with BOT Chain for review.
9. Do not move to BOT Mainnet until the testnet review is accepted.
