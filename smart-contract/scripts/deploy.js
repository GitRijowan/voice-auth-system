async function main() {
  const VoiceAuth = await ethers.getContractFactory("VoiceAuth");
  const voiceAuth = await VoiceAuth.deploy();
  await voiceAuth.deployed();
  console.log("VoiceAuth deployed to:", voiceAuth.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });