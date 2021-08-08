// Importing dependencies
const solc = require('solc')
const linker = require('solc/linker')
const path = require('path')
const fs = require('fs')
const Web3 = require('web3')
// const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
const ethcontract = require('web3-eth-contract');
ethcontract.setProvider(new Web3.providers.HttpProvider("http://localhost:8545"))

const NUM_LEVELS = 20

// creating the semaphore contract by compilation
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
var semaphore = new ethcontract(source.Semaphore.abi)
// use solc linker to link the MiMC address to Semaphore bytecode
bytecode = linker.linkBytecode(source.Semaphore.evm.bytecode.object, { 'MiMC.sol:MiMC': '0x970e8f18ebfEa0B08810f33a5A40438b9530FBCF' })

// this method use the compiled artifacts using solc directly
// solc --bin --abi Semaphore.sol -o ../build/compiled
// solc --link Semaphore.bin --libraries MiMC.sol:MiMC:0xe982E462b094850F12AF94d21D470e21bE9D0E9C
// renaming Semaphore.abi to json as JSON.parse does not work on the abi.... :-|
// var abi = require('../build/compiled/Semaphore.json')
// var bytecode = fs.readFileSync(path.resolve(__dirname, '../build/compiled/Semaphore.bin'), 'utf-8').toString()
// var semaphore = new ethcontract(abi)

semaphore.deploy({data: '0x' + bytecode, arguments: [NUM_LEVELS]})
.send({
    from:  '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
    gas: 8500000,
    gasPrice: '6000000'
}, function(error, transactionHash){ })
.on('error', function(error){
    console.error(error)
  })
.on('transactionHash', function(transactionHash){
    console.log("semaphore tx hash ", transactionHash)
  })
.on('receipt', function(receipt){
    console.log(receipt.contractAddress) // contains the new contract address
})
.on('confirmation', function(confirmationNumber, receipt){ })
.then(function(newContractInstance){
    console.log(newContractInstance.options.address) // instance with the new contract address
});


function findImports (fileName) {
    var file = fs.readFileSync(path.resolve(__dirname, '../contracts/', fileName), 'utf-8').toString()
    return {contents : file}
}  