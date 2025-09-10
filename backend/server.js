const express = require('express');
const multer = require('multer');
const ethers = require('ethers');
require('dotenv').config();
const AudioProcessor = require('./audio-processor');

const app = express();
const port = 3000;

// Add CORS headers manually
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Setup for file upload
const upload = multer({ dest: 'uploads/' });

// Blockchain setup
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractAddress = process.env.CONTRACT_ADDRESS;
const abi = [
  "function registerUser(string memory _voiceHash) public",
  "function authenticate(string memory _voiceHash) public",
  "function registeredUsers(address) public view returns (bool)",
  "function userVoiceprints(address) public view returns (string memory)",
  "event UserRegistered(address indexed user)",
  "event AuthRecorded(address indexed user, bool success, uint256 timestamp)"
];

const contract = new ethers.Contract(contractAddress, abi, wallet);

// Helper function to check wallet balance
async function checkWalletBalance() {
  const balance = await wallet.getBalance();
  const balanceInMatic = ethers.utils.formatEther(balance);
  console.log(`Current wallet balance: ${balanceInMatic} MATIC`);
  return { balance, balanceInMatic };
}

// Helper function to estimate transaction cost
async function estimateTransactionCost(gasPrice, gasLimit = 300000) {
  const gasCost = gasPrice.mul(gasLimit);
  const gasCostInMatic = ethers.utils.formatEther(gasCost);
  console.log(`Estimated transaction cost: ${gasCostInMatic} MATIC (Gas: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei)`);
  return { gasCost, gasCostInMatic };
}

// Helper function to send transaction with fixed gas price
async function sendTransactionWithFixedGas(transactionFunction) {
  try {
    // Get current gas price and add 20% buffer
    const currentGasPrice = await provider.getGasPrice();
    const gasPrice = currentGasPrice.mul(120).div(100); // 20% higher than current

    console.log(`Using gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);

    // Check wallet balance
    const { balance, balanceInMatic } = await checkWalletBalance();
    const { gasCost, gasCostInMatic } = await estimateTransactionCost(gasPrice);

    // Check if we have enough balance
    if (balance.lt(gasCost)) {
      throw new Error(`Insufficient funds. Need ${gasCostInMatic} MATIC but only have ${balanceInMatic} MATIC`);
    }

    // Send transaction
    const tx = await transactionFunction(gasPrice);

    // Wait for transaction to be mined
    const receipt = await tx.wait(1);

    if (receipt.status === 1) {
      return { success: true, receipt, tx };
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    console.error('Transaction error:', error);
    throw error;
  }
}

// Check registration endpoint
app.get('/check-registration/:address', async (req, res) => {
  try {
    const address = req.params.address;
    const isRegistered = await contract.registeredUsers(address);
    res.json({ address, isRegistered });
  } catch (error) {
    console.error('Check registration error:', error);
    res.status(500).json({ success: false, message: 'Failed to check registration' });
  }
});

// Register endpoint with fixed gas price
app.post('/register', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No audio file uploaded' });
    }

    // Process audio
    const voiceHash = await AudioProcessor.extractVoiceprint(req.file.path);

    // Define the transaction function
    const transactionFunction = async (gasPrice) => {
      return await contract.registerUser(voiceHash, {
        gasPrice: gasPrice,
        gasLimit: 300000
      });
    };

    // Send transaction with fixed gas price
    const result = await sendTransactionWithFixedGas(transactionFunction);

    res.json({
      success: true,
      message: "Registration confirmed",
      txHash: result.tx.hash,
      blockNumber: result.receipt.blockNumber,
      gasUsed: result.receipt.gasUsed.toString()
    });

  } catch (error) {
    console.error('Registration error:', error);
    if (error.message.includes('Insufficient funds')) {
      res.status(500).json({
        success: false,
        message: 'Insufficient MATIC balance for transaction fees. Please add more MATIC to your wallet.',
        error: error.message
      });
    } else {
      res.status(500).json({ success: false, message: 'Registration failed: ' + error.message });
    }
  }
});

// Authentication endpoint
app.post('/authenticate', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No audio file uploaded' });
    }

    const userAddress = req.body.address;

    // Check if user is registered
    const isRegistered = await contract.registeredUsers(userAddress);
    if (!isRegistered) {
      return res.status(401).json({ success: false, message: 'User not registered' });
    }

    // Process audio
    const voiceHash = await AudioProcessor.extractVoiceprint(req.file.path);

    // Get the stored voiceprint for comparison
    const storedVoiceHash = await contract.userVoiceprints(userAddress);

    // Compare voiceprints
    const voiceprintsMatch = voiceHash === storedVoiceHash;

    // Define the transaction function
    const transactionFunction = async (gasPrice) => {
      return await contract.authenticate(voiceHash, {
        gasPrice: gasPrice,
        gasLimit: 300000
      });
    };

    // Send transaction with fixed gas price
    const result = await sendTransactionWithFixedGas(transactionFunction);

    res.json({
      success: voiceprintsMatch,
      message: voiceprintsMatch ? "Authentication successful" : "Voiceprint mismatch",
      txHash: result.tx.hash
    });

  } catch (error) {
    console.error('Authentication error:', error);
    if (error.message.includes('Insufficient funds')) {
      res.status(500).json({
        success: false,
        message: 'Insufficient MATIC balance for transaction fees. Please add more MATIC to your wallet.',
        error: error.message
      });
    } else {
      res.status(500).json({ success: false, message: 'Authentication failed: ' + error.message });
    }
  }
});

// Add endpoint to check wallet balance
app.get('/check-balance', async (req, res) => {
  try {
    const { balance, balanceInMatic } = await checkWalletBalance();
    const currentGasPrice = await provider.getGasPrice();
    const { gasCost, gasCostInMatic } = await estimateTransactionCost(currentGasPrice);

    res.json({
      balance: balance.toString(),
      balanceInMatic,
      currentGasPrice: ethers.utils.formatUnits(currentGasPrice, 'gwei'),
      estimatedCost: gasCostInMatic,
      sufficient: balance.gte(gasCost)
    });
  } catch (error) {
    console.error('Balance check error:', error);
    res.status(500).json({ success: false, message: 'Failed to check balance' });
  }
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});