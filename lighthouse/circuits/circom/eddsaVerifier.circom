// neo 

include "../node_modules/circomlib/circuits/eddsaposeidon.circom";
include "./poseidon/poseidonHasher.circom";

// TODO refactor eddsa as it is used in lighthouse-base.circom
template eddsaVerifier() {
    signal input signer_pk[2];
    signal input identity_commitment;
    signal input auth_sig_r[2];
    signal input auth_sig_s;

    component hasher = HashLeftRight();
    hasher.left <== identity_commitment;
    hasher.right <== 0;

    component sig_verifier = EdDSAPoseidonVerifier();
    1 ==> sig_verifier.enabled;
    signer_pk[0] ==> sig_verifier.Ax;
    signer_pk[1] ==> sig_verifier.Ay;
    auth_sig_r[0] ==> sig_verifier.R8x;
    auth_sig_r[1] ==> sig_verifier.R8y;
    auth_sig_s ==> sig_verifier.S;
    hasher.hash ==> sig_verifier.M;
}

component main = eddsaVerifier();