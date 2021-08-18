const Web3 = require('web3')
const web3 = new Web3("http://localhost:8545");
// var ethcontract = require('web3-eth-contract');
// ethcontract.setProvider("http://localhost:8545")


const catchRevert = require("../test/exceptions").catchRevert
const { expect } = require('chai');
const fs = require('fs');


// use truffle contract as opposed to truffle's artifacts.require or truffle test-env's contract.fromArtifacts
const truffleContract = require("@truffle/contract");
var provider = new Web3.providers.HttpProvider("http://localhost:8545");

// build MiMC contract from on-the-fly
var poseidonJson = require('../build/PoseidonT3.json')
var poseidon = truffleContract({contractName: poseidonJson['contractName'], abi: poseidonJson['abi'], unlinked_binary: poseidonJson['bytecode']})
// poseidon.defaults({
//     gas: 8500000,
//     gasPrice: 1000000000
//   })
poseidon.setProvider(provider)

// set semaphore and its client using truffle artifacts 
var semaphoreJson = require("../build/contracts/Semaphore.json")
var semaphore = truffleContract({contractName: semaphoreJson['contractName'], abi: semaphoreJson['abi'], unlinked_binary: semaphoreJson['bytecode']})
semaphore.setProvider(provider)
var semaphoreClientJson = require("../build/contracts/SemaphoreClient.json")
var semaphoreClient = truffleContract({contractName: semaphoreClientJson['contractName'], abi: semaphoreClientJson['abi'], unlinked_binary: semaphoreClientJson['bytecode']})
semaphoreClient.setProvider(provider)



const {
    SnarkBigInt,
    genIdentity,
    genIdentityCommitment,
    genExternalNullifier,
    genWitness,
    genCircuit,
    genProof,
    genPublicSignals,
    verifyProof,
    SnarkProvingKey,
    SnarkVerifyingKey,
    parseVerifyingKeyJson,
    genBroadcastSignalParams,
    genSignalHash,
} = require('libsemaphore')
const path = require('path')
const ethers = require('ethers')

const NUM_LEVELS = 20
const FIRST_EXTERNAL_NULLIFIER = 0
const SIGNAL = 'signal0'


// let semaphoreContract
// let semaphoreClientContract
let accounts
let owner

// hex representations of all inserted identity commitments
let insertedIdentityCommitments = []

// Load circuit, proving key, and verifying key
const circuitPath = path.join(__dirname, '../../circuits/build/circuit.json')
const provingKeyPath = path.join(__dirname, '../../circuits/build/proving_key.bin')
const verifyingKeyPath = path.join(__dirname, '../../circuits/build/verification_key.json')

const cirDef = JSON.parse(fs.readFileSync(circuitPath).toString())
const provingKey = fs.readFileSync(provingKeyPath)
const verifyingKey = parseVerifyingKeyJson(fs.readFileSync(verifyingKeyPath).toString())
const circuit = genCircuit(cirDef)
let identity
let identityCommitment
let proof
let publicSignals
let params

const doScenario = async function(semaphoreInstance, semaphoreClientInstance) {
    identity = genIdentity();
    identityCommitment = genIdentityCommitment(identity);
    
    var res = semaphoreInstance.methods.insertIdentity(identityCommitment.toString()).send({ from: owner })
    .on('receipt', async function(receipt) {
        insertedIdentityCommitments.push('0x' + identityCommitment.toString(16))
        
    
        // proof gen
        const result = await genWitness(
            SIGNAL,
            circuit,
            identity,
            insertedIdentityCommitments,
            NUM_LEVELS,
            FIRST_EXTERNAL_NULLIFIER,
        )
    
        proof = await genProof(result.witness, provingKey)
        publicSignals = genPublicSignals(result.witness, circuit)
        params = genBroadcastSignalParams(result, proof, publicSignals)
    
        var res = semaphoreInstance.methods.broadcastSignal(
            ethers.utils.toUtf8Bytes(SIGNAL),
            params.proof,
            params.root,
            params.nullifiersHash,
            // FIRST_EXTERNAL_NULLIFIER,
            params.externalNullifier)
            .send({ from: owner, gasLimit: 1000000 })
            .on('receipt', function(receipt) {
                
            })
    })
}


async function startScenario() {
    accounts = await web3.eth.getAccounts()
    owner = accounts[0]
    const { 
        startDeployment,
        deploySemaphore,
        deploySemaphoreClient 
    } = await require('./deployLighthouse_web3')
    await startDeployment(function() {
        deploySemaphore(function() {
            deploySemaphoreClient(async function(semaphoreInstance, semaphoreClientInstance) {
                doScenario(semaphoreInstance, semaphoreClientInstance)
            })
        })
    })
}

function clearPreviousTests() {
    insertedIdentityCommitments = []
}

async function insertCommitment(owner) {
   

    return { tx, identityCommitment, identity };
}

startScenario()