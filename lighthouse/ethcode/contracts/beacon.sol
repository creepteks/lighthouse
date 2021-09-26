// SPDX-License-Identifier: MIT
pragma experimental ABIEncoderV2;
pragma solidity ^0.6.11;

import "./EdDSA.sol";
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
    Ballot[] public beacons;

    constructor(uint8 _treeLevels, uint232 _randomBeaconNullifier)
        Semaphore(_treeLevels, _randomBeaconNullifier)
        public {
    }

    function registerVoter(uint256 idCommit, uint256[2] memory pubkey, uint256[2] memory R8, uint256 s) public returns (uint256) {
        // TODO check if the registrar pubkey is valid 
        // require(registrar[input[0]], "Unknown Registrar; Aborting Registration phase");

        // TODO fix the problem with eddsa verification
        // require(VerifyPoseidon(pubkey, idCommit, R8, s), "EdDSA signature is not valid");

        // inserting the identity commitment in the accumulator
        return insertIdentity(idCommit);
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

    function getBallots() public view returns (Ballot[] memory votes) {
        return beacons;
    }
}