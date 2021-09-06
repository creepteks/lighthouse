const snarkjs = require('snarkjs')
const circomlib= require('circomlib')
const crypto = require('crypto')
const ethers = require('ethers')
const { convertWitness, prove } = require('./utils.js') 
const { storage, hashers, tree } = require('semaphore-merkle-tree')
const MemStorage = storage.MemStorage
const MerkleTree = tree.MerkleTree
const PoseidonHasher = hashers.PoseidonHasher
const poseidon = circomlib.poseidon
const biginteger = require('../node_modules/big-integer')
const shell = require('shelljs')
const fs = require('fs')
const path = require('path')
const { utils } = require('../node_modules/ffjavascript');
const {
    stringifyBigInts,
    unstringifyBigInts,
    beBuff2int,
    beInt2Buff,
    leBuff2int,
    leInt2Buff,
} = utils;

const wtns = {type: "mem"};
// let proof;
// let publicSignals;

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

const genRandomBuffer = (numBytes = 32) => {
    return crypto.randomBytes(numBytes)
}

const genPubKey = (privKey) => {
    const pubKey = circomlib.eddsa.prv2pub(privKey)

    return pubKey
}

const genEddsaKeyPair = (
    privKey = genRandomBuffer(),
) => {

    const pubKey = genPubKey(privKey)
    return { pubKey, privKey }
}

const genIdentity = (
    privKey = genRandomBuffer(32),
) => {

    // The identity nullifier and identity trapdoor are separate random 31-byte
    // values
    return {
        keypair: genEddsaKeyPair(privKey),
        identityNullifier: leBuff2int(genRandomBuffer(31)),
        identityTrapdoor: leBuff2int(genRandomBuffer(31)),
    }
}

const serializeIdentity = (
    identity,
) => {
    const data = [
        identity.keypair.privKey.toString('hex'),
        identity.identityNullifier.toString(16),
        identity.identityTrapdoor.toString(16),
    ]
    return JSON.stringify(data)
}

const unSerializeIdentity = (
    serialisedIdentity,
) => {
    const data = JSON.parse(serialisedIdentity)
    return {
        keypair: genEddsaKeyPair(Buffer.from(data[0], 'hex')),
        identityNullifier: biginteger('0x' + data[1]),
        identityTrapdoor: biginteger('0x' + data[2]),
    }
}

const serialiseIdentity = serializeIdentity
const unSerialiseIdentity = unSerializeIdentity

const genIdentityCommitment = (
    identity,
) => {

    return pedersenHash([
        circomlib.babyJub.mulPointEscalar(identity.keypair.pubKey, 8)[0],
        identity.identityNullifier,
        identity.identityTrapdoor,
    ])
}

const signMsg = (
    privKey,
    msg,
) => {

    return circomlib.eddsa.signPoseidon(privKey, msg)
}

const genSignedMsg = (
    privKey,
    externalNullifier,
    signalHash,
) => {
    const hasher = poseidon
    const msg = hasher([
        externalNullifier,
        signalHash,
    ])

    return {
        msg,
        signature: signMsg(privKey, msg),
    }
}

const genPathElementsAndIndex = async (tree, identityCommitment) => {
    const leafIndex = await tree.element_index(stringifyBigInts(identityCommitment))
    const identityPath = await tree.path(leafIndex)
    const identityPathElements = identityPath.path_elements
    const identityPathIndex = identityPath.path_index

    return { identityPathElements, identityPathIndex }
}

const verifySignature = (
    msg,
    signature,
    pubKey,
) => {

    return circomlib.eddsa.verifyPoseidon(msg, signature, pubKey)
}

const genTree = async (
    treeDepth,
    leaves,
) => {

    const tree = setupTree(treeDepth)

    for (let i=0; i<leaves.length; i++) {
        await tree.update(i, leaves[i].toString())
    }

    return tree
}

