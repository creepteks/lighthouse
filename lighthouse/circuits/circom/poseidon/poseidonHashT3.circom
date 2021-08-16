// original implementation at
// https://github.com/appliedzkp/maci/blob/master/circuits/circom/poseidon/poseidonHashT3.circom
include "../../node_modules/circomlib/circuits/poseidon.circom";

template PoseidonHashT3() {
    var nInputs = 2;
    signal input inputs[nInputs];
    signal output out;

    component hasher = Poseidon(nInputs, 3, 8, 57);
    for (var i = 0; i < nInputs; i ++) {
        hasher.inputs[i] <== inputs[i];
    }
    out <== hasher.out;
}
