// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2021, M. Baghani (mahmoud.baghani@outlook.com)

const Web3 = require('web3')
const web3 = new Web3("ws://localhost:8545");


const catchRevert = require("../test/exceptions").catchRevert
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
} = require('../../client/node_modules/maci-crypto/build')

const { utils, Scalar } = require('../../client/node_modules/ffjavascript');
const {
    // stringifyBigInts,
    // unstringifyBigInts,
    beBuff2int,
    beInt2Buff,
    leBuff2int,
    leInt2Buff,
} = utils;

const circomlib= require('circomlib')
const poseidonHasher = circomlib.poseidon

const path = require('path')
const ethers = require('ethers')
const snarkjs = require('snarkjs')

const TREE_DEPTH = 6
const FIRST_EXTERNAL_NULLIFIER = 0
const SIGNAL = 'signal0'
const votes = [0n, 1n, 2n, 3n]

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
const lighthouse_circuit_path = path.join(__dirname, '../../circuits/build/lighthouse.wasm')
const lighthouse_zkey_final = path.join(__dirname, '../../circuits/build/lighthouse_final.zkey')
const verifyingKeyPath = path.join(__dirname, '../../circuits/build/verification_key.json')

const MAX_VOTES = 40;
let voteCount = 0;
const currentEthGasPrice = 123;  // 123GWei according to https://ethgasstation.info/ as of September 2021
const currentEthPrice = 3300; // dollars
let txGas = 0;
let deployGas = 0;
let contractGas = 0;

let votingPrivKey;
let votingPubKey;
const initiatorEthSk = "0x2bc4341e0add33ceb264f774c9de2bfcce14cf97ac2df479b54f23bd751808d6";
let regPrivKey;
let regPubkey;

async function initScenario() {
    // PHASE 01 Voting Authorities: Initialization
    votingPrivKey = genPrivKey()
    votingPubKey = genPubKey(votingPrivKey)
    // define the sender of the tx in
    accounts = await web3.eth.getAccounts()
    owner = web3.eth.accounts.privateKeyToAccount(initiatorEthSk);
    
    // registrar init
    var pair = genKeypair();
    regPrivKey = pair.privKey
    regPubkey = pair.pubKey

}
const doScenario = async function(semaphoreInstance) {
    // PHASE 01 VOTER: CREATING IDENTITY
    const identity = genIdentity();
    const identityCommitment = genIdentityCommitment(identity);
    

    // PHASE 02 REGISTRATION
    // the registrar signs the commitment
    const { signature, msg } = genEdDSA(
        regPrivKey,
        identityCommitment,
    )
    // the voter (or someone on ü's behalf) register the voter's identity commitment
    var regTx = semaphoreInstance.methods.registerVoter(
        stringifyBigInts(identityCommitment),
        [stringifyBigInts(regPubkey[0]), stringifyBigInts(regPubkey[1])],
        [stringifyBigInts(signature.R8[0]), stringifyBigInts(signature.R8[1])],
        stringifyBigInts(signature.S)
    )
    var regVoterReceipt = await send(web3, owner, regTx);
    console.log("spent gas for registration ", regVoterReceipt.gasUsed)
    txGas += regVoterReceipt.gasUsed
    console.log("registered voter ", regVoterReceipt.status);
    insertedIdentityCommitments.push(identityCommitment)


    // PHASE 03 VOTING

    // voter creates an ephemeral key pair
    var ephemeralPair = genKeypair();
    console.log("selected ephemeral key ", ephemeralPair.pubKey)

    // voter computes the shared key
    const sharedKey = genEcdhSharedKey(ephemeralPair.privKey, votingPubKey)
    console.log("shared key from voter perspective ", sharedKey)

    // voter creates a vote, but it's a test-vote as of now
    var vote = votes[Math.floor(Math.random()*votes.length)];
    console.log("voter's selected vote ", vote.toString())
    var plaintext = []
    for (let i = 0; i < 1; i++) {
        plaintext.push(BigInt(vote))
    }
    // voter encrypts his voice with the shared key
    var encVote = encrypt(plaintext, sharedKey)
    
    // this fixes the `param.substring() is not a function` bug
    // in ABICoder.prototype.formatParam in web3.eth.abi
    var sig = ethers.utils.toUtf8Bytes(encVote.toString())
    var sigbyte = []
    if (sig.length % 2 != 0) {
        sigbyte.push(0)
    }
    for (let i = 0; i < sig.length; i++) {
        sigbyte.push(sig[i]);
    }
    
    // getting all the commitments on chain, to create a zk-proof of membership
    semaphoreInstance.methods.getIdentityCommitments().call({ from: accounts[0] }, async function(err, leaves){
        console.log("generating proof")
        proof_res = await genLighthouseProof(
            sigbyte,
            lighthouse_circuit_path,
            identity,
            leaves,
            TREE_DEPTH,
            FIRST_EXTERNAL_NULLIFIER,
        )
        console.log("root: ", proof_res.merkleProof.root)
        console.log("public signals ", proof_res.publicSignals)
        console.log("generating proof and public signals")
        
        vKey = parseVerifyingKeyJson(fs.readFileSync(verifyingKeyPath).toString())
        const res = await snarkjs.groth16.verify(vKey, proof_res.publicSignals, proof_res.proof);
        console.log("proof validity: ", res)

        // sending the vote transaction
        console.log("send the vote tx")

        // voter (or someone on ü's behalf) sends the vote tx
        var params = genBroadcastSignalParams(SIGNAL, proof_res.proof, proof_res.publicSignals)
        var tx = semaphoreInstance.methods.vote(
            ephemeralPair.pubKey,
            encVote,
            sigbyte, 
            params.proof,
            params.root,
            params.nullifiersHash,
            params.externalNullifier
        )
        var receipt = await send(web3, owner, tx)
        console.log("spent gas for voting ", receipt.gasUsed)
        txGas += receipt.gasUsed
        console.log("voted ", receipt.status)

        voteCount++
        if (voteCount < MAX_VOTES)
        {
            doScenario(semaphoreInstance)
        }
        else
        {
            // the scenario is finished
            console.log("Total lib deployment gas: ", deployGas)
            console.log("Total contract deployment gas: ", contractGas)
            console.log("Total gas spent: ", txGas)
            console.log("Total price of tx: ", txGas * currentEthGasPrice / 1000000000 , "eth")
            doTally(semaphoreInstance)
        }
    });
}

