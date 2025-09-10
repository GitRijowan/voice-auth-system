# Decentralized Voice Authentication System
A blockchain-based voice authentication system combining voice biometrics with immutable audit trails on Polygon.
## Features
- Voiceprint registration & verification
- Immutable authentication records on blockchain
- Real-time transaction status
- Wallet balance checking
- Responsive web interface

## Tech Stack
- **Blockchain**: Solidity, Hardhat, Ethers.js, Polygon Amoy
- **Backend**: Node.js, Express, FFmpeg
- **Frontend**: HTML, CSS, JavaScript, Web Audio API

## Setup
```bash
# Smart Contract
cd smart-contract
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network polygonAmoy

# Backend
cd backend
npm install
# Create .env with PRIVATE_KEY, RPC_URL, CONTRACT_ADDRESS
node server.js

# Frontend
cd frontend
npm install -g serve
serve -s index.html -l 8000
```
## Usage
1. Open `http://localhost:8000`
2. Connect MetaMask to Polygon Amoy
3. Register your voice → Authenticate

## Troubleshooting
- **Transaction dropped**: Increase gas price, check balance
- **Voiceprint mismatch**: Record in same conditions
- **CORS errors**: Ensure both servers running

## Security Note
Demo system vulnerable to replay attacks. Add liveness detection for production.

## License
Educational purposes only.
