rm ./build/*
solc --bin --abi --optimize-runs 200 contracts/*.sol -o build/ --overwrite
cd scripts
node createPoseidon.js
