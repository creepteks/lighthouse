// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "./verifier.sol";
import "./utils/byteutils.sol";

contract beacon is Verifier {
    // whether the vote is still in voters position or has been cast into the ballot box
    enum ballotState {raw, burnt }
    struct ballot {
        ballotState state;
        string encrypted;
    }
    mapping(bytes32 => ballot) public beacons;

    function registerVoter(uint[9] calldata input) public {
        bytes memory hdid = abi.encode(input);
        // bytesToBytes32 only reads the first 32 bytes, so should not worry about the 9th element of input 
        bytes32 hdid32 = byteutils.bytesToBytes32(hdid, 0);
        beacons[hdid32] = ballot ({state: ballotState.raw, encrypted: ''});
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
        require(beacons[h32].state != ballotState.burnt, 'Already voted. Abort');
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