// refer to 
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

template CalculateIdentityCommitment(IDENTITY_PK_SIZE_IN_BITS, NULLIFIER_TRAPDOOR_SIZE_IN_BITS) {
  signal input identity_pk[IDENTITY_PK_SIZE_IN_BITS];
  signal input identity_nullifier[NULLIFIER_TRAPDOOR_SIZE_IN_BITS];
  signal input identity_trapdoor[NULLIFIER_TRAPDOOR_SIZE_IN_BITS];

  signal output out;

  // identity commitment is a pedersen hash of (identity_pk, identity_nullifier, identity_trapdoor), each element padded up to 256 bits
  component identity_commitment = Pedersen(3*256);
  for (var i = 0; i < 256; i++) {
    if (i < IDENTITY_PK_SIZE_IN_BITS) {
      identity_commitment.in[i] <== identity_pk[i];
    } else {
      identity_commitment.in[i] <== 0;
    }

    if (i < NULLIFIER_TRAPDOOR_SIZE_IN_BITS) {
      identity_commitment.in[i + 256] <== identity_nullifier[i];
      identity_commitment.in[i + 2*256] <== identity_trapdoor[i];
    } else {
      identity_commitment.in[i + 256] <== 0;
      identity_commitment.in[i + 2*256] <== 0;
    }
  }

  out <== identity_commitment.out[0];
}

template CalculateNullifier(NULLIFIER_TRAPDOOR_SIZE_IN_BITS, EXTERNAL_NULLIFIER_SIZE_IN_BITS, n_levels) {
  signal input external_nullifier;
  signal input identity_nullifier[NULLIFIER_TRAPDOOR_SIZE_IN_BITS];
  signal input identity_path_index[n_levels];

  signal output nullifiers_hash;

  component external_nullifier_bits = Num2Bits(EXTERNAL_NULLIFIER_SIZE_IN_BITS);
  external_nullifier_bits.in <== external_nullifier;

  var nullifiers_hasher_bits = NULLIFIER_TRAPDOOR_SIZE_IN_BITS + EXTERNAL_NULLIFIER_SIZE_IN_BITS + n_levels;
  if (nullifiers_hasher_bits < 530) {
    nullifiers_hasher_bits = 530;
  }

  component nullifiers_hasher = Pedersen(nullifiers_hasher_bits);
  for (var i = 0; i < NULLIFIER_TRAPDOOR_SIZE_IN_BITS; i++) {
    nullifiers_hasher.in[i] <== identity_nullifier[i];
  }

  for (var i = 0; i < EXTERNAL_NULLIFIER_SIZE_IN_BITS; i++) {
    nullifiers_hasher.in[NULLIFIER_TRAPDOOR_SIZE_IN_BITS + i] <== external_nullifier_bits.out[i];
  }

  for (var i = 0; i < n_levels; i++) {
    nullifiers_hasher.in[NULLIFIER_TRAPDOOR_SIZE_IN_BITS + EXTERNAL_NULLIFIER_SIZE_IN_BITS + i] <== identity_path_index[i];
  }

  for (var i = (NULLIFIER_TRAPDOOR_SIZE_IN_BITS + EXTERNAL_NULLIFIER_SIZE_IN_BITS + n_levels); i < nullifiers_hasher_bits; i++) {
    nullifiers_hasher.in[i] <== 0;
  }

  nullifiers_hash <== nullifiers_hasher.out[0];
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

    component identity_nullifier_bits = Num2Bits(NULLIFIER_TRAPDOOR_SIZE_IN_BITS);
    identity_nullifier_bits.in <== identity_nullifier;

    component identity_trapdoor_bits = Num2Bits(NULLIFIER_TRAPDOOR_SIZE_IN_BITS);
    identity_trapdoor_bits.in <== identity_trapdoor;

    component identity_pk_0_bits = Num2Bits_strict();
    identity_pk_0_bits.in <== identity_pk[0];

    // BEGIN identity commitment
    component identity_commitment = CalculateIdentityCommitment(IDENTITY_PK_SIZE_IN_BITS, NULLIFIER_TRAPDOOR_SIZE_IN_BITS);
    for (var i = 0; i < IDENTITY_PK_SIZE_IN_BITS; i++) {
      identity_commitment.identity_pk[i] <== identity_pk_0_bits.out[i];
    }
    for (var i = 0; i < NULLIFIER_TRAPDOOR_SIZE_IN_BITS; i++) {
      identity_commitment.identity_nullifier[i] <== identity_nullifier_bits.out[i];
      identity_commitment.identity_trapdoor[i] <== identity_trapdoor_bits.out[i];
    }
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
    component nullifiers_hasher = CalculateNullifier(NULLIFIER_TRAPDOOR_SIZE_IN_BITS, EXTERNAL_NULLIFIER_SIZE_IN_BITS, n_levels);
    nullifiers_hasher.external_nullifier <== external_nullifier;
    for (var i = 0; i < NULLIFIER_TRAPDOOR_SIZE_IN_BITS; i++) {
      nullifiers_hasher.identity_nullifier[i] <== identity_nullifier_bits.out[i];
    }
    for (var i = 0; i < n_levels; i++) {
      nullifiers_hasher.identity_path_index[i] <== identity_path_index[i];
    }
    nullifiers_hash <== nullifiers_hasher.nullifiers_hash;
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
