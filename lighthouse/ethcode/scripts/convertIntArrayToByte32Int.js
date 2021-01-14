function concat(arr) {
    var conc = []
    for (let i = 0; i < arr.length; i++) {
        const element = parseInt(arr[i]);
        conc.push(element)
    }
    console.log(conc)
    return conc
}

function convertToBitString(arr) {
    var str = ''
    for (let i = 0; i < arr.length; i++) {
        const element = arr[i];
        bit = element.toString(2)
        while(bit.length < 32) {
            bit = '0' + bit
        }
        str += bit
    }
    return str
}

function arrayCounter(bits) {
    console.log("read", bits.length, "bits")
    console.log(bits)
}

function string2Bin(str) {
    var result = [];
    for (var i = 0; i < str.length; i++) {
        result.push(parseInt(str[i].toString(), 2));
    }
    console.log("converted", str.length, "chars to binary");
    return result;
}  


function checkDivergenceOfTwoBitArrays(arr1, arr2) {
    for (let i = 0; i < arr1.length; i++) {
        const element = arr1[i];
        if (arr1[i] != arr2[i]) {
            console.log("diverged at index", i)
            return true
        }
    }
    console.log("2 bit arrays are equal")
    return false
}

function bitArrayToByteArray(bits) {
    var arr = []
    for (let index = 0; index < 32; index++) {
        var str = ''
        const slice = bits.slice(index * 8, 8 + index * 8)
        for (let i = 0; i < slice.length; i++) {
            str += slice[i].toString()
        }
        arr.push(parseInt(str, 2))
    }
    console.log(arr)
    return arr
}

function byteArrayToHex(arr) {
    hex = ''
    for (let i = 0; i < arr.length; i++) {
        const element = arr[i];
        hex += element.toString(16)
    }

    console.log(hex)
    return hex
}

var conc = concat(["3663108286","398046313","1647531929","2006957770","2363872401","3235013187","3137272298","406301144"])
var bits = convertToBitString(conc)
arrayCounter(bits)
checkDivergenceOfTwoBitArrays(bits, string2Bin(["1","1","0","1","1","0","1","0","0","1","0","1","0","1","1","0","1","0","0","1","1","0","0","0","1","0","1","1","1","1","1","0","0","0","0","1","0","1","1","1","1","0","1","1","1","0","0","1","1","0","1","1","0","1","0","0","0","1","1","0","1","0","0","1","0","1","1","0","0","0","1","0","0","0","1","1","0","0","1","1","0","1","0","1","0","1","1","1","1","0","0","1","1","0","0","1","0","1","1","1","0","1","1","1","1","0","0","1","1","1","1","1","1","0","1","1","1","1","1","0","1","1","0","0","1","0","1","0","1","0","0","0","1","1","0","0","1","1","1","0","0","1","0","1","1","1","0","1","0","1","0","0","1","0","0","1","0","0","0","1","1","1","0","0","0","0","0","0","1","1","0","1","0","0","1","0","0","1","1","0","0","0","1","0","0","1","0","0","0","0","1","1","1","0","1","1","1","0","1","0","1","1","1","1","1","1","1","0","1","1","1","1","1","0","0","1","1","1","1","0","1","0","1","0","0","0","0","1","1","0","0","0","0","0","1","1","0","1","1","1","1","0","1","0","1","0","0","1","1","1","0","1","1","0","0","0"]))
byteArr = bitArrayToByteArray(bits)
hex = byteArrayToHex(byteArr)