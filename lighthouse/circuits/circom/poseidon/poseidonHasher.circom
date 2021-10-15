// original implementation at
// https://github.com/appliedzkp/maci/blob/master/circuits/circom/hasherPoseidon.circom
include "../../node_modules/circomlib/circuits/poseidon.circom";

template HashLeftRight() {
  signal input left;
  signal input right;

  signal output hash;

  component hasher = PoseidonHashT3();
  left ==> hasher.inputs[0];
  right ==> hasher.inputs[1];

  hash <== hasher.out;
}


template PoseidonHashT3() {
    var nInputs = 2;
    signal input inputs[nInputs];
    signal output out;

    component hasher = Poseidon(nInputs);
    for (var i = 0; i < nInputs; i ++) {
        hasher.inputs[i] <== inputs[i];
    }
    out <== hasher.out;
}

template PoseidonHashT4() {
    var nInputs = 3;
    signal input inputs[nInputs];
    signal output out; 
    component hasher = Poseidon(nInputs);
    for (var i = 0; i < nInputs; i ++) {
        hasher.inputs[i] <== inputs[i];
    }

    out <== hasher.out;
}
