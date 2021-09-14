// SPDX-License-Identifier: MIT
pragma solidity ^0.6.11;

import "./libs/byteutils.sol";
import "./Semaphore.sol";
import "./eddsaVerifier.sol";

contract beacon is Semaphore, Verifier {
    mapping(uint256 => uint256) public beacons;

    constructor(uint8 _treeLevels, uint232 _randomBeaconNullifier)
        Semaphore(_treeLevels, _randomBeaconNullifier)
        public {
    }

    function registerVoter(uint256 _identityCommitment) public returns (uint256) {
        return insertIdentity(_identityCommitment);
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