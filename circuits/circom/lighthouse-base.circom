// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2021, M. Baghani (mahmoud.baghani@outlook.com)
// https://github.com/appliedzkp/semaphore/blob/master/circuits/circom/semaphore-base.circom

include "../node_modules/circomlib/circuits/pedersen.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/eddsaposeidon.circom";
include "../node_modules/circomlib/circuits/babyjub.circom";
include "./poseidon/poseidonHasher.circom";
include "./IncrementalMerkleTree.circom";

function assert (condition) {
  if (condition == 0) {
    var x = 0;
    x = x \ 0;
  }
}

template VerifyPkOnCurve() {
    signal input identity_pk[2];

    component verify_identity_pk_on_curve = BabyCheck();
    verify_identity_pk_on_curve.x <== identity_pk[0];
    verify_identity_pk_on_curve.y <== identity_pk[1];
}

template Pk2SubgroupElement() {
    signal input identity_pk[2];
    signal output out;

    component dbl1 = BabyDbl();
    dbl1.x <== identity_pk[0];
    dbl1.y <== identity_pk[1];
    component dbl2 = BabyDbl();
    dbl2.x <== dbl1.xout;
    dbl2.y <== dbl1.yout;
    component dbl3 = BabyDbl();
    dbl3.x <== dbl2.xout;
    dbl3.y <== dbl2.yout;

    out <== dbl3.xout;
}

template CalculateIdentityCommitment() {
    signal input identity_public_key_subgroup_element;
    signal input identity_nullifier;
    signal input identity_trapdoor;

    signal output out;

    component hasher = PoseidonHashT4();
    hasher.inputs[0] <== identity_public_key_subgroup_element;
    hasher.inputs[1] <== identity_nullifier;
    hasher.inputs[2] <== identity_trapdoor;
    out <== hasher.out;
}

template CalculateNullifierHash() {
    signal input external_nullifier;
    signal input identity_nullifier;
    signal input path_index_num;

    signal output out;

    component hasher = PoseidonHashT4();
    hasher.inputs[0] <== external_nullifier;
    hasher.inputs[1] <== identity_nullifier;
    hasher.inputs[2] <== path_index_num;
    out <== hasher.out;
}

// n_levels must be < 32
template Lighthouse(n_levels) {
    // BEGIN signals

    signal input signal_hash;
    signal input external_nullifier;
    
    signal private input fake_zero;

    // poseidon vector commitment
    signal private input identity_pk[2];
    signal private input identity_nullifier;
    signal private input identity_trapdoor;
    signal private input identity_path_elements[n_levels];
    signal private input identity_path_index[n_levels];

    // signature on (external nullifier, signal_hash) with identity_pk
    signal private input auth_sig_r[2];
    signal private input auth_sig_s;

    // poseidon hash
    signal output root;
    signal output nullifiers_hash;
    // END signals

    // BEGIN constants

    var IDENTITY_PK_SIZE_IN_BITS = 254;
    var NULLIFIER_TRAPDOOR_SIZE_IN_BITS = 254;
    var EXTERNAL_NULLIFIER_SIZE_IN_BITS = 254;

    // END constants

    fake_zero === 0;

    component verify_identity_pk_on_curve = BabyCheck();
    verify_identity_pk_on_curve.x <== identity_pk[0];
    verify_identity_pk_on_curve.y <== identity_pk[1];

    component verify_auth_sig_r_on_curve = BabyCheck();
    verify_auth_sig_r_on_curve.x <== auth_sig_r[0];
    verify_auth_sig_r_on_curve.y <== auth_sig_r[1];


    // BEGIN identity commitment

    component verifyPkOnCurve = VerifyPkOnCurve();
    verifyPkOnCurve.identity_pk[0] <== identity_pk[0];
    verifyPkOnCurve.identity_pk[1] <== identity_pk[1];

    component pk2SubgroupElement = Pk2SubgroupElement();
    pk2SubgroupElement.identity_pk[0] <== identity_pk[0];
    pk2SubgroupElement.identity_pk[1] <== identity_pk[1];

    component identity_commitment = CalculateIdentityCommitment();
    identity_commitment.identity_public_key_subgroup_element <== pk2SubgroupElement.out;
    identity_commitment.identity_nullifier <== identity_nullifier;
    identity_commitment.identity_trapdoor <== identity_trapdoor;
    
    // END identity commitment

    // BEGIN tree
    component tree = MerkleTreeInclusionProof(n_levels);
    tree.leaf <== identity_commitment.out;
    for (var i = 0; i < n_levels; i++) {
      tree.path_index[i] <== identity_path_index[i];
      tree.path_elements[i][0] <== identity_path_elements[i];
    }
    root <== tree.root;
    // END tree

    // BEGIN nullifiers
    component bit2num = Bits2Num(n_levels);
    for (var i = 0; i < n_levels; i ++) {
      bit2num.in[i] <== identity_path_index[i];
    }
    component calculateNullifierHash = CalculateNullifierHash();
    calculateNullifierHash.external_nullifier <== external_nullifier;
    calculateNullifierHash.identity_nullifier <== identity_nullifier;
    calculateNullifierHash.path_index_num <== bit2num.out;

    nullifiers_hash <== calculateNullifierHash.out;
    // END nullifiers

    // BEGIN verify sig
    component msg_hasher = HashLeftRight();
    msg_hasher.left <== external_nullifier;
    msg_hasher.right <== signal_hash;

    component sig_verifier = EdDSAPoseidonVerifier();
    (1 - fake_zero) ==> sig_verifier.enabled;
    identity_pk[0] ==> sig_verifier.Ax;
    identity_pk[1] ==> sig_verifier.Ay;
    auth_sig_r[0] ==> sig_verifier.R8x;
    auth_sig_r[1] ==> sig_verifier.R8y;
    auth_sig_s ==> sig_verifier.S;
    msg_hasher.hash ==> sig_verifier.M;

    // END verify sig
}
