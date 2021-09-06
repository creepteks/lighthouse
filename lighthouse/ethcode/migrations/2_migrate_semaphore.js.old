const Web3 = require('web3')
const web3 = new Web3("http://localhost:8545");

const semaphore = artifacts.require('Semaphore');
const semaphoreClient = artifacts.require('SemaphoreClient')

const truffleContract = require("@truffle/contract");
var provider = new Web3.providers.HttpProvider("http://localhost:8545");
var mimcJson = require('../build/MiMC.json')
var mimc = truffleContract({abi: mimcJson['abi'], unlinked_binary: mimcJson['bytecode']})
mimc.setProvider(provider)

const NUM_LEVELS = 20
let semaphoreContract
let semaphoreClientContract
let mimcContract
let accounts
let owner

async function doDeploy(deployer, network) {

  // define the sender of the tx
  accounts = await web3.eth.getAccounts(console.log)
  owner = accounts[0]

  console.log('Deploying MiMC')
  mimcContract = await mimc.new({from: owner} )

  console.log('Deploying Semaphore')
  await semaphore.link("MiMC", mimcContract.address)
  semaphoreContract = await deployer.deploy(semaphore, NUM_LEVELS)

  console.log('Deploying Semaphore Client')
  semaphoreClientContract = await deployer.deploy(semaphoreClient)

  console.log('Transferring ownership of the Semaphore contract to the Semaphore Client')
  const tx = await semaphoreContract.transferOwnership(
      semaphoreClientContract.contractAddress,
      {from: owner}
  )

  await tx.wait()
}

module.exports = function (deployer, network) {
  deployer.then(async ()=> {
    await doDeploy(deployer, network);
  });
};
