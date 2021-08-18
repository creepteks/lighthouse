const Web3 = require('web3')
const web3 = new Web3("http://localhost:8545");
// var ethcontract = require('web3-eth-contract');
// ethcontract.setProvider("http://localhost:8545")


const catchRevert = require("./exceptions.js").catchRevert
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
var semaphore = artifacts.require("Semaphore")
var semaphoreClient = artifacts.require("SemaphoreClient")



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


let semaphoreContract
let semaphoreClientContract
let mimcContract
let accounts
let owner

// hex representations of all inserted identity commitments
let insertedIdentityCommitments = []

contract('Semaphore', function (deployer, network) {
    
    beforeEach(async function () {
        clearPreviousTests()

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
    })

    // it('Semaphore belongs to the correct owner', async function () {
    //     const owner = await semaphoreContract.owner()
    //     expect(owner).equal(semaphoreClientContract.address)
    // })

    // it('insert an identity commitment', async () => {
    //     var owner = accounts[0]
    //     const { tx } = await insertCommitment(owner);
    //     console.log(tx)
    //     expect(tx.receipt.status).be.true

    //     const numInserted = await semaphoreContract.getNumIdentityCommitments({from: owner})
    //     expect(numInserted.toString()).equal('1')

    //     console.log('Gas used by insertIdentityAsClient():', tx.receipt.gasUsed.toString())
    // })

    // contract('identity insertions', () => {
    //     it('should be stored in the contract and retrievable via leaves()', async () => {
    //         await insertCommitment(owner);
    //         const leaves = await semaphoreClientContract.getIdentityCommitments()
    //         expect(leaves.length).equal(insertedIdentityCommitments.length)

    //         const leavesHex = leaves.map(BigInt)

    //         for (let i = 0; i < insertedIdentityCommitments.length; i++) {
    //             const containsLeaf = leavesHex.indexOf(BigInt(insertedIdentityCommitments[i])) > -1
    //             expect(containsLeaf).be.true
    //         }

    //     })
        
    //     it('should be stored in the contract and retrievable by enumerating leaf()', async () => {
    //         // test-insert some commitments
    //         for (let i = 0; i < 3; i++) {
    //             await insertCommitment(owner)
    //         }
    //         // Assumes that insertedIdentityCommitments has the same number of
    //         // elements as the number of leaves
    //         const idCommsBigint = insertedIdentityCommitments.map(BigInt)
    //         for (let i = 0; i < insertedIdentityCommitments.length; i++) {
    //             const leaf = await semaphoreClientContract.getIdentityCommitment(i)
    //             console.log("retrieved leaf: ", leaf)
    //             const leafHex = BigInt(leaf)
    //             expect(idCommsBigint.indexOf(leafHex) > -1).be.true
    //         }
    //     })

    //     // it('inserting an identity commitment of the nothing-up-my-sleeve value should fail', async () => {
    //     //     const nothingUpMySleeve = 
    //     //         BigInt(ethers.utils.solidityKeccak256(['bytes'], [ethers.utils.toUtf8Bytes('Semaphore')]))
    //     //         %
    //     //         BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')

    //     //     try {
    //     //         await semaphoreClientContract.insertIdentityAsClient(nothingUpMySleeve.toString())
    //     //     } catch (e) {
    //     //         expect(e.message.endsWith('Semaphore: identity commitment cannot be the nothing-up-my-sleeve-value')).toBeTruthy()
    //     //     }
    //     // })

    // })

    contract('signal broadcasts', () => {
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

        beforeEach(async () => {
            const {identity} =  await insertCommitment(owner) 
            
            const leaves = await semaphoreClientContract.getIdentityCommitments()

            const result = await genWitness(
                SIGNAL,
                circuit,
                identity,
                leaves,
                NUM_LEVELS,
                FIRST_EXTERNAL_NULLIFIER,
            )

            proof = await genProof(result.witness, provingKey)
            publicSignals = genPublicSignals(result.witness, circuit)
            params = genBroadcastSignalParams(result, proof, publicSignals)

            // console.log("the identity used for witness ", identity)
            console.log("the inserted root: ", params.root)
        })

        // it('the proof should be valid', async () => {
        //     // expect.assertions(1)
        //     const isValid = verifyProof(verifyingKey, proof, publicSignals)
        //     expect(isValid).be.true
        // })
        
        it('the pre-broadcast check should pass', async () => {
            // expect.assertions(1)

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
            expect(check).to.be.true
        })

        // it('the pre-broadcast check with an invalid signal should fail', async () => {
        //     // expect.assertions(1)

        //     const signal = ethers.utils.toUtf8Bytes(SIGNAL)
        //     const check = await semaphoreContract.preBroadcastCheck(
        //         '0x0',
        //         params.proof,
        //         params.root,
        //         params.nullifiersHash,
        //         genSignalHash(signal).toString(),
        //         FIRST_EXTERNAL_NULLIFIER,
        //         {from: owner}
        //     )
        //     expect(check).be.false
        // })

    //     it('broadcastSignal with an input element above the scalar field should fail', async () => {
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

    //     it('broadcastSignal with an invalid proof_data should fail', async () => {
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

    //     it('broadcastSignal with an unseen root should fail', async () => {
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

    //     it('broadcastSignal by an unpermissioned user should fail', async () => {
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

        it('broadcastSignal to active external nullifier with an account with the right permissions should work', async () => {
            // expect.assertions(3)
            const tx = await semaphoreClientContract.broadcastSignal(
                ethers.utils.toUtf8Bytes(SIGNAL),
                params.proof,
                params.root,
                params.nullifiersHash,
                FIRST_EXTERNAL_NULLIFIER,
            )
            const receipt = tx.receipt
            expect(receipt.status).to.equal(1)
            console.log('Gas used by broadcastSignal():', receipt.gasUsed.toString())

            const index = (await semaphoreClientContract.nextSignalIndex()) - 1
            const signal = await semaphoreClientContract.signalIndexToSignal(index.toString())

            expect(ethers.utils.toUtf8String(signal)).to.equal(SIGNAL)

            // expect(hasEvent(receipt, semaphoreClientContract, 'SignalBroadcastByClient')).toBeTruthy()
        })

    //     it('double-signalling to the same external nullifier should fail', async () => {
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

    //     it('signalling to a different external nullifier should work', async () => {
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

    //     it('broadcastSignal to a deactivated external nullifier should fail', async () => {
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

    //     it('setPermissioning(false) should allow anyone to broadcast a signal', async () => {
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
})

function clearPreviousTests() {
    insertedIdentityCommitments = []
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

