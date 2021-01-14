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
        require(verifyTx(a, b, c, input), 'invalid zk proof. Abort');

        bytes memory hashed  = abi.encode(input);
        bytes32 h32 = byteutils.bytesToBytes32(hashed, 0);

        beacons[h32].encrypted = ecnryptedVote;

        result = true;
    }
}