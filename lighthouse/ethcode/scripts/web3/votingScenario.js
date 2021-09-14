const Web3 = require('web3')
const web3 = new Web3("ws://localhost:8545");


const catchRevert = require("../../test/exceptions").catchRevert
const { expect } = require('chai');
const fs = require('fs');


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
} = require('../../../client/node_modules/maci-crypto')

const { utils } = require('../../../client/node_modules/ffjavascript');
const {
    // stringifyBigInts,
    // unstringifyBigInts,
    beBuff2int,
    beInt2Buff,
    leBuff2int,
    leInt2Buff,
} = utils;
const biginteger = require('../../../client/node_modules/big-integer')

const circomlib= require('circomlib')
const poseidonHasher = circomlib.poseidon

const path = require('path')
const ethers = require('ethers')
const snarkjs = require('snarkjs')

const NUM_LEVELS = 20
const FIRST_EXTERNAL_NULLIFIER = 0
const SIGNAL = 'signal0'
let owner
let accounts
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
const lighthouse_circuit_path = path.join(__dirname, '../../../circuits/build/lighthouse.wasm')
const lighthouse_zkey_final = path.join(__dirname, '../../../circuits/build/lighthouse_final.zkey')
const verifyingKeyPath = path.join(__dirname, '../../../circuits/build/verification_key.json')



const doScenario = async function(semaphoreInstance, semaphoreClientInstance) {
    // define the sender of the tx
    // accounts = await web3.eth.getAccounts(/*console.log*/)
    owner = web3.eth.accounts.privateKeyToAccount("0x2bc4341e0add33ceb264f774c9de2bfcce14cf97ac2df479b54f23bd751808d6");
    accounts = await web3.eth.getAccounts()

    const identity = genIdentity();
    const identityCommitment = genIdentityCommitment(identity);

    console.log("inserting ", identityCommitment.toString())

    // todo : fix for odd-length arrays, not every time
    var sigbyte = []
    sigbyte.push(0)
    var sig = ethers.utils.toUtf8Bytes(SIGNAL)
    for (let i = 0; i < sig.length; i++) {
        sigbyte.push(sig[i]);
    }

    var tx = semaphoreInstance.methods.insertIdentity(identityCommitment.toString())
    var receipt = await send(web3, owner, tx)
    // insertedIdentityCommitments.push('0x' + identityCommitment.toString(16))
    insertedIdentityCommitments.push(identityCommitment)
    semaphoreInstance.methods.getIdentityCommitments().call({ from: accounts[0] }, async function(err, leaves){
        console.log("generating proof")
        proof_res = await genProof(
            sigbyte,
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

     

        console.log("send the vote tx")
        var params = genBroadcastSignalParams(SIGNAL, proof_res.proof, proof_res.publicSignals)
        var tx = semaphoreInstance.methods.broadcastSignal(
            sigbyte, 
            params.proof,
            params.root,
            params.nullifiersHash,
            params.externalNullifier
        )
        var receipt = await send(web3, owner, tx)
        console.log("voted ", receipt.status)
    });
}

async function send(web3, account, transaction) {
    while (true) {
        try {
            const options = {
                data: transaction.encodeABI(),
                to: transaction._parent._address,
                //gas: await transaction.estimateGas({ from: account.address }),
                gas: 2100000,
                gasPrice: 10000000000,
            };
            const signed = await web3.eth.accounts.signTransaction(options, account.privateKey);
            const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
            return receipt;
        }
        catch (error) {
            console.log(error)
            return error
        }
    }
}

async function startScenario() {
    const { 
        startDeployment,
        deploySemaphore,
        deploySemaphoreClient
    } = await require('./deployLighthouse_web3')
    await startDeployment(function() {
        deploySemaphore(function() {
            deploySemaphoreClient(function(semaphoreInstance, semaphoreClientInstance) {
                doScenario(semaphoreInstance, semaphoreClientInstance)
            })
        })
    })
}

function clearPreviousTests() {
    insertedIdentityCommitments = []
}
async function insertCommitment(owner, semCliInstance) {


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
        identityNullifier: genRandomSalt(31),
        identityTrapdoor: genRandomSalt(31),
    }
}

const genIdentityCommitment = (
    identity,
) => {

    return pedersenHash([
        // circomlib.babyJub.mulPointEscalar(identity.keypair.pubKey, 8)[0],
        identity.keypair.pubKey[0],
        identity.identityNullifier,
        identity.identityTrapdoor,
    ])
}

const genProof = async (
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
    tree.update(index, identityCommitment)

    const merkleProof = tree.genMerklePath(index)

    const signalHash = keccak256HexToBigInt(ethers.utils.hexlify((signal)))

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
    fs.writeFileSync(path.join(__dirname, '../../data/input.json'), JSON.stringify(input, null, 2))

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

const formatForVerifierContract = (
    proof,
    publicSignals,
) => {
    const stringify = (x) => x.toString()

    return {
        a: [ proof.pi_a[0].toString(), proof.pi_a[1].toString() ],
        b: [ 
            [ proof.pi_b[0][1].toString(), proof.pi_b[0][0].toString() ],
            [ proof.pi_b[1][1].toString(), proof.pi_b[1][0].toString() ],
        ],
        c: [ proof.pi_c[0].toString(), proof.pi_c[1].toString() ],
        input: publicSignals.map(stringify),
    }
}

const genBroadcastSignalParams = (
    signal,
    proof,
    publicSignals,
) => {
    const formatted = formatForVerifierContract(proof, publicSignals)

    return {
        signal: ethers.utils.toUtf8Bytes(signal),
        proof: [
            ...formatted.a,
            ...formatted.b[0],
            ...formatted.b[1],
            ...formatted.c,
        ],
        root: formatted.input[0],
        nullifiersHash: formatted.input[1],
        // The signal hash (formatted.input[2]) isn't passed to broadcastSignal
        // as the contract will generate (and then verify) it
        externalNullifier: formatted.input[3],
    }
}

startScenario()