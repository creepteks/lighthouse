// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

 library byteutils {
    function bytesToBytes32(bytes calldata b, uint offset) public pure returns (bytes32) {
        bytes32 out;

        for (uint i = 0; i < 32; i++) {
            out |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
        }
        return out;
    }
    
    function toBytes(address x) public pure returns (bytes memory b) {
        b = new bytes(32);
        assembly {mstore(add(b, 32), x)}
    }

    function toBytes(string memory x) public pure returns (bytes memory b) {
        b = new bytes(32);
        assembly {mstore(add(b, 32), x)}
    }
 }