# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright © 2021, M. Baghani (mahmoud.baghani@outlook.com)
#!/bin/bash

set -o pipefail

cd "$(dirname "$0")"
cd ..

# Delete old files
rm -rf ./build/*

echo 'Downloading solc...'
case "$OSTYPE" in
  darwin*)  solcPlatform="solc-macos" ;;
  linux*)   solcPlatform="solc-static-linux" ;;
  *)        solcPlatform="solc-static-linux" ;;
esac
solcBin=$(pwd)/solc
wget -nc -q -O $solcBin https://github.com/ethereum/solidity/releases/download/v0.6.11/${solcPlatform}
chmod a+x $solcBin

echo 'Building contracts'
$solcBin --bin --abi --optimize-runs 200 ./contracts/*.sol -o ./build/ --overwrite
cd scripts
node create_poseidon.js
