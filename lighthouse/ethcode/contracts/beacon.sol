// SPDX-License-Identifier: MIT
pragma solidity ^0.6.11;

import "./EdDSA.sol";
import "./Semaphore.sol";
import "./Poseidon.sol";

contract beacon is Semaphore, EdDSA {
    mapping(uint256 => uint256) public beacons;

    constructor(uint8 _treeLevels, uint232 _randomBeaconNullifier)
        Semaphore(_treeLevels, _randomBeaconNullifier)
        public {
    }

    // function registerVoter(
    //     uint[2] memory a,
    //     uint[2][2] memory b,
    //     uint[2] memory c,
    //     uint[7] memory input
    // ) public returns (uint256) {
    //     // TODO check if the registrar pubkey is valid 
    //     // require(registrar[input[0]], "Unknown Registrar; Aborting Registration phase");
    //     // checking eddsa proof of knowledge
    //     require(verifyEddsaProof(a, b, c, input), "eddsa proof is not valid");

    //     // inserting the identity commitment in the accumulator
    //     return insertIdentity(input[0]);
    // }

    function registerVoter(uint256 idCommit, uint256[2] memory pubkey, uint256[2] memory R8, uint256 s) public returns (uint256) {
        // TODO check if the registrar pubkey is valid 
        // require(registrar[input[0]], "Unknown Registrar; Aborting Registration phase");

        // TODO fix the problem with eddsa verification
        // require(VerifyPoseidon(pubkey, idCommit, R8, s), "EdDSA signature is not valid");

        // inserting the identity commitment in the accumulator
        return insertIdentity(idCommit);
    }

    function vote(
        bytes memory _encryptedVote,
        uint256[8] memory _proof,
        uint256 _root,
        uint256 _nullifiersHash,
        uint232 _externalNullifier) 
        public returns (bool result) {
        result = false;
        // verify the zkp
        broadcastSignal(_encryptedVote, _proof, _root, _nullifiersHash, _externalNullifier);

        result = true;
    }

    // function getVote(uint[9] memory input) public view returns (string memory v) {
    //     bytes memory hashed  = abi.encode(input);
    //     // bytesToBytes32 only reads the first 32 bytes, so should not worry about the 9th element of input 
    //     bytes32 h32 = byteutils.bytesToBytes32(hashed, 0);
    //     v = beacons[h32].encrypted;
    // }
}