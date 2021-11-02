#!/bin/bash

# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright © 2021, M. Baghani (mahmoud.baghani@outlook.com)
# For the original implementation, refer to https://github.com/appliedzkp/semaphore/blob/master/circuits/scripts/build_snarks.sh

cd "$(dirname "$0")"
mkdir -p ../build
cd ../build

if [ -f ./powersOfTau28_hez_final_14.ptau ]; then
    echo "powersOfTau28_hez_final_14.ptau already exists. Skipping."
else
    echo 'Downloading powersOfTau28_hez_final_14.ptau'
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau
fi

echo "---------------------"
if [ -f ./lighthouse.wasm ]; then
    echo "lighthouse.wasm already exists. Aborting."
    exit 0
else
    echo 'Generating lighthouse.wasm'
    export NODE_OPTIONS=--max-old-space-size=4096
    npx circom ../circom/lighthouse.circom --r1cs --wasm --sym
    COMPILATION_RES1=$?
    npx snarkjs r1cs export json lighthouse.r1cs lighthouse.json
fi
echo "---------------------"

if [ $COMPILATION_RES1 -eq 0 ]; then
    echo "Successfully compiled lighthouse.circom"
else
    echo "Error while compiling lighthouse.circom. Aborting"
    exit $COMPILATION_RES1
fi

# view the information of the lighthouse circuit
echo "---------------------"
echo "getting the information of the lighthouse circuit"
npx snarkjs r1cs info lighthouse.r1cs
echo "---------------------"

echo "---------------------"
if [ -f ./verification_key.json ]; then
    echo "Verification key exists. Skipping"
else    
    echo "starting Groth16 setup phase"
    echo "setting up"
    npx snarkjs groth16 setup lighthouse.r1cs powersOfTau28_hez_final_14.ptau lighthouse_0000.zkey
    echo "first contribution"
    npx snarkjs zkey contribute lighthouse_0000.zkey lighthouse_0001.zkey --name="1st Contributor Name" -v -e="Some random entropy"
    echo "second contribution"
    npx snarkjs zkey contribute lighthouse_0001.zkey lighthouse_0002.zkey --name="Second contribution Name" -v -e="Another random entropy"
    npx snarkjs zkey beacon lighthouse_0002.zkey lighthouse_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"
    # TODO add build time arg for dev and full trusted setup mode
    # npx snarkjs zkey contribute lighthouse_0001.zkey lighthouse_0002.zkey --name="Second contribution Name" -v -e="Another random entropy"
    # npx snarkjs zkey export bellman lighthouse_0002.zkey  challenge_phase2_0003
    # npx snarkjs zkey bellman contribute bn128 challenge_phase2_0003 response_phase2_0003 -e="some random text"
    # npx snarkjs zkey import bellman lighthouse_0002.zkey response_phase2_0003 lighthouse_0003.zkey -n="Third contribution name"
    # npx snarkjs zkey verify lighthouse.r1cs pot12_final.ptau lighthouse_0003.zkey
    # npx snarkjs zkey beacon lighthouse_0003.zkey lighthouse_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"
    npx snarkjs zkey verify lighthouse.r1cs powersOfTau28_hez_final_14.ptau lighthouse_final.zkey
    npx snarkjs zkey export verificationkey lighthouse_final.zkey verification_key.json
fi
echo "---------------------"

echo "---------------------"
echo 'Generating lighthouseVerifier.sol'
npx snarkjs zkey export solidityverifier lighthouse_final.zkey verifier.sol
echo "---------------------"

# Copy verifier.sol to the contracts/sol directory
echo 'Copying verifier.sol to contracts/sol.'
cp ./verifier.sol ../../ethcode/contracts/