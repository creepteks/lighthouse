// const MiMC = require('../build/contracts/MiMC.json')
// const Semaphore = require('../build/contracts/Semaphore.json')
// const SemaphoreClient = require('../build/contracts/SemaphoreClient.json')
// const hasEvent = require('etherlime/cli-commands/etherlime-test/events.js').hasEvent
// const { expect } = require('chai');

// const {
//     SnarkBigInt,
//     genIdentity,
//     genIdentityCommitment,
//     genExternalNullifier,
//     genWitness,
//     genCircuit,
//     genProof,
//     genPublicSignals,
//     verifyProof,
//     SnarkProvingKey,
//     SnarkVerifyingKey,
//     parseVerifyingKeyJson,
//     genBroadcastSignalParams,
//     genSignalHash,
// } = require('libsemaphore')
// const etherlime = require('etherlime-lib')
// const path = require( 'path')
// const fs = require( 'fs')
// const ethers = require( 'ethers')

// const NUM_LEVELS = 20
// const FIRST_EXTERNAL_NULLIFIER = 0
// const SIGNAL = 'signal0'

// const genTestAccounts = (num, mnemonic) => {
//     let accounts = []

//     for (let i=0; i<num; i++) {
//         const p = `m/44'/60'/${i}'/0/0`
//         const wallet = ethers.Wallet.fromMnemonic(mnemonic, p)
//         accounts.push(wallet)
//     }

//     return accounts
// }

// const accounts = genTestAccounts(2, "myth like bonus scare over problem client lizard pioneer submit female collect")
// let semaphoreContract
// let semaphoreClientContract
// let mimcContract

// // hex representations of all inserted identity commitments
// let insertedIdentityCommitments = []
// const activeEn = genExternalNullifier('1111')
// const inactiveEn = genExternalNullifier('2222')

// let deployer

// contract('Semaphore', function (deployer, network) {
    
//     beforeEach(async function () {
//         deployer = new etherlime.JSONRPCPrivateKeyDeployer(
//             accounts[0].privateKey,
//             "http://localhost:8545",
//             {
//                 gasLimit: 8800000,
//             },
//         )

//         console.log('Deploying MiMC')
//         mimcContract = await deployer.deploy(MiMC, {})

//         const libraries = {
//             MiMC: mimcContract.contractAddress,
//         }

//         console.log('Deploying Semaphore')
//         semaphoreContract = await deployer.deploy(
//             Semaphore,
//             libraries,
//             NUM_LEVELS,
//         )

//         console.log('Deploying Semaphore Client')
//         semaphoreClientContract = await deployer.deploy(
//             SemaphoreClient,
//             {},
//             semaphoreContract.contractAddress,
//         )

//         console.log('Transferring ownership of the Semaphore contract to the Semaphore Client')
//         const tx = await semaphoreContract.transferOwnership(
//             semaphoreClientContract.contractAddress,
//         )

//         await tx.wait()
//     })

//     it('Semaphore belongs to the correct owner', async function () {
//         const owner = await semaphoreContract.owner()
//         expect(owner).equal(semaphoreClientContract.contractAddress)
//     })
// })

