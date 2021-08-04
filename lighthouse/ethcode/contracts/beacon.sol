// SPDX-License-Identifier: MIT
pragma solidity ^0.5.0;

import "./zok_verifier.sol";
import "./utils/byteutils.sol";

contract beacon is ZokVerifier {
    // whether the vote is still in voters position or has been cast into the ballot box
    enum ballotState {raw, registered, burnt }
    struct ballot {
        ballotState state;
        string encrypted;
    }
    mapping(bytes32 => ballot) public beacons;

    function registerVoter(uint[9] memory input) public returns (bool successful) {
        bytes memory hdid = abi.encode(input);
        // bytesToBytes32 only reads the first 32 bytes, so should not worry about the 9th element of input 
        bytes32 hdid32 = byteutils.bytesToBytes32(hdid, 0);
        // make sure the voter is not being registered for the second time
        require(beacons[hdid32].state == ballotState.raw, 'Voter already registered. Abort');
        beacons[hdid32] = ballot ({state: ballotState.registered, encrypted: ''});
        successful = true;
    }

    function vote(
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c, 
    uint[9] memory input, 
    string memory ecnryptedVote) 
    public returns (bool result) {
        result = false;
        // verify the zkp
        require(verifyTx(a, b, c, input), 'invalid zk proof. Abort');

        bytes memory hashed  = abi.encode(input);
        // bytesToBytes32 only reads the first 32 bytes, so should not worry about the 9th element of input 
        bytes32 h32 = byteutils.bytesToBytes32(hashed, 0);

        // check for duplicate votes
        require(beacons[h32].state == ballotState.registered, 'Ballot is not valid. Abort');
        // recording the vote
        beacons[h32].encrypted = ecnryptedVote;
        beacons[h32].state = ballotState.burnt;

        result = true;
    }

    function getVote(uint[9] memory input) public view returns (string memory v) {
        bytes memory hashed  = abi.encode(input);
        // bytesToBytes32 only reads the first 32 bytes, so should not worry about the 9th element of input 
        bytes32 h32 = byteutils.bytesToBytes32(hashed, 0);
        v = beacons[h32].encrypted;
    }
}