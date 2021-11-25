// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2021, M. Baghani (mahmoud.baghani@outlook.com)

// using experimental encoder for complex types
pragma experimental ABIEncoderV2;
pragma solidity ^0.6.11;

import "./Semaphore.sol";
import "./Poseidon.sol";

contract beacon is Semaphore {
    struct Cyphertext {
        uint256 iv;
        uint256[] data;
    }

    struct Ballot {
        uint256[2] pubKey;
        Cyphertext encVote;
    }
    
    // inserted commitments as leafs in the merkle tree
    uint256[] public identityCommitments;
    Ballot[] public beacons;


    constructor(uint8 _treeLevels, uint232 _randomBeaconNullifier)
        Semaphore(_treeLevels, _randomBeaconNullifier)
        public {
    }

    function registerVoter(uint256 idCommit, uint256[2] memory pubkey, uint256[2] memory R8, uint256 s) 
    onlyOwner() public returns (uint256) {
        uint256 index = insertIdentity(idCommit);
        identityCommitments.push(idCommit);
        return index;
    }

    function vote(
        uint256[2] memory _ephemeralKey,
        Cyphertext memory _encryptedVote,
        bytes memory _signal,
        uint256[8] memory _proof,
        uint256 _root,
        uint256 _nullifiersHash,
        uint232 _externalNullifier) 
        public returns (bool result) {
        // verify the zkp
        broadcastSignal(_signal, _proof, _root, _nullifiersHash, _externalNullifier);

        // record the encrpyted vote
        beacons.push(Ballot(_ephemeralKey, _encryptedVote));

        result = true;
    }

    function getIdentityCommitments() public view returns (uint256 [] memory) {
        return identityCommitments;
    }

    function getIdentityCommitment(uint256 _index) public view returns (uint256) {
        return identityCommitments[_index];
    }


    function getBallots() public view returns (Ballot[] memory votes) {
        return beacons;
    }
}