# Security Architecture Plan

## Current Testnet
- Client-side game runs on GitHub Pages.
- Smart contract does not store private data.
- No private keys are stored.
- Metadata is read-only.

## Important limitation
A static GitHub Pages application cannot prove gameplay was honest.
Any value calculated only in the browser can be modified by a user.

## Future GameFi version
Recommended flow:
Game Client
 -> Verification service
 -> Signed achievement proof
 -> Smart contract mint

The verification data should be read-only from the client perspective.
The verifier key must never be stored in GitHub Pages.

## GitHub security rules
- No .env files
- No secrets in repository
- Use GitHub Actions secrets only for CI
