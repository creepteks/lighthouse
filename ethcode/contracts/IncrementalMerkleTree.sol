// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2021, M. Baghani (mahmoud.baghani@outlook.com)
// For the original implementation, refer to https://github.com/appliedzkp/semaphore/blob/master/contracts/sol/IncrementalMerkleTree.sol

pragma solidity ^0.6.11;

import { SnarkConstants } from "./SnarkConstants.sol";
import {PoseidonT3} from "./Poseidon.sol";


contract IncrementalMerkleTree is SnarkConstants {
    // The maximum tree depth
    uint8 internal constant MAX_DEPTH = 32;

    // The tree depth
    uint8 internal treeLevels;

    // The number of inserted leaves
    uint256 internal nextLeafIndex = 0;

    // The Merkle root
    uint256 public root;

    // The Merkle path to the leftmost leaf upon initialisation. It *should
    // not* be modified after it has been set by the `initMerkleTree` function.
    // Caching these values is essential to efficient appends.
    uint256[MAX_DEPTH] internal zeros;

    // Allows you to compute the path to the element (but it's not the path to
    // the elements). Caching these values is essential to efficient appends.
    uint256[MAX_DEPTH] internal filledSubtrees;

    // Whether the contract has already seen a particular Merkle tree root
    mapping (uint256 => bool) public rootHistory;

    event LeafInsertion(uint256 indexed leaf, uint256 indexed leafIndex, uint256 currentRoot);

    /*
     * Stores the Merkle root and intermediate values (the Merkle path to the
     * the first leaf) assuming that all leaves are set to _zeroValue.
     * @param _treeLevels The number of levels of the tree
     * @param _zeroValue The value to set for every leaf. Ideally, this should
     *                   be a nothing-up-my-sleeve value, so that nobody can
     *                   say that the deployer knows the preimage of an empty
     *                   leaf.
     */
    constructor(uint8 _treeLevels, uint256 _zeroValue) internal {
        // Limit the Merkle tree to MAX_DEPTH levels
        require(
            _treeLevels > 0 && _treeLevels <= MAX_DEPTH,
            "IncrementalMerkleTree: _treeLevels must be between 0 and 33"
        );
        
        /*
           To initialise the Merkle tree, we need to calculate the Merkle root
           assuming that each leaf is the zero value.

            H(H(a,b), H(c,d))
             /             \
            H(a,b)        H(c,d)
             /   \        /    \
            a     b      c      d

           `zeros` and `filledSubtrees` will come in handy later when we do
           inserts or updates. e.g when we insert a value in index 1, we will
           need to look up values from those arrays to recalculate the Merkle
           root.
         */
        treeLevels = _treeLevels;

        zeros[0] = _zeroValue;

        uint256 currentZero = _zeroValue;
        for (uint8 i = 1; i < _treeLevels; i++) {
            uint256 hashed = hashLeftRight(currentZero, currentZero);
            zeros[i] = hashed;
            filledSubtrees[i] = hashed;
            currentZero = hashed;
        }

        root = hashLeftRight(currentZero, currentZero);
    }

    /*
     * Inserts a leaf into the Merkle tree and updates the root and filled
     * subtrees.
     * @param _leaf The value to insert. It must be less than the snark scalar
     *              field or this function will throw.
     * @return The leaf index.
     */
    function insertLeaf(uint256 _leaf) internal returns (uint256) {
        require(
            _leaf < SNARK_SCALAR_FIELD,
            "IncrementalMerkleTree: insertLeaf argument must be < SNARK_SCALAR_FIELD"
        );

        uint256 currentIndex = nextLeafIndex;

        uint256 depth = uint256(treeLevels);
        require(currentIndex < uint256(2) ** depth, "IncrementalMerkleTree: tree is full");

        uint256 currentLevelHash = _leaf;
        uint256 left;
        uint256 right;

        for (uint8 i = 0; i < treeLevels; i++) {
            // if current_index is 5, for instance, over the iterations it will
            // look like this: 5, 2, 1, 0, 0, 0 ...

            if (currentIndex % 2 == 0) {
                // For later values of `i`, use the previous hash as `left`, and
                // the (hashed) zero value for `right`
                left = currentLevelHash;
                right = zeros[i];

                filledSubtrees[i] = currentLevelHash;
            } else {
                left = filledSubtrees[i];
                right = currentLevelHash;
            }

            currentLevelHash = hashLeftRight(left, right);

            // equivalent to currentIndex /= 2;
            currentIndex >>= 1;
        }

        root = currentLevelHash;
        rootHistory[root] = true;

        uint256 n = nextLeafIndex;
        nextLeafIndex += 1;

        emit LeafInsertion(_leaf, n, root);

        return currentIndex;
    }

    /*
     * hashes two `uint256` values (left and right) using Poseidon hash
     * @param _left The first value
     * @param _right The second value
     * @return The uint256 hash of _left and _right
     */
    function hashLeftRight(uint256 _left, uint256 _right)
        public
        pure
        returns (uint256)
    {
        uint256[2] memory input;
        input[0] = _left;
        input[1] = _right;
        return PoseidonT3.poseidon(input);
    }
}
