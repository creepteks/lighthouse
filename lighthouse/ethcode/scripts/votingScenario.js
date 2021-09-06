const Web3 = require('web3')
const web3 = new Web3("http://localhost:8545");
// var ethcontract = require('web3-eth-contract');
// ethcontract.setProvider("http://localhost:8545")


const { expect } = require('chai');
const fs = require('fs');

// use truffle contract as opposed to truffle's artifacts.require or truffle test-env's contract.fromArtifacts
const truffleContract = require('@truffle/contract');
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
    genRandomSalt,
    genPrivKey,
    genPubKey,
    genKeypair,
    genEcdhSharedKey,
    encrypt,
    decrypt,
    sign,
    hashOne,
    hash5,
    hash11,
    hashLeftRight,
    verifySignature,
    Signature,
    PrivKey,
    PubKey,
    Keypair,
    EcdhSharedKey,
    Ciphertext,
    Plaintext,
    SnarkBigInt,
    stringifyBigInts,
    unstringifyBigInts,
    formatPrivKeyForBabyJub,
    IncrementalQuinTree,
    NOTHING_UP_MY_SLEEVE,
    NOTHING_UP_MY_SLEEVE_PUBKEY,
    SNARK_FIELD_SIZE,
    bigInt2Buffer,
    packPubKey,
    unpackPubKey,
} = require('../../client/node_modules/maci-crypto/build')
const { utils } = require('../../client/node_modules/ffjavascript');
const {
    // stringifyBigInts,
    // unstringifyBigInts,
    beBuff2int,
    beInt2Buff,
    leBuff2int,
    leInt2Buff,
} = utils;
const biginteger = require('../../client/node_modules/big-integer/BigInteger')

const circomlib= require('circomlib')
const poseidonHasher = circomlib.poseidon

const path = require('path')
const ethers = require('ethers')
const snarkjs = require('snarkjs')

const NUM_LEVELS = 20
const FIRST_EXTERNAL_NULLIFIER = 0
const SIGNAL = 'signal0'
let semaphoreContract
let semaphoreClientContract
let accounts
let owner
let wtns = {type: "mem"};
// let lighthouse_zkey_final = {type: "file"};
let vKey;
let proof
let publicSignals
// hex representations of all inserted identity commitments
let insertedIdentityCommitments = []
let identity
let identityCommitment
let proof_res

// Load circuit and verifying key
const lighthouse_circuit_path = path.join(__dirname, '../../circuits/build/lighthouse.wasm')
const lighthouse_zkey_final = path.join(__dirname, '../../circuits/build/lighthouse_final.zkey')
const verifyingKeyPath = path.join(__dirname, '../../circuits/build/verification_key.json')



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
    proof_res = await _genProof(
        SIGNAL,
        lighthouse_circuit_path,
        identity,
        leaves,
        NUM_LEVELS,
        FIRST_EXTERNAL_NULLIFIER,
    )
    wtns = proof_res.wtns
    console.log("root: ", proof_res.merkleProof.root)
    console.log("public signals ", proof_res.publicSignals)
    console.log("generating proof and public signals")
    
    vKey = parseVerifyingKeyJson(fs.readFileSync(verifyingKeyPath).toString())
    const res = await snarkjs.groth16.verify(vKey, proof_res.publicSignals, proof_res.proof);
    console.log(res)
}

async function prebroadcast() {
    const signal = ethers.utils.toUtf8Bytes(SIGNAL)
    const signalHash = genSignalHash(signal).toString()
    console.log("using root ", proof_res.merkleProof.root)
    const check = await semaphoreContract.preBroadcastCheck(
        signal,
        proof_res.proof,
        proof_res.merkleProof.root,
        proof_res.publicSignals[1],
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
        proof_res.proof,
        proof_res.merkleProof.root,
        proof_res.publicSignals[1],
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
    ).then(function(result) {
        // result.tx => transaction hash, string
        // result.logs => array of trigger events (1 item in this case)
        // result.receipt => receipt object
        for (let index = 0; index < result.logs.length; index++) {
            const element = result.logs[index];
            console.log(element)
        }
      });;
    
    insertedIdentityCommitments.push('0x' + identityCommitment.toString(16))

    return { tx, identityCommitment, identity };
}

async function scenario() {
    await deploy()
    // await prebroadcast()
    await broadcast()
}

const genIdentity = (
    // privKey = genPrivKey(),
) => {

    // The identity nullifier and identity trapdoor are separate random 31-byte
    // values
    return {
        keypair: genKeypair(),
        identityNullifier: genRandomSalt(),
        identityTrapdoor: genRandomSalt(),
    }
}

