// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2021, M. Baghani (mahmoud.baghani@outlook.com)

cd "$(dirname "$0")"
mkdir -p ../build
cd ../build

rm ./*
solc --bin --abi --optimize-runs 200 ../contracts/*.sol -o ./ --overwrite
cd ../scripts
node createPoseidon.js