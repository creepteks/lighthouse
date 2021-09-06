// Copied from semaphore/semaphorejs/src/util/index.js

const snarkjs = require('snarkjs')
const assert = require('assert')

const bigInt = require('big-integer')

const unstringifyBigInts = (o) => {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return bigInt(o)
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts)
    } else if (typeof o == "object") {
        const res = {}
        for (let k in o) {
            res[k] = unstringifyBigInts(o[k])
        }
        return res
    } else {
        return o
    }
}

const writeUint32 = (h, val) => {
    h.dataView.setUint32(h.offset, val, true)
    h.offset += 4
}

const writeBigInt = (h, bi) => {
    for (let i=0; i<8; i++) {
        const v = bi.shiftRight(i*32).and(0xFFFFFFFF).toJSNumber()
        writeUint32(h, v)
    }
}

const calculateBuffLen = (witness) => {
    let size = 0

    // beta2, delta2
    size += witness.length * 32

    return size
}

const convertWitness = (witnessJson) => {
    const witness = unstringifyBigInts(witnessJson)
    const buffLen = calculateBuffLen(witness)

    const buff = new ArrayBuffer(buffLen)

    const h = {
        dataView: new DataView(buff),
        offset: 0
    }

    for (let i=0; i<witness.length; i++) {
        writeBigInt(h, witness[i]);
    }

    assert.equal(h.offset, buffLen);

    return Buffer.from(buff);
}

const buildGroth16 = require('websnark/src/bn128.js')

const prove = async (witness, provingKey) => {
    const groth16 = await buildGroth16()
    const p = await groth16.groth16GenProof(witness, provingKey);
    //groth16.terminate()
    return snarkjs.unstringifyBigInts(p)
}

const cutDownBits = (b, bits) => {
    let mask = snarkjs.bigInt(1)
    mask = mask.shl(bits).sub(snarkjs.bigInt(1))
    return b.and(mask)
}

const beBuff2int = (buff) => {
    let res = snarkjs.bigInt.zero
    for (let i=0; i<buff.length; i++) {
        const n = snarkjs.bigInt(buff[buff.length - i - 1])
        res = res.add(n.shl(i*8))
    }
    return res
}

module.exports = function() {
    return { convertWitness, prove, cutDownBits, beBuff2int }
}();