const genIdentityCommitment = (
    identity,
) => {

    return pedersenHash([
        circomlib.babyJub.mulPointEscalar(identity.keypair.pubKey, 8)[0],
        identity.identityNullifier,
        identity.identityTrapdoor,
    ])
}

const _genProof = async (
    signal,
    circuit,
    identity,
    idCommitments,
    treeDepth,
    externalNullifier,
    transformSignalToHex,
) => {

    // convert idCommitments
    const idCommitmentsAsBigInts = []
    for (let idc of idCommitments) {
        idCommitmentsAsBigInts.push(stringifyBigInts(biginteger(idc.toString())))
    }

    const identityCommitment = genIdentityCommitment(identity)
    const index = idCommitmentsAsBigInts.indexOf(stringifyBigInts(identityCommitment))
    const tree = new IncrementalQuinTree(treeDepth, NOTHING_UP_MY_SLEEVE, 2)
    // for (let ic of idCommitments) {
    //     tree.insert(unstringifyBigInts(ic))
    // }
    tree.insert(identityCommitment)

    const merkleProof = await tree.genMerklePath(index)

    const signalHash = keccak256HexToBigInt(ethers.utils.hexlify(ethers.utils.toUtf8Bytes(signal)))

    const { signature, msg } = genSignedMsg(
        identity.keypair.privKey,
        externalNullifier,
        signalHash, 
    )
    var input = {
        identity_pk: stringifyBigInts(identity.keypair.pubKey),
        auth_sig_r: stringifyBigInts(signature.R8),
        auth_sig_s: stringifyBigInts(signature.S),
        signal_hash: stringifyBigInts(signalHash),
        external_nullifier: stringifyBigInts(externalNullifier),
        identity_nullifier: stringifyBigInts(identity.identityNullifier),
        identity_trapdoor: stringifyBigInts(identity.identityTrapdoor),
        identity_path_elements: stringifyBigInts(merkleProof.pathElements),
        identity_path_index: stringifyBigInts(merkleProof.indices),
        fake_zero: stringifyBigInts(biginteger(0)),
    }
    fs.writeFileSync(path.join(__dirname, '../data/input.json'), JSON.stringify(input, null, 2))

    const {proof, publicSignals} = await snarkjs.groth16.fullProve({
        identity_pk: identity.keypair.pubKey,
        auth_sig_r: signature.R8,
        auth_sig_s: signature.S,
        signal_hash: signalHash,
        external_nullifier: externalNullifier,
        identity_nullifier: identity.identityNullifier,
        identity_trapdoor: identity.identityTrapdoor,
        identity_path_elements: merkleProof.pathElements,
        identity_path_index: merkleProof.indices,
        fake_zero: 0
    }, lighthouse_circuit_path, lighthouse_zkey_final);

    // shell.env['NODE_OPTIONS'] = '--max-old-space-size=16384'
    // shell.exec(`node --max-old-space-size=16384 --stack-size=1073741 ../node_modules/snarkjs/cli.js groth16 fullprove ../data/input.json ../../circuits/build/lighthouse.wasm lighthouse_final.zkey ../data/proof.json ../data/public.json`)
   
    return {
        wtns,
        signal,
        signalHash,
        // signature,
        // msg,
        tree,
        // identityPath,
        // identityPathIndex,
        // identityPathElements,
        merkleProof, 
        proof, 
        publicSignals
    }
}

const pedersenHash = (ints) => {

    const p = circomlib.babyJub.unpackPoint(
        circomlib.pedersenHash.hash(
            Buffer.concat(
                ints.map(x => leInt2Buff(x, 32))
            )
        )
    )

    return biginteger(p[0])
}

const keccak256HexToBigInt = (
    signal,
) => {
    const signalAsBuffer = Buffer.from(signal.slice(2), 'hex')
    const signalHashRaw = ethers.utils.solidityKeccak256(
        ['bytes'],
        [signalAsBuffer],
    )
    const signalHashRawAsBytes = Buffer.from(signalHashRaw.slice(2), 'hex');
    const signalHash = beBuff2int(signalHashRawAsBytes.slice(0, 31))

    return signalHash
}

const genSignedMsg = (
    privKey,
    externalNullifier,
    signalHash,
) => {
    const hasher = poseidonHasher
    const msg = hasher([
        externalNullifier,
        signalHash,
    ])

    return {
        msg,
        signature: sign(privKey, msg),
    }
}

const genSignalHash = (x) => keccak256HexToBigInt(ethers.utils.hexlify(x))

const parseVerifyingKeyJson = (
    verifyingKeyStr,
) => {
    return unstringifyBigInts(JSON.parse(verifyingKeyStr))
}

scenario()