const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
const ethcontract = require('web3-eth-contract');
ethcontract.setProvider("http://localhost:8545")

const Artifactor = require("@truffle/artifactor");
const artifactor = new Artifactor('../build/');
const mimcGenContract = require('circomlib/src/mimcsponge_gencontract.js');
const SEED = 'mimcsponge'
let mimcAddr

unlinkedBytecode = mimcGenContract.createCode(SEED, 220)
artifactor.save({
    contractName: 'MiMC',
    abi: mimcGenContract.abi,
    unlinked_binary: unlinkedBytecode
})

var mimc = new ethcontract(mimcGenContract.abi)
mimc.deploy({data: unlinkedBytecode})
.send({
    from:  '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
    gas: 8500000,
    gasPrice: '6000000'
}, function(error, transactionHash){ })
.on('error', function(error){ })
.on('transactionHash', function(transactionHash){ })
.on('receipt', function(receipt){
    console.log(receipt.contractAddress) // contains the new contract address
    mimcAddr = receipt.contractAddress
})
.on('confirmation', function(confirmationNumber, receipt){ })
.then(function(newContractInstance){
    console.log(newContractInstance.options.address) // instance with the new contract address
});