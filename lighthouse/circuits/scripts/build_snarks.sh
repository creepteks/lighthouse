#!/bin/bash

# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright © 2021, M. Baghani (mahmoud.baghani@outlook.com)
# For the original implementation, refer to https://github.com/appliedzkp/semaphore/blob/master/circuits/scripts/build_snarks.sh

cd "$(dirname "$0")"
mkdir -p ../build
cd ../build

echo "---------------------"
if [ -f ./lighthouse.wasm ]; then
    echo "lighthouse.wasm already exists. Aborting."
    exit 0
else
    echo 'Generating lighthouse.wasm'
    export NODE_OPTIONS=--max-old-space-size=4096
    npx circom ../circom/lighthouse.circom --r1cs --wasm --sym
    COMPILATION_RES1=$?
    # npx snarkjs r1cs export json lighthouse.r1cs lighthouse.json
fi
echo "---------------------"

if [ $COMPILATION_RES1 -eq 0 ]; then
    echo "Successfully compiled lighthouse.circom"
else
    echo "Error while compiling lighthouse.circom. Aborting"
    exit $COMPILATION_RES1
fi

# start a new powers of tau ceremony
echo "---------------------"
if [ -f ./pot12_0000.ptau ]; then
    echo "Power of tau file already created"
else 
    echo 'Generating pot12_0000.ptau'
    npx snarkjs powersoftau new bn128 17 pot12_0000.ptau -v
fi 
echo "---------------------"

# add contribuition
echo "---------------------"
if [ -f ./pot12_0001.ptau ]; then
    echo "first contribution is already added"
else
    echo 'Generating pot12_0001.ptau (first contribution)'
    npx snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v -e="Some random text"
fi
echo "---------------------"

echo "---------------------"
if [ -f ./pot12_0002.ptau ]; then
    echo "second contribution is already done"
else
    echo 'Generating pot12_0002.ptau (second contribution)'
    npx snarkjs powersoftau contribute pot12_0001.ptau pot12_0002.ptau --name="Second contribution" -v -e="Another random text"
fi
echo "---------------------"

echo "---------------------"
if [ -f ./pot12_0003.ptau ]; then
    echo "third contribution already added"
else
    echo 'Generating pot12_0003.ptau (third contribution)'
    npx snarkjs powersoftau export challenge pot12_0002.ptau challenge_0003
    npx snarkjs powersoftau challenge contribute bn128 challenge_0003 response_0003 -e="some random text"
    npx snarkjs powersoftau import response pot12_0002.ptau response_0003 pot12_0003.ptau -n="Third contribution name"
fi
echo "---------------------"

# verify the protocol so far
echo "---------------------"
echo "verifying the power of tau so far"
npx snarkjs powersoftau verify pot12_0003.ptau
echo "---------------------"

# apply random beacon
echo "---------------------"
if [ -f ./pot12_beacon.ptau ]; then
    echo "random beacon contribution already added"
else
    echo "applying (as of now, an unsecure ) random beacon to powers of tau"
    npx snarkjs powersoftau beacon pot12_0003.ptau pot12_beacon.ptau 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"
fi
echo "---------------------"

echo "---------------------"
if [ -f ./pot12_final.ptau ]; then
    echo "phase 2 contribution is already added"
else
    echo "applying phase 2 contribution"
    npx snarkjs powersoftau prepare phase2 pot12_beacon.ptau pot12_final.ptau -v
fi
echo "---------------------"

# verify the final tau
echo "---------------------"
echo "verifying powers of tau after applying random beacon and phase 2"
npx snarkjs powersoftau verify pot12_final.ptau
echo "---------------------"

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
    npx snarkjs groth16 setup lighthouse.r1cs pot12_final.ptau lighthouse_0000.zkey
    npx snarkjs zkey contribute lighthouse_0000.zkey lighthouse_0001.zkey --name="1st Contributor Name" -v -e="Some random entropy"
    npx snarkjs zkey contribute lighthouse_0001.zkey lighthouse_final.zkey --name="Second contribution Name" -v -e="Another random entropy"
    # TODO add build time arg for dev and full trusted setup mode
    # npx snarkjs zkey contribute lighthouse_0001.zkey lighthouse_0002.zkey --name="Second contribution Name" -v -e="Another random entropy"
    # npx snarkjs zkey export bellman lighthouse_0002.zkey  challenge_phase2_0003
    # npx snarkjs zkey bellman contribute bn128 challenge_phase2_0003 response_phase2_0003 -e="some random text"
    # npx snarkjs zkey import bellman lighthouse_0002.zkey response_phase2_0003 lighthouse_0003.zkey -n="Third contribution name"
    # npx snarkjs zkey verify lighthouse.r1cs pot12_final.ptau lighthouse_0003.zkey
    # npx snarkjs zkey beacon lighthouse_0003.zkey lighthouse_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"
    npx snarkjs zkey verify lighthouse.r1cs pot12_final.ptau lighthouse_final.zkey
    npx snarkjs zkey export verificationkey lighthouse_final.zkey verification_key.json
fi
echo "---------------------"

# Copy verifier.sol to the contracts/sol directory
echo 'Copying verifier.sol to contracts/sol.'
cp ./verifier.sol ../../ethcode/contracts/
