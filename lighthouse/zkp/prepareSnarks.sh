#!/bin/bash
echo 'Compiling the zokrates DSL file into circuts'
zokrates compile --input sha256PreimageProof.zok --output bin/sha256PreimageProof --abi_spec bin/sha256PreimageProof.json --light
echo '------------------------------------'
echo 'Doing the trusted setup for zkSNARKs'
zokrates setup --input bin/sha256PreimageProof --light
echo '------------------------------------'
echo 'Exporting the verifier smart contract'
zokrates export-verifier --output ../ethcode/contracts/verifier.sol