const doTally = async function(semaphoreInstance) {
    semaphoreInstance.methods.getBallots().call({ from: accounts[0] }, async function(err, ballots){
        console.time('tally')
        for (let i = 0; i < ballots.length; i++) {
            const ballot = ballots[i];
            const key = ballot.pubKey
            console.log("voter ephemeral key ", key)
            const encVote = ballot.encVote
            const sharedKey = genEcdhSharedKey(votingPrivKey, [unstringifyBigInts(key[0]), unstringifyBigInts(key[1])])
            console.log("shared key from tally PoV ", sharedKey)
            var vote = decrypt(encVote, sharedKey)
            console.log("decrypted vote ", vote.toString())
        }
        console.timeEnd('tally')
    });
}

async function send(web3, account, transaction) {
    while (true) {
        try {
            const options = {
                data: transaction.encodeABI(),
                to: transaction._parent._address,
                // gas: await transaction.estimateGas({ from: account.address }),
                gas: 2100000,
                gasPrice: currentEthGasPrice * 1000000000,
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
    } = await require('./deploy_lighthouse_web3')
    await startDeployment(function() {
        deploySemaphore(async function(semaphoreInstance) {
            await initScenario()
            doScenario(semaphoreInstance)
        }, function(gasUsed) {
            console.log("contract gas used: ", gasUsed)
            contractGas += gasUsed
        })
    }, function(gasUsed) {
        console.log("library used gas: ", gasUsed)
        deployGas += gasUsed
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

    const hasher = poseidonHasher
    return hasher([
        circomlib.babyJub.mulPointEscalar(identity.keypair.pubKey, 8)[0],
        identity.identityNullifier,
        identity.identityTrapdoor,
    ])
}

const genLighthouseProof = async (
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
        idCommitmentsAsBigInts.push(idc.toString())
    }

    const identityCommitment = genIdentityCommitment(identity)
    const index = idCommitmentsAsBigInts.indexOf(stringifyBigInts(identityCommitment))

    const tree = new IncrementalQuinTree(treeDepth, NOTHING_UP_MY_SLEEVE, 2)

    for (let ic of idCommitments) {
        tree.insert(unstringifyBigInts(ic))
    }
    tree.update(index, identityCommitment)

    const merkleProof = tree.genMerklePath(index)

    const signalHash = keccak256HexToBigInt(ethers.utils.hexlify((signal)))

    const { signature, msg } = genEdDSAPoseidon(
        identity.keypair.privKey,
        externalNullifier,
        signalHash, 
    )
    console.time('groth16 proof time')
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
    console.timeEnd('groth16 proof time')
    
    // shell.env['NODE_OPTIONS'] = '--max-old-space-size=16384'
    // shell.exec(`node --max-old-space-size=16384 --stack-size=1073741 ../node_modules/snarkjs/cli.js groth16 fullprove ../data/input.json ../../circuits/build/lighthouse.wasm lighthouse_final.zkey ../data/proof.json ../data/public.json`)
   
    return {
        signal,
        signalHash,
        tree,
        merkleProof, 
        proof, 
        publicSignals
    }
}

const genEddsaProof = async (
    identityCommitment,
    signerPubkey,
    signature,
    circuit_path,
    zkey_final
) => {

    const {proof, publicSignals} = await snarkjs.groth16.fullProve({
        signer_pk: signerPubkey,
        identity_commitment: identityCommitment,
        auth_sig_r: signature.R8,
        auth_sig_s: signature.S,
    }, circuit_path, zkey_final);

    return {
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

    return BigInt(p[0])
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

const genEdDSAPoseidon = (
    privKey,
    lhs,
    rhs,
) => {
    const hasher = poseidonHasher
    const msg = hasher([
        lhs,
        rhs,
    ])

    return {
        msg,
        signature: sign(privKey, msg),
    }
}

const genEdDSA = (
    privKey,
    msg,
) => {

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

const genRegisterVoterParams = (
    proof,
    publicSignals,
) => {
    return formatForVerifierContract(proof, publicSignals)
    // const formatted = formatForVerifierContract(proof, publicSignals)
    // return {
    //     proof: [
    //         formatted.a,
    //         formatted.b[0],
    //         formatted.b[1],
    //         formatted.c,
    //     ],
    //     signerPubkey: formatted.input[0],
    //     identityCommitment: formatted.input[2]
    // }

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


function test() {
    // params of baby jubjub
    const order = Scalar.fromString("21888242871839275222246405745257275088614511777268538073601725287587578984328");
    const subOrder = Scalar.shiftRight(order, 3);
    const superorder = Scalar.shiftLeft(order, 3);
    console.log(stringifyBigInts(order))
    console.log(stringifyBigInts(subOrder))
    console.log(stringifyBigInts(superorder))
}

startScenario()
// test()