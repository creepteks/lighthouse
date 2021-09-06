const { accounts, contract } = require('@openzeppelin/test-environment');
const catchRevert = require("./exceptions.js").catchRevert
const { expect } = require('chai');
const fs = require('fs');

const beacon = contract.fromArtifact('beacon');
const byteutils = contract.fromArtifact('byteutils');

describe('beacon issuance unit test', function (deployer, network) {
    const [owner, other] = accounts;
    // read the zkp proof
    const proof = JSON.parse(fs.readFileSync("../circuits/zokrates/proof.json"))

    beforeEach(async function () {
        var lib = await byteutils.new();
        await beacon.detectNetwork();
        await beacon.link('byteutils', lib.address);
        this.contract = await beacon.new(20);
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