const genMixerSignal = (
    recipientAddress,
    forwarderAddress,
    feeAmt,
) => {
    return ethers.utils.solidityKeccak256(
        ['address', 'address', 'uint256'],
        [recipientAddress, forwarderAddress, feeAmt.toString()],
    )
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

const genSignalHash = (x) => keccak256HexToBigInt(ethers.utils.hexlify(x))

const genCircuit = (circuitDefinition) => {
    return new snarkjs.Circuit(circuitDefinition)
}

const genWitness = (
    signal,
    circuit,
    identity,
    idCommitments,
    treeDepth,
    externalNullifier,
) => {

    return _genWitness(
        signal,
        circuit,
        identity,
        idCommitments,
        treeDepth,
        externalNullifier,
        (signal) => {
            return ethers.utils.hexlify(
                ethers.utils.toUtf8Bytes(signal),
            )
        },
    )
}

const genMixerWitness = (
    circuit,
    identity,
    idCommitment,
    treeDepth,
    recipientAddress,
    forwarderAddress,
    feeAmt,
    externalNullifier,
) => {

    const signal = genMixerSignal(
        recipientAddress, forwarderAddress, feeAmt,
    )

    return _genWitness(
        signal,
        circuit,
        identity,
        idCommitments,
        treeDepth,
        externalNullifier,
        (x) => x,
    )
}

const _genWitness = async (
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
    const tree = await genTree(treeDepth, idCommitments)

    const identityPath = await tree.path(index)

    const { identityPathElements, identityPathIndex } = await genPathElementsAndIndex(
        tree,
        identityCommitment,
    )

    const signalHash = keccak256HexToBigInt(transformSignalToHex(signal))

    const { signature, msg } = genSignedMsg(
        identity.keypair.privKey,
        externalNullifier,
        signalHash, 
    )
    // var input = {
    //     identity_pk: stringifyBigInts(identity.keypair.pubKey),
    //     auth_sig_r: stringifyBigInts(signature.R8),
    //     auth_sig_s: stringifyBigInts(signature.S),
    //     signal_hash: stringifyBigInts(signalHash),
    //     external_nullifier: stringifyBigInts(externalNullifier),
    //     identity_nullifier: stringifyBigInts(identity.identityNullifier),
    //     identity_trapdoor: stringifyBigInts(identity.identityTrapdoor),
    //     identity_path_elements: identityPathElements,
    //     identity_path_index: identityPathIndex,
    //     fake_zero: stringifyBigInts(biginteger(0)),
    // }
    // fs.writeFileSync(path.join(__dirname, '../data/input.json'), JSON.stringify(input, null, 2))
    await snarkjs.wtns.calculate({
        identity_pk: identity.keypair.pubKey,
        // 'identity_pk[1]': identity.keypair.pubKey[1],zzz
        auth_sig_r: signature.R8,
        // 'auth_sig_r[1]': signature.R8[1],
        auth_sig_s: signature.S,
        signal_hash: signalHash,
        external_nullifier: externalNullifier,
        identity_nullifier: identity.identityNullifier,
        identity_trapdoor: identity.identityTrapdoor,
        identity_path_elements: identityPathElements,
        identity_path_index: identityPathIndex,
        // fake_zero: biginteger(0),
    }, circuit, wtns);

    // shell.env['NODE_OPTIONS'] = '--max-old-space-size=16384'
    // shell.exec(`node --max-old-space-size=16384 --stack-size=1073741 ../node_modules/snarkjs/cli.js groth16 fullprove ../data/input.json ../../circuits/build/lighthouse.wasm ../../circuits/build/lighthouse_final.zkey ../data/proof.json ../data/public.json`)
   
    return {
        wtns,
        signal,
        signalHash,
        signature,
        msg,
        tree,
        identityPath,
        identityPathIndex,
        identityPathElements,
    }
}

const setupTree = (
    levels,
    prefix = 'semaphore',
) => {
    const storage = new MemStorage()
    const hasher = new PoseidonHasher()

    return new MerkleTree(
        prefix,
        storage,
        hasher,
        levels,
        ethers.utils.solidityKeccak256(['bytes'], [ethers.utils.toUtf8Bytes('Semaphore')]),
    )
}

const genProof = async (
    witness,
    final_zkey,
) => {

    const res = await snarkjs.groth16.prove(final_zkey, witness);
    // proof = res.proof;
    // publicSignals = res.publicSignals;

    return { res /*, proof, publicSignals */}

    // const witnessBin = convertWitness(snarkjs.stringifyBigInts(witness))
    // return await prove(witnessBin.buffer, provingKey.buffer)
}

const genPublicSignals = (
    witness,
    circuit,
) => {

    return witness.slice(1, circuit.nPubInputs + circuit.nOutputs+1)
}

const parseVerifyingKeyJson = (
    verifyingKeyStr,
) => {
    return unstringifyBigInts(JSON.parse(verifyingKeyStr))
}

const verifyProof = (
    verifyingKey,
    proof,
    publicSignals
) => {

    return snarkjs.groth.isValid(verifyingKey, proof, publicSignals)
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

const cutOrExpandHexToBytes = (hexStr, bytes) => {
    const len = bytes * 2

    const h = hexStr.slice(2, len + 2)
    return '0x' + h.padStart(len, '0')
}

/*
 * Each external nullifier must be at most 29 bytes large. This function
 * keccak-256-hashes a given `plaintext`, takes the last 29 bytes, and pads it
 * (from the start) with 0s, and returns the resulting hex string.
 * @param plaintext The plaintext to hash
 * @return plaintext The 0-padded 29-byte external nullifier
 */
const genExternalNullifier = (plaintext) => {
    const hashed = ethers.utils.solidityKeccak256(['string'], [plaintext])
    return cutOrExpandHexToBytes(
        '0x' + hashed.slice(8),
        32,
    )
}

const genBroadcastSignalParams = (
    witnessData,
    proof,
    publicSignals,
) => {
    const formatted = formatForVerifierContract(proof, publicSignals)

    return {
        signal: ethers.utils.toUtf8Bytes(witnessData.signal),
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

module.exports = function() {
    return {
        parseVerifyingKeyJson,
        setupTree,
        genPubKey,
        genIdentity,
        genWitness,
        genMixerSignal,
        genMixerWitness,
        genProof,
        genPublicSignals,
        genSignedMsg,
        genCircuit,
        genTree,
        verifyProof,
        verifySignature,
        signMsg,
        genIdentityCommitment,
        formatForVerifierContract,
        stringifyBigInts,
        unstringifyBigInts,
        serialiseIdentity,
        unSerialiseIdentity,
        genExternalNullifier,
        genBroadcastSignalParams,
        genSignalHash,
    }
}();