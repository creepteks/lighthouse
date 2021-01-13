// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./verifier.sol";

contract beacon is Ownable, Verifier {
    // whether the vote is still in voters position or has been cast into the ballot box
    enum ballotState {raw, burnt }
    struct ballot {
        ballotState state;
        string encrypted;
    }
    mapping(bytes32 => ballot) public beacons;


    // function registerVoter(address did) public {
    //     bytes memory byte_did = toBytes(did);
    //     bytes32 hashed = sha256(byte_did);
    //     registerVoter(hashed);
    // }

    function registerVoter(bytes32 hdid) public {
        beacons[hdid] = ballot ({state: ballotState.raw, encrypted: ''});
    }

    function vote(
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c, 
    uint[9] memory input, 
    address voter,
    string memory ecnryptedVote) 
    public returns (bool result) {
        result = false;
        require(verifyTx(a, b, c, input), 'invalid zk proof. Abort');

        // TODO: refactor this so the client sends bytes32 in order to reduce the gas consumption
        bytes memory did = toBytes(voter);
        bytes32 hashed  = sha256(did);

        beacons[hashed].encrypted = ecnryptedVote;

        result = true;
    }

    function toBytes(address x) internal pure returns (bytes memory b) {
        b = new bytes(32);
        assembly {mstore(add(b, 32), x)}
    }

    function toBytes(string memory x) internal pure returns (bytes memory b) {
        b = new bytes(32);
        assembly {mstore(add(b, 32), x)}
    }
}