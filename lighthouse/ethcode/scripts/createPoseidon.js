// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2021, M. Baghani (mahmoud.baghani@outlook.com)
// For the original implementation, refer to https://github.com/appliedzkp/maci/blob/master/contracts/ts/buildPoseidon.ts

const Artifactor = require('@truffle/artifactor')

const poseidonGenContract = require('circomlib/src/poseidon_gencontract.js')
const artifactor = new Artifactor('../build/')

const buildPoseidonT3 = async () => {
  await artifactor.save({
    contractName: 'PoseidonT3',
    abi: poseidonGenContract.generateABI(2),
    unlinked_binary: poseidonGenContract.createCode(2)
  })
}

const buildPoseidonT6 = async () => {
  await artifactor.save({
    contractName: 'PoseidonT6',
    abi: poseidonGenContract.generateABI(5),
    unlinked_binary: poseidonGenContract.createCode(5)
  })
}

buildPoseidonT3()
buildPoseidonT6()

