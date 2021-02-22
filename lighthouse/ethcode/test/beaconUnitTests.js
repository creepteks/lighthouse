const { accounts, contract } = require('@openzeppelin/test-environment');
const catchRevert = require("./exceptions.js").catchRevert
const { expect } = require('chai');
const fs = require('fs');

const beacon = contract.fromArtifact('beacon');
const byteutils = contract.fromArtifact('byteutils');

// err messages
const REVERT = "Returned error: VM Exception while processing transaction: revert ERC20: transfer amount exceeds balance -- Reason given: ERC20: transfer amount exceeds balance."


describe('beacon issuance unit test', function (deployer, network) {
    const [owner, other] = accounts;
    // read the zkp proof
    const proof = JSON.parse(fs.readFileSync("../zkp/proof.json"))

    beforeEach(async function () {
        var lib = await byteutils.new();
        await beacon.detectNetwork();
        await beacon.link('byteutils', lib.address);
        this.contract = await beacon.new();
    });

    // test cases
    it('new voter can register successfully', async function () {
        let res = await this.contract.registerVoter(proof.inputs);
        expect(res.receipt.status).to.be.equal(true);
    });

    it('already registered voter cannot vote', async function () {
        await this.contract.registerVoter(proof.inputs);
        await catchRevert(this.contract.registerVoter(proof.inputs), 'already voted. reverting');
    })
});