rm ./build/*
solc --bin --abi contracts/*.sol -o build/ --overwrite
cd scripts
node createPoseidon.js