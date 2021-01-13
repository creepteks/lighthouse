// const cryptoJS = require("crypto-js" )

// function string2Bin(str) {
//     var result = [];
//     for (var i = 0; i < str.length; i++) {
//         result.push(parseInt(str[i].toString(), 2));
//     }
//     console.log("converted", str.length, "chars to binary");
//     return result;
// }  
// function bitToByteArray(bits) {
//     var bytes = [];
//     if (bits.length % 8 != 0)
//     {
//         console.error("the number of bits has to be dividable by 8");
//         return bytes;
//     }

//     for (let i = 0; i < bits.length / 8; i++) {
//         const element = bits[i];
//         for (let j = 0; j < 8; j++) {
//             const element = 8          
//         }
//     } 
// }
// function binToInteger(bin) {
//     var num = 1 >>> 256
//     var num = cryptoJS.lib.WordArray.create(0, 256)
//     console.log(num.toString())
//     for (let i = 0; i < bin.length; i++) {
//         const element = bin[i];
//         num = num | (element << (bin.length - i))
//     }
//     return num
// }

// function toHexString(byteArray) {
//     return Array.from(byteArray, function(byte) {
//       return ('0' + (byte & 0xFF).toString(16)).slice(-2);
//     }).join('')
//   }

// var bin = string2Bin(["1","1","0","1","1","0","1","0","0","1","0","1","0","1","1","0","1","0","0","1","1","0","0","0","1","0","1","1","1","1","1","0","0","0","0","1","0","1","1","1","1","0","1","1","1","0","0","1","1","0","1","1","0","1","0","0","0","1","1","0","1","0","0","1","0","1","1","0","0","0","1","0","0","0","1","1","0","0","1","1","0","1","0","1","0","1","1","1","1","0","0","1","1","0","0","1","0","1","1","1","0","1","1","1","1","0","0","1","1","1","1","1","1","0","1","1","1","1","1","0","1","1","0","0","1","0","1","0","1","0","0","0","1","1","0","0","1","1","1","0","0","1","0","1","1","1","0","1","0","1","0","0","1","0","0","1","0","0","0","1","1","1","0","0","0","0","0","0","1","1","0","1","0","0","1","0","0","1","1","0","0","0","1","0","0","1","0","0","0","0","1","1","1","0","1","1","1","0","1","0","1","1","1","1","1","1","1","0","1","1","1","1","1","0","0","1","1","1","1","0","1","0","1","0","0","0","0","1","1","0","0","0","0","0","1","1","0","1","1","1","1","0","1","0","1","0","0","1","1","1","0","1","1","0","0","0"])

// var preimage2 = cryptoJS.lib.WordArray.create(0x0, 512)
// var hash2 = cryptoJS.SHA256(preimage2)
// // console.log("0x" + hash2.toString(cryptoJS.enc.Hex))
// console.log(hash2.toString().toString(2))
