const Web3 = require('web3')
const web3 = new Web3("http://localhost:8545");
var ethcontract = require('web3-eth-contract');
ethcontract.setProvider("http://localhost:8545")

const catchRevert = require("./exceptions.js").catchRevert
const { expect } = require('chai');
const fs = require('fs');

// err messages
const REVERT = "Returned error: VM Exception while processing transaction: revert ERC20: transfer amount exceeds balance -- Reason given: ERC20: transfer amount exceeds balance."
const NUM_LEVELS = 20

// use truffle contract as opposed to truffle's artifacts.require or truffle test-env's contract.fromArtifacts
const truffleContract = require("@truffle/contract");
var provider = new Web3.providers.HttpProvider("http://localhost:8545");
// build MiMC contract from on-the-fly
var mimcJson = require('../build/MiMC.json')
var mimc = truffleContract({contractName: mimcJson['contractName'], abi: mimcJson['abi'], unlinked_binary: mimcJson['bytecode']})
mimc.setProvider(provider)

// set semaphore and its client using truffle contract
var semJson = require('../build/contracts/Semaphore.json')
var semClientJson = require('../build/contracts/SemaphoreClient.json')
var semaphore = truffleContract({contractName: semJson['contractName'],
                                abi: semJson['abi'],
                                unlinked_binary: semJson['bytecode']})
var semaphoreClient = truffleContract({contractName: semClientJson['contractName'],
                                        abi: semClientJson['abi'],
                                        unlinked_binary: semClientJson['bytecode']})
semaphore.setProvider(provider)
semaphore.defaults({
    gas: 8500000,
    gasPrice: 1000000000
  })
semaphoreClient.setProvider(provider)

// set semaphore and its client using truffle artifacts 
// var semaphore = artifacts.require("Semaphore")
// var semaphoreClient = artifacts.require("SemaphoreClient")



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

const NUM_LEVELS = 20
const FIRST_EXTERNAL_NULLIFIER = 0
const SIGNAL = 'signal0'


let semaphoreContract
let semaphoreClientContract
let mimcContract
let accounts
let owner

// hex representations of all inserted identity commitments
let insertedIdentityCommitments = []

let deployer

