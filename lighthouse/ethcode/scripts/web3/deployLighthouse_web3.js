// Importing dependencies
const shell = require('shelljs')
const path = require('path')
const fs = require('fs')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.WebsocketProvider("ws://localhost:8545"));
const ethcontract = require('web3-eth-contract');
ethcontract.setProvider(new Web3.providers.WebsocketProvider("ws://localhost:8545"))

let owner
let poseidonInstance
let semaphoreInstance
let semaphoreClientInstance

function findImports (fileName) {
    var file = fs.readFileSync(path.resolve(__dirname, '../../contracts/', fileName), 'utf-8').toString()
    return {contents : file}
}

async function startDeployment(deployMainContract) {
    // creating the poseidon contract by compilation
    var poseidonJson = require('../../build/PoseidonT3.json')
    var poseidonContract = new ethcontract(poseidonJson.abi)
    owner = (await web3.eth.getAccounts())[0]
    poseidonContract.deploy({data: poseidonJson.bytecode})
    .send({
        from:  owner,
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
    
    // use solc linker to link the Poseidon address to Semaphore bytecode
    var semAbiPath = path.resolve(__dirname, '../../build/beacon.abi')
    var semBinPath = path.resolve(__dirname, '../../build/beacon.bin')
    shell.exec(`solc --link `
        + semBinPath
        + ` --libraries contracts/Poseidon.sol:PoseidonT3:`
        + poseidonInstance.options.address)
    var semAbi = JSON.parse(fs.readFileSync(semAbiPath, 'utf-8').toString())
    var semBin = fs.readFileSync(semBinPath, 'utf-8').toString()
    
    var semaphoreContract = new ethcontract(semAbi)
    semaphoreContract.deploy({data: '0x' + semBin, arguments: [20, 0]})
    .send({
        from:  owner,
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

        // semaphoreInstance.events.DebugEvent({
        //     fromBlock: 0
        // }, function(error, event){ 
        //     console.log(event.returnValues); 
        // })
        // .on('data', function(event){
        //     // console.log('event ', event); // same results as the optional callback above
        // })
        // .on('changed', function(event){
        //     // remove event from local database
        // })
        // .on('error', console.error);

        semaphoreInstance.events.LeafInsertion({
            fromBlock: 0
        }, function(error, event){ 
            console.log(event.returnValues); 
        })
        
        deployClientContract(semaphoreInstance)
    });
    
}

async function deploySemaphoreClient(afterDeployment){
    console.log("using semaphore addr: ", semaphoreInstance.options.address) // instance with the new contract address

    var semClAbiPath = path.resolve(__dirname, '../../build/SemaphoreClient.abi')
    var semClBinPath = path.resolve(__dirname, '../../build/SemaphoreClient.bin')
    var semClAbi = JSON.parse(fs.readFileSync(semClAbiPath, 'utf-8').toString())
    var semClBin = fs.readFileSync(semClBinPath, 'utf-8').toString()
    var semaphoreClientContract = new ethcontract(semClAbi)
    semaphoreClientContract.deploy({data: '0x' + semClBin, arguments: [semaphoreInstance.options.address]})
    .send({
        from:  owner,
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

        semaphoreClientInstance = newContractInstance
        // semaphoreInstance.methods.owner()
        // .call({from: owner}, function(err, semaphoreOwner){

        //     console.log("result of getting owner ", semaphoreOwner)
        //     semaphoreInstance.methods.transferOwnership(semaphoreClientInstance.options.address).call({from: semaphoreOwner}, function(err, res) {
        //         console.log("transferring ownership success: ", res)
        //         afterDeployment(semaphoreInstance, semaphoreClientInstance)
        //     })
        // })
        
        afterDeployment(semaphoreInstance, semaphoreClientInstance)
    });
}

module.exports = (async function() {
    return { startDeployment, deploySemaphore, deploySemaphoreClient }
})();