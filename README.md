# Lighthouse
Lighthouse is an anonymous, private, and self-tallying e-voting protocol. The current implementation is based on the Ethereum blockchain, with inspirations from [Semaphore](https://github.com/appliedzkp/semaphore) when it comes to zk proofs.

## Installation
The installation phase is only needed if you want to start experimenting with the PoC.
### Platform
You can run the PoC on both Linux and Windows via WSL. Running this on pure windows is not tested, but as long as the dependencies are successfully installed, you should be fine.
### Installing dependencies
**Node**:
The implementation should work with Node v14+; the actual version used during development was v14.17.10. For optimal node installation experience, I suggest using [nvm](https://github.com/nvm-sh/nvm). 
Check that your node installation is successful before proceeding to next step:
```bash
node --version
```
which should print out the version.

**Solidity Compiler**:
The `compile_sol.sh` script provides you with appropriate `solc` version needed for the project. However, you can install `solc` via tools like [svm](https://github.com/web3j/svm) or Solidity binary packages manually.

**Lerna**:
I use `lerna` for managing dependencies for multiple packages. Install `lerna` using
```bash
npm install lerna -g
```

**Libraries**:
Once the previous steps are done, install project libraries via
```bash
git clone https://github.com/creepteks/lighthouse.git && cd lighthouse
lerna bootstrap
```
This command installs the dependencies for separate packages inside the `lighthouse` project.


## PoC: Simple e-voting scenario

To start a test voting scenario, you have to follow 4 steps:
### 01: Trusted Setup
The current protocol needs trusted setup in order to function. A non-secure, development-only trusted setup can be preformed by `fast_build_circuits.sh`. For more info on how to do a trusted setup as MPC, refer to [snarkjs](https://github.com/iden3/snarkjs), since the current protocol uses snarkjs for zkSNARKs proofs and verifications.
```bash 
cd circuits
./scripts/fast_build_snarks.sh
cd ..
```
### 02: Using a test blockchain
While you can use any Ethereum Testnets, we can simply use `ganache` to test the scenario.
Fire up an instance of ganache using the following commands:
```bash
cd ethcode
./scripts/start_ganache.sh
```

### 03: Compiling E-voting smart contract
We also need to compile the voting smart contract and its dependencies:
```bash
cd ethcode
./scripts/compile_sol.sh
```
This will download `solc` if necessary, and then compile the smart contracts.

### 04: Starting the scenario
Now, everything should be ready for testing. The Scenario includes 
* Initialization phase
  * creating the voting key pair
  * deploying contracts to blockchain
* Registration
  * creating voter's key pair
  * registering via smart contract
* Voting
  * creating zk-proof of being registered
  * voting anonymously via smart contract
* Tallying
  * decrypting every vote stored on the smart contract with voting secret key
  * counting the votes

In order to start this scenario, run the following commands:
```bash
cd ethcode
node ./scripts/voting_scenario.js
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.txt)