const ethers = require('ethers');
require('dotenv').config();

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const balance = await wallet.getBalance();
  console.log(`Wallet address: ${wallet.address}`);
  console.log(`Balance: ${ethers.utils.formatEther(balance)} MATIC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });