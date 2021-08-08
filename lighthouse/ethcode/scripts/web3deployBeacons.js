// Importing dependencies
const solc = require('solc')
const linker = require('solc/linker')
const path = require('path')
const fs = require('fs')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
const ethcontract = require('web3-eth-contract');
ethcontract.setProvider(new Web3.providers.HttpProvider("http://localhost:8545"))

async function deployBeaconsAsync(params) {
  
  // creating the byteutils contract by compilation
  var file = fs.readFileSync(path.resolve(__dirname, '../contracts/libs/byteutils.sol'), 'utf-8').toString()
  
  const input = {
    language: 'Solidity',
    sources: {
      ['byteutils.sol']: {
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
  var source = output.contracts['byteutils.sol']
  var byteutilsContract = new ethcontract(source.byteutils.abi)
  var accounts = await web3.eth.getAccounts()
  byteutilsContract.deploy({data: '0x' + source.byteutils.evm.bytecode.object})
  .send({
      from:  accounts[0],
      gas: 8500000,
      gasPrice: '6000000'
  }, function(error, transactionHash){ })
  .on('error', function(error){
      console.error(error)
    })
  .on('transactionHash', function(transactionHash){
      console.log("byteutil deploy tx hash ", transactionHash)
    })
  .on('receipt', function(receipt){
      // contains the new contract address
  })
  .on('confirmation', function(confirmationNumber, receipt){ })
  .then(function(newContractInstance){
      console.log("byteutils addr: ", newContractInstance.options.address) // instance with the new contract address
      var file = fs.readFileSync(path.resolve(__dirname, '../contracts/beacon.sol'), 'utf-8').toString()
      
      const input = {
        language: 'Solidity',
        sources: {
          ['beacon.sol']: {
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
      var source = output.contracts['beacon.sol']
      var beaconContract = new ethcontract(source.beacon.abi)
      // // use solc linker to link the MiMC address to Semaphore bytecode
      bytecode = linker.linkBytecode(source.beacon.evm.bytecode.object, { 'libs/byteutils.sol:byteutils':  newContractInstance.options.address})
      beaconContract.deploy({data: '0x' + bytecode, arguments: [20]})
      .send({
          from:  accounts[0],
          gas: 8500000,
          gasPrice: '6000000'
      }, function(error, transactionHash){ })
      .on('error', function(error){
          console.error(error)
        })
      .on('transactionHash', function(transactionHash){
          console.log("beacon tx hash ", transactionHash)
        })
      .on('receipt', function(receipt){
          // contains the new contract address
      })
      .on('confirmation', function(confirmationNumber, receipt){ })
      .then(function(newContractInstance){
          console.log("beacon addr: ", newContractInstance.options.address) // instance with the new contract address
      });
  });
  
}

function findImports (fileName) {
    var file = fs.readFileSync(path.resolve(__dirname, '../contracts/', fileName), 'utf-8').toString()
    return {contents : file}
}

deployBeaconsAsync()