contract('Semaphore', function (deployer, network) {
    
    beforeEach(async function () {
        // define the sender of the tx
        accounts = await web3.eth.getAccounts(console.log)
        owner = accounts[0]

        console.log('Deploying MiMC')
        mimcContract = await mimc.new({from: owner} )
        console.log('Deploying Semaphore')
        await semaphore.detectNetwork()
        await semaphore.link('MiMC', mimcContract.address)
        // await semaphore.link(mimcContract)
        semaphoreContract = await semaphore.new(NUM_LEVELS, {from: owner})

        console.log('Deploying Semaphore Client')
        semaphoreClientContract = await semaphoreClient.new(semaphoreContract, {from: owner})

        console.log('Transferring ownership of the Semaphore contract to the Semaphore Client')
        const tx = await semaphoreContract.transferOwnership(
            semaphoreClientContract.contractAddress,
            {from: owner}
        )

        await tx.wait()
    })

    it('Semaphore belongs to the correct owner', async function () {
        const owner = await semaphoreContract.owner()
        expect(owner).toEqual(semaphoreClientContract.contractAddress)
    })

    // test('insert an identity commitment', async () => {
    //     const identity = genIdentity()
    //     const identityCommitment: SnarkBigInt = genIdentityCommitment(identity)

    //     const tx = await semaphoreClientContract.insertIdentityAsClient(
    //         identityCommitment.toString()
    //     )
    //     const receipt = await tx.wait()
    //     expect(receipt.status).toEqual(1)

    //     const numInserted = await semaphoreContract.getNumIdentityCommitments()
    //     expect(numInserted.toString()).toEqual('1')

    //     console.log('Gas used by insertIdentityAsClient():', receipt.gasUsed.toString())

    //     insertedIdentityCommitments.push('0x' + identityCommitment.toString(16))
    //     expect(hasEvent(receipt, semaphoreContract, 'LeafInsertion')).toBeTruthy()
    // })

    // describe('identity insertions', () => {
    //     test('should be stored in the contract and retrievable via leaves()', async () => {
    //         expect.assertions(insertedIdentityCommitments.length + 1)

    //         const leaves = await semaphoreClientContract.getIdentityCommitments()
    //         expect(leaves.length).toEqual(insertedIdentityCommitments.length)

    //         const leavesHex = leaves.map(BigInt)

    //         for (let i = 0; i < insertedIdentityCommitments.length; i++) {
    //             const containsLeaf = leavesHex.indexOf(BigInt(insertedIdentityCommitments[i])) > -1
    //             expect(containsLeaf).toBeTruthy()
    //         }
    //     })

    //     test('should be stored in the contract and retrievable by enumerating leaf()', async () => {
    //         expect.assertions(insertedIdentityCommitments.length)

    //         // Assumes that insertedIdentityCommitments has the same number of
    //         // elements as the number of leaves
    //         const idCommsBigint = insertedIdentityCommitments.map(BigInt)
    //         for (let i = 0; i < insertedIdentityCommitments.length; i++) {
    //             const leaf = await semaphoreClientContract.getIdentityCommitment(i)
    //             const leafHex = BigInt(leaf.toHexString())
    //             expect(idCommsBigint.indexOf(leafHex) > -1).toBeTruthy()
    //         }
    //     })

    //     test('inserting an identity commitment of the nothing-up-my-sleeve value should fail', async () => {
    //         expect.assertions(1)
    //         const nothingUpMySleeve = 
    //             BigInt(ethers.utils.solidityKeccak256(['bytes'], [ethers.utils.toUtf8Bytes('Semaphore')]))
    //             %
    //             BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')

    //         try {
    //             await semaphoreClientContract.insertIdentityAsClient(nothingUpMySleeve.toString())
    //         } catch (e) {
    //             expect(e.message.endsWith('Semaphore: identity commitment cannot be the nothing-up-my-sleeve-value')).toBeTruthy()
    //         }
    //     })

    // })

    // describe('external nullifiers', () => {

    //     test('when there is only 1 external nullifier, the first and last external nullifier variables should be the same', async () => {
    //         expect((await semaphoreContract.numExternalNullifiers()).toNumber()).toEqual(1)
    //         const firstEn = await semaphoreContract.firstExternalNullifier()
    //         const lastEn = await semaphoreContract.lastExternalNullifier()
    //         expect(firstEn.toString()).toEqual(lastEn.toString())
    //     })

    //     test('getNextExternalNullifier should throw if there is only 1 external nullifier', async () => {
    //         expect((await semaphoreContract.numExternalNullifiers()).toNumber()).toEqual(1)
    //         const firstEn = await semaphoreContract.firstExternalNullifier()
    //         try {
    //             await semaphoreContract.getNextExternalNullifier(firstEn)
    //         } catch (e) {
    //             expect(e.message.endsWith('Semaphore: no external nullifier exists after the specified one')).toBeTruthy()
    //         }
    //     })

    //     test('should be able to add an external nullifier', async () => {
    //         expect.assertions(4)
    //         const tx = await semaphoreClientContract.addExternalNullifier(
    //             activeEn,
    //             { gasLimit: 200000 },
    //         )
    //         const receipt = await tx.wait()

    //         expect(receipt.status).toEqual(1)
    //         expect(hasEvent(receipt, semaphoreContract, 'ExternalNullifierAdd')).toBeTruthy()

    //         // Check if isExternalNullifierActive works
    //         const isActive = await semaphoreContract.isExternalNullifierActive(activeEn)
    //         expect(isActive).toBeTruthy()

    //         // Check if numExternalNullifiers() returns the correct value
    //         expect((await semaphoreContract.numExternalNullifiers()).toNumber()).toEqual(2)
    //     })

    //     test('getNextExternalNullifier should throw if there is no such external nullifier', async () => {
    //         try {
    //             await semaphoreContract.getNextExternalNullifier('876876876876')
    //         } catch (e) {
    //             expect(e.message.endsWith('Semaphore: no such external nullifier')).toBeTruthy()
    //         }
    //     })

    //     test('should be able to deactivate an external nullifier', async () => {
    //         await (await semaphoreClientContract.addExternalNullifier(
    //             inactiveEn,
    //             { gasLimit: 200000 },
    //         )).wait()
    //         const tx = await semaphoreClientContract.deactivateExternalNullifier(
    //             inactiveEn,
    //             { gasLimit: 100000 },
    //         )
    //         const receipt = await tx.wait()
    //         expect(receipt.status).toEqual(1)

    //         expect(await semaphoreContract.isExternalNullifierActive(inactiveEn)).toBeFalsy()
    //     })

    //     test('reactivating a deactivated external nullifier and then deactivating it should work', async () => {
    //         expect.assertions(3)

    //         // inactiveEn should be inactive
    //         expect(await semaphoreContract.isExternalNullifierActive(inactiveEn)).toBeFalsy()

    //         // reactivate inactiveEn
    //         let tx = await semaphoreClientContract.reactivateExternalNullifier(
    //             inactiveEn,
    //             { gasLimit: 100000 },
    //         ) 
    //         await tx.wait()

    //         expect(await semaphoreContract.isExternalNullifierActive(inactiveEn)).toBeTruthy()

    //         tx = await semaphoreClientContract.deactivateExternalNullifier(
    //             inactiveEn,
    //             { gasLimit: 100000 },
    //         )
    //         await tx.wait()

    //         expect(await semaphoreContract.isExternalNullifierActive(inactiveEn)).toBeFalsy()
    //     })

    //     test('enumerating external nullifiers should work', async () => {
    //         const firstEn = await semaphoreContract.firstExternalNullifier()
    //         const lastEn = await semaphoreContract.lastExternalNullifier()

    //         const externalNullifiers: BigInt[] = [ firstEn ]
    //         let currentEn = firstEn

    //         while (currentEn.toString() !== lastEn.toString()) {
    //             currentEn = await semaphoreContract.getNextExternalNullifier(currentEn)
    //             externalNullifiers.push(currentEn)
    //         }

    //         expect(externalNullifiers).toHaveLength(3)
    //         expect(BigInt(externalNullifiers[0].toString())).toEqual(BigInt(firstEn.toString()))
    //         expect(BigInt(externalNullifiers[1].toString())).toEqual(BigInt(activeEn.toString()))
    //         expect(BigInt(externalNullifiers[2].toString())).toEqual(BigInt(inactiveEn.toString()))
    //     })
    // })

    // describe('signal broadcasts', () => {
    //     // Load circuit, proving key, and verifying key
    //     const circuitPath = path.join(__dirname, '../../../circuits/build/circuit.json')
    //     const provingKeyPath = path.join(__dirname, '../../../circuits/build/proving_key.bin')
    //     const verifyingKeyPath = path.join(__dirname, '../../../circuits/build/verification_key.json')

    //     const cirDef = JSON.parse(fs.readFileSync(circuitPath).toString())
    //     const provingKey: SnarkProvingKey = fs.readFileSync(provingKeyPath)
    //     const verifyingKey: SnarkVerifyingKey = parseVerifyingKeyJson(fs.readFileSync(verifyingKeyPath).toString())
    //     const circuit = genCircuit(cirDef)
    //     let identity
    //     let identityCommitment
    //     let proof
    //     let publicSignals
    //     let params

    //     beforeAll(async () => {
    //         identity = genIdentity()
    //         identityCommitment = genIdentityCommitment(identity)

    //         await (await semaphoreClientContract.insertIdentityAsClient(identityCommitment.toString())).wait()

    //         const leaves = await semaphoreClientContract.getIdentityCommitments()

    //         const result = await genWitness(
    //             SIGNAL,
    //             circuit,
    //             identity,
    //             leaves,
    //             NUM_LEVELS,
    //             FIRST_EXTERNAL_NULLIFIER,
    //         )

    //         proof = await genProof(result.witness, provingKey)
    //         publicSignals = genPublicSignals(result.witness, circuit)
    //         params = genBroadcastSignalParams(result, proof, publicSignals)
    //     })

    //     test('the proof should be valid', async () => {
    //         expect.assertions(1)
    //         const isValid = verifyProof(verifyingKey, proof, publicSignals)
    //         expect(isValid).toBeTruthy()
    //     })

    //     test('the pre-broadcast check should pass', async () => {
    //         expect.assertions(1)

    //         const signal = ethers.utils.toUtf8Bytes(SIGNAL)
    //         const check = await semaphoreContract.preBroadcastCheck(
    //             signal,
    //             params.proof,
    //             params.root,
    //             params.nullifiersHash,
    //             genSignalHash(signal).toString(),
    //             FIRST_EXTERNAL_NULLIFIER,
    //         )
    //         expect(check).toBeTruthy()
    //     })

    //     test('the pre-broadcast check with an invalid signal should fail', async () => {
    //         expect.assertions(1)

    //         const signal = ethers.utils.toUtf8Bytes(SIGNAL)
    //         const check = await semaphoreContract.preBroadcastCheck(
    //             '0x0',
    //             params.proof,
    //             params.root,
    //             params.nullifiersHash,
    //             genSignalHash(signal).toString(),
    //             FIRST_EXTERNAL_NULLIFIER,
    //         )
    //         expect(check).toBeFalsy()
    //     })

    //     test('broadcastSignal with an input element above the scalar field should fail', async () => {
    //         expect.assertions(1)
    //         const size = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')
    //         const oversizedInput = (BigInt(params.nullifiersHash) + size).toString()
    //         try {
    //             await semaphoreClientContract.broadcastSignal(
    //                 ethers.utils.toUtf8Bytes(SIGNAL),
    //                 params.proof,
    //                 params.root,
    //                 oversizedInput,
    //                 FIRST_EXTERNAL_NULLIFIER,
    //             )
    //         } catch (e) {
    //             expect(e.message.endsWith('Semaphore: the nullifiers hash must be lt the snark scalar field')).toBeTruthy()
    //         }
    //     })

    //     test('broadcastSignal with an invalid proof_data should fail', async () => {
    //         expect.assertions(1)
    //         try {
    //             await semaphoreClientContract.broadcastSignal(
    //                 ethers.utils.toUtf8Bytes(SIGNAL),
    //                 [
    //                     "21888242871839275222246405745257275088548364400416034343698204186575808495617",
    //                     "7",
    //                     "7",
    //                     "7",
    //                     "7",
    //                     "7",
    //                     "7",
    //                     "7",
    //                 ],
    //                 params.root,
    //                 params.nullifiersHash,
    //                 FIRST_EXTERNAL_NULLIFIER,
    //             )
    //         } catch (e) {
    //             expect(e.message.endsWith('Semaphore: invalid field element(s) in proof')).toBeTruthy()
    //         }
    //     })

    //     test('broadcastSignal with an unseen root should fail', async () => {
    //         expect.assertions(1)
    //         try {
    //             await semaphoreClientContract.broadcastSignal(
    //                 ethers.utils.toUtf8Bytes(SIGNAL),
    //                 params.proof,
    //                 params.nullifiersHash, // note that this is delibrately swapped
    //                 params.root,
    //                 FIRST_EXTERNAL_NULLIFIER,
    //             )
    //         } catch (e) {
    //             expect(e.message.endsWith('Semaphore: root not seen')).toBeTruthy()
    //         }
    //     })

    //     test('broadcastSignal by an unpermissioned user should fail', async () => {
    //         expect.assertions(1)
    //         try {
    //             await semaphoreContract.broadcastSignal(
    //                 ethers.utils.toUtf8Bytes(SIGNAL),
    //                 params.proof,
    //                 params.root,
    //                 params.nullifiersHash,
    //                 FIRST_EXTERNAL_NULLIFIER,
    //             )
    //         } catch (e) {
    //             expect(e.message.endsWith('Semaphore: broadcast permission denied')).toBeTruthy()
    //         }
    //     })

    //     test('broadcastSignal to active external nullifier with an account with the right permissions should work', async () => {
    //         expect.assertions(3)
    //         const tx = await semaphoreClientContract.broadcastSignal(
    //             ethers.utils.toUtf8Bytes(SIGNAL),
    //             params.proof,
    //             params.root,
    //             params.nullifiersHash,
    //             FIRST_EXTERNAL_NULLIFIER,
    //             //params.externalNullifier,
    //             { gasLimit: 1000000 },
    //         )
    //         const receipt = await tx.wait()
    //         expect(receipt.status).toEqual(1)
    //         console.log('Gas used by broadcastSignal():', receipt.gasUsed.toString())

    //         const index = (await semaphoreClientContract.nextSignalIndex()) - 1
    //         const signal = await semaphoreClientContract.signalIndexToSignal(index.toString())

    //         expect(ethers.utils.toUtf8String(signal)).toEqual(SIGNAL)

    //         expect(hasEvent(receipt, semaphoreClientContract, 'SignalBroadcastByClient')).toBeTruthy()
    //     })

    //     test('double-signalling to the same external nullifier should fail', async () => {
    //         expect.assertions(1)
    //         const leaves = await semaphoreClientContract.getIdentityCommitments()
    //         const newSignal = 'newSignal0'

    //         const result = await genWitness(
    //             newSignal,
    //             circuit,
    //             identity,
    //             leaves,
    //             NUM_LEVELS,
    //             FIRST_EXTERNAL_NULLIFIER,
    //         )

    //         proof = await genProof(result.witness, provingKey)
    //         publicSignals = genPublicSignals(result.witness, circuit)
    //         params = genBroadcastSignalParams(result, proof, publicSignals)
    //         try {
    //             const tx = await semaphoreClientContract.broadcastSignal(
    //                 ethers.utils.toUtf8Bytes(newSignal),
    //                 params.proof,
    //                 params.root,
    //                 params.nullifiersHash,
    //                 FIRST_EXTERNAL_NULLIFIER,
    //             )
    //         } catch (e) {
    //             expect(e.message.endsWith('Semaphore: nullifier already seen')).toBeTruthy()
    //         }
    //     })

    //     test('signalling to a different external nullifier should work', async () => {
    //         expect.assertions(1)
    //         const leaves = await semaphoreClientContract.getIdentityCommitments()
    //         const newSignal = 'newSignal1'

    //         const result = await genWitness(
    //             newSignal,
    //             circuit,
    //             identity,
    //             leaves,
    //             NUM_LEVELS,
    //             activeEn,
    //         )

    //         proof = await genProof(result.witness, provingKey)
    //         publicSignals = genPublicSignals(result.witness, circuit)
    //         params = genBroadcastSignalParams(result, proof, publicSignals)
    //         const tx = await semaphoreClientContract.broadcastSignal(
    //             ethers.utils.toUtf8Bytes(newSignal),
    //             params.proof,
    //             params.root,
    //             params.nullifiersHash,
    //             activeEn,
    //             { gasLimit: 1000000 },
    //         )
    //         const receipt = await tx.wait()
    //         expect(receipt.status).toEqual(1)
    //     })

    //     test('broadcastSignal to a deactivated external nullifier should fail', async () => {
    //         expect.assertions(2)
    //         expect(await semaphoreContract.isExternalNullifierActive(inactiveEn)).toBeFalsy()

    //         identity = genIdentity()
    //         identityCommitment = genIdentityCommitment(identity)

    //         await (await semaphoreClientContract.insertIdentityAsClient(identityCommitment.toString())).wait()

    //         const leaves = await semaphoreClientContract.getIdentityCommitments()

    //         const result = await genWitness(
    //             SIGNAL,
    //             circuit,
    //             identity,
    //             leaves,
    //             NUM_LEVELS,
    //             inactiveEn,
    //         )

    //         proof = await genProof(result.witness, provingKey)
    //         publicSignals = genPublicSignals(result.witness, circuit)
    //         params = genBroadcastSignalParams(result, proof, publicSignals)

    //         try {
    //             const tx = await semaphoreClientContract.broadcastSignal(
    //                 ethers.utils.toUtf8Bytes(SIGNAL),
    //                 params.proof,
    //                 params.root,
    //                 params.nullifiersHash,
    //                 inactiveEn,
    //             )
    //         } catch (e) {
    //             expect(e.message.endsWith('Semaphore: external nullifier not found')).toBeTruthy()
    //         }
    //     })

    //     test('setPermissioning(false) should allow anyone to broadcast a signal', async () => {
    //         expect.assertions(2)
    //         const leaves = await semaphoreClientContract.getIdentityCommitments()
    //         const newSignal = 'newSignal2'

    //         const result = await genWitness(
    //             newSignal,
    //             circuit,
    //             identity,
    //             leaves,
    //             NUM_LEVELS,
    //             activeEn,
    //         )

    //         proof = await genProof(result.witness, provingKey)
    //         publicSignals = genPublicSignals(result.witness, circuit)
    //         params = genBroadcastSignalParams(result, proof, publicSignals)
    //         try {
    //             await semaphoreContract.broadcastSignal(
    //                 ethers.utils.toUtf8Bytes(newSignal),
    //                 params.proof,
    //                 params.root,
    //                 params.nullifiersHash,
    //                 activeEn,
    //                 { gasLimit: 1000000 },
    //             )
    //         } catch (e) {
    //             expect(e.message.endsWith('Semaphore: broadcast permission denied')).toBeTruthy()
    //         }

    //         await (await semaphoreClientContract.setPermissioning(false, { gasLimit: 100000 })).wait()

    //         const tx = await semaphoreClientContract.broadcastSignal(
    //             ethers.utils.toUtf8Bytes(newSignal),
    //             params.proof,
    //             params.root,
    //             params.nullifiersHash,
    //             activeEn,
    //             { gasLimit: 1000000 },
    //         )
    //         const receipt = await tx.wait()
    //         expect(receipt.status).toEqual(1)
    //     })

    // })
})

