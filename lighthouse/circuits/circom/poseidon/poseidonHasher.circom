// original implementation at
// https://github.com/appliedzkp/maci/blob/master/circuits/circom/hasherPoseidon.circom
include "./poseidonHashT3.circom"

template HashLeftRight() {
  signal input left;
  signal input right;

  signal output hash;

  component hasher = PoseidonHashT3();
  left ==> hasher.inputs[0];
  right ==> hasher.inputs[1];

  hash <== hasher.out;
}
