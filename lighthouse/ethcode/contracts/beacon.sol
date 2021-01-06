// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./verifier.sol";

contract beacon is Ownable, Verifier {
    // whether the vote is still in voters position or has been cast into the ballot box
    enum ballotState {raw, burnt }
    struct vote {
        ballotState state;
        string encrypted;
    }
    mapping(bytes32 => vote) public beacons;


    function registerVoter(address did) public {
        bytes memory byte_did = toBytes(did);
        bytes32 hashed = sha256(byte_did);
        registerVoter(hashed);
    }

    function registerVoter(bytes32 hdid) internal {
        beacons[hdid] = vote ({state: ballotState.raw, encrypted: ''});
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