const Web3 = require('web3')
const web3 = new Web3("http://localhost:8545");
// var ethcontract = require('web3-eth-contract');
// ethcontract.setProvider("http://localhost:8545")


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

// set semaphore and its client using truffle contract
var semJson = require('../build/contracts/Semaphore.json')
var semClientJson = require('../build/contracts/SemaphoreClient.json')
var semaphore = truffleContract({contractName: semJson['contractName'], abi: semJson['abi'], unlinked_binary: semJson['bytecode']})
var semaphoreClient = truffleContract({contractName: semClientJson.contractName, abi: semClientJson.abi, unlinked_binary: semClientJson.bytecode})
semaphore.setProvider(provider)
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

// Load circuit, proving key, and verifying key
const circuitPath = path.join(__dirname, '../../circuits/build/circuit.json')
const provingKeyPath = path.join(__dirname, '../../circuits/build/proving_key.bin')
const verifyingKeyPath = path.join(__dirname, '../../circuits/build/verification_key.json')

const cirDef = JSON.parse(fs.readFileSync(circuitPath).toString())
const provingKey = fs.readFileSync(provingKeyPath)
const verifyingKey = parseVerifyingKeyJson(fs.readFileSync(verifyingKeyPath).toString())
const circuit = genCircuit(cirDef)


let semaphoreContract
let semaphoreClientContract
let accounts
let owner
// hex representations of all inserted identity commitments
let insertedIdentityCommitments = []
let identity
let identityCommitment
let proof
let publicSignals
let params

async function deploy() {
    // define the sender of the tx
    accounts = await web3.eth.getAccounts(/*console.log*/)
    owner = accounts[0]

    console.log('Deploying Poseidon')
    poseidonContract = await poseidon.new({from: owner} )
    console.log('Deploying Semaphore')
    await semaphore.detectNetwork()
    // await semaphore.link('MiMC', mimcContract.address)
    // await semaphore.link(mimcContract)
    await semaphore.link('PoseidonT3', poseidonContract.address)
    semaphoreContract = await semaphore.new(NUM_LEVELS, FIRST_EXTERNAL_NULLIFIER, {from: owner})

    console.log('Deploying Semaphore Client')
    semaphoreClientContract = await semaphoreClient.new(semaphoreContract.address, {from: owner})

    console.log('Transferring ownership of the Semaphore contract to the Semaphore Client')
    await semaphoreContract.transferOwnership(
        semaphoreClientContract.address,
        {from: owner}
    )

    const {identity} =  await insertCommitment(owner) 
            
    const leaves = await semaphoreClientContract.getIdentityCommitments()

    console.log("generating witness")
    const result = await genWitness(
        SIGNAL,
        circuit,
        identity,
        leaves,
        NUM_LEVELS,
        FIRST_EXTERNAL_NULLIFIER,
    )

    console.log("generating proof and public params")
    proof = await genProof(result.witness, provingKey)
    publicSignals = genPublicSignals(result.witness, circuit)
    params = genBroadcastSignalParams(result, proof, publicSignals)

    // console.log("the identity used for witness ", identity)
    console.log("the inserted root: ", params.root)
}

async function prebroadcast() {
    const signal = ethers.utils.toUtf8Bytes(SIGNAL)
    const signalHash = genSignalHash(signal).toString()
    console.log("using root ", params.root)
    const check = await semaphoreContract.preBroadcastCheck(
        signal,
        params.proof,
        params.root,
        params.nullifiersHash,
        signalHash,
        FIRST_EXTERNAL_NULLIFIER,
        {from: owner}
    )
    // expect(check).to.be.true
}

async function broadcast() {
     // expect.assertions(3)
     const tx = await semaphoreClientContract.broadcastSignal(
        ethers.utils.toUtf8Bytes(SIGNAL),
        params.proof,
        params.root,
        params.nullifiersHash,
        FIRST_EXTERNAL_NULLIFIER,
    )
    const receipt = tx.receipt
    // expect(receipt.status).to.equal(1)
    console.log('Gas used by broadcastSignal():', receipt.gasUsed.toString())

    const index = (await semaphoreClientContract.nextSignalIndex()) - 1
    const signal = await semaphoreClientContract.signalIndexToSignal(index.toString())

    // expect(ethers.utils.toUtf8String(signal)).to.equal(SIGNAL)
}

async function insertCommitment(owner) {
    const identity = genIdentity();
    const identityCommitment = genIdentityCommitment(identity);

    const tx = await semaphoreClientContract.insertIdentityAsClient(
        identityCommitment.toString(),
        { from: owner }
    );
    
    insertedIdentityCommitments.push('0x' + identityCommitment.toString(16))

    return { tx, identityCommitment, identity };
}

async function scenario() {
    await deploy()
    await prebroadcast()
    await broadcast()
}

scenario()