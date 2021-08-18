// Importing dependencies
const solc = require('solc')
const linker = require('solc/linker')
const path = require('path')
const fs = require('fs')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
const ethcontract = require('web3-eth-contract');
ethcontract.setProvider(new Web3.providers.HttpProvider("http://localhost:8545"))

let poseidonContract
let semaphoreContract
let semaphoreClientContract
let accounts

let poseidonInstance
let semaphoreInstance
let semaphoreClientInstance

function findImports (fileName) {
    var file = fs.readFileSync(path.resolve(__dirname, '../contracts/', fileName), 'utf-8').toString()
    return {contents : file}
}

async function startDeployment(deployMainContract) {
    // creating the poseidon contract by compilation
    var poseidonJson = require('../build/PoseidonT3.json')
    var poseidonContract = new ethcontract(poseidonJson.abi)
    accounts = await web3.eth.getAccounts()
    poseidonContract.deploy({data: poseidonJson.bytecode})
    .send({
        from:  accounts[0],
        gas: 8500000,
        gasPrice: '6000000'
    }, function(error, transactionHash){ })
    .on('error', function(error){
        console.error(error)
    })
    .on('transactionHash', function(transactionHash){
        console.log("poseidon deploy tx hash ", transactionHash)
    })
    .on('receipt', function(receipt){
        // contains the new contract address
    })
    .on('confirmation', function(confirmationNumber, receipt){ })
    .then(function(_poseidonInstance) {
        poseidonInstance = _poseidonInstance
        deployMainContract()
    } );
}

async function deploySemaphore(deployClientContract){
    console.log("using poseidon addr: ", poseidonInstance.options.address) // instance with the new contract address
    var file = fs.readFileSync(path.resolve(__dirname, '../contracts/Semaphore.sol'), 'utf-8').toString()
    
    const input = {
    language: 'Solidity',
    sources: {
        ['Semaphore.sol']: {
        content: file
        }
    },
    settings: {
        outputSelection: {
        '*': {
            '*': ['*']
        }
        }
    }
    }
    
    const output = JSON.parse(solc.compile(JSON.stringify(input), findImports))
    var source = output.contracts['Semaphore.sol']
    var semaphoreContract = new ethcontract(source.Semaphore.abi)
    // // use solc linker to link the Poseidon address to Semaphore bytecode
    bytecode = linker.linkBytecode(source.Semaphore.evm.bytecode.object, { 'Poseidon.sol:PoseidonT3':  poseidonInstance.options.address})
    semaphoreContract.deploy({data: '0x' + bytecode, arguments: [20, 0]})
    .send({
        from:  accounts[0],
        gas: 8500000,
        gasPrice: '6000000'
    }, function(error, transactionHash){ })
    .on('error', function(error){
        console.error(error)
    })
    .on('transactionHash', function(transactionHash){
        console.log("Semaphore deploy tx hash ", transactionHash)
    })
    .on('receipt', function(receipt){
        // contains the new contract address
    })
    .on('confirmation', function(confirmationNumber, receipt){ })
    .then(function(_semInstance) {
        semaphoreInstance = _semInstance
        semaphoreInstance.methods.transferOwnership(accounts[0]).send({from: accounts[0]})
        .on('receipt', function() {
            console.log("transferring ownership success: ", receipt.status)
        })
        deployClientContract()
    });
}

async function deploySemaphoreClient(afterDeployment){
    console.log("using semaphore addr: ", semaphoreInstance.options.address) // instance with the new contract address
    var file = fs.readFileSync(path.resolve(__dirname, '../contracts/SemaphoreClient.sol'), 'utf-8').toString()
    
    const input = {
    language: 'Solidity',
    sources: {
        ['SemaphoreClient.sol']: {
        content: file
        }
    },
    settings: {
        outputSelection: {
        '*': {
            '*': ['*']
        }
        }
    }
    }
    
    const output = JSON.parse(solc.compile(JSON.stringify(input), findImports))
    var source = output.contracts['SemaphoreClient.sol']
    var semaphoreClientContract = new ethcontract(source.SemaphoreClient.abi)
    semaphoreClientContract.deploy({data: '0x' + source.SemaphoreClient.evm.bytecode.object, arguments: [semaphoreInstance.options.address]})
    .send({
        from:  accounts[0],
        gas: 8500000,
        gasPrice: '6000000'
    }, function(error, transactionHash){ })
    .on('error', function(error){
        console.error(error)
    })
    .on('transactionHash', function(transactionHash){
        console.log("SemaphoreClient deploy tx hash ", transactionHash)
    })
    .on('receipt', function(receipt){
        // contains the new contract address
    })
    .on('confirmation', function(confirmationNumber, receipt){ })
    .then(function(newContractInstance){
        console.log("SemaphoreClient addr: ", newContractInstance.options.address) // instance with the new contract address
        console.log("transferring ownership of semaphore to semaphore client")

      

        semaphoreClientInstance = newContractInstance

        afterDeployment(semaphoreInstance, semaphoreClientInstance)
    });
}

module.exports = (async function() {
    return { startDeployment, deploySemaphore, deploySemaphoreClient }
})();