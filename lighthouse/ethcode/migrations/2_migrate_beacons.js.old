const byteutils = artifacts.require("../utils/byteutils.sol");
const beacon = artifacts.require("beacon");

// doDeploy fixes the problem of deployer ordering different contract and their dependencies
// look at https://ethereum.stackexchange.com/questions/39372/you-must-deploy-and-link-the-following-libraries-before-you-can-deploy-a-new-ver
// and https://github.com/trufflesuite/truffle/issues/501
async function doDeploy(deployer, network) {
  await deployer.deploy(byteutils);
  await deployer.link(byteutils, beacon);
  await deployer.deploy(beacon);
}

module.exports = function (deployer, network) {
  deployer.then(async ()=> {
    await doDeploy(deployer, network);
  });
};
