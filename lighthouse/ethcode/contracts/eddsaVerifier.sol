//
// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// 2019 OKIMS
//      ported to solidity 0.6
//      fixed linter warnings
//      added requiere error messages
//
//
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.11;
import "./lighthouseVerifier.sol";
contract Verifier is LighthouseVerifier{
    function eddsaVerifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.alfa1 = Pairing.G1Point(
            9174716208775354538826014729452063775317890986763841049404153188663102423424,
            16243803528191381215430608400037602221653489795482651152156623344096352865000
        );

        vk.beta2 = Pairing.G2Point(
            [18818444694234999470439338977396513295657667537594094960260276747503857235182,
             13126986945000665815592158566399639123321475128266731032549312641276529021207],
            [8918466784232268698729964652399143412326546615638596589439773648614438820627,
             7470072166569500944819214384224481467986450946459642246419564298681923558233]
        );
        vk.gamma2 = Pairing.G2Point(
            [11559732032986387107991004021392285783925812861821192530917403151452391805634,
             10857046999023057135944570762232829481370756359578518086990519993285655852781],
            [4082367875863433681332203403145435568316851327593401208105741076214120093531,
             8495653923123431417604973247489272438418190587263600148770280649306958101930]
        );
        vk.delta2 = Pairing.G2Point(
            [10190431459105262395477341131505514182074376301416241479856131031236830768995,
             11730739071941030050480509463284050907693765529778935124710851237841702266264],
            [17023869925002179569677200833389520268398785546300455953724517185667368951963,
             16388181290257916014890640882970018292483391770155933732529007645649289726893]
        );
        vk.IC = new Pairing.G1Point[](7);
        
        vk.IC[0] = Pairing.G1Point( 
            20251442330064940540324944021624673975216685705651000865883372726052558272024,
            14345723076712346702907665803284800737863598540266643528333750064217053433972
        );                                      
        
        vk.IC[1] = Pairing.G1Point( 
            10057473928475817450550970732955194114612186148899121931454235761382467992942,
            16633368357856358090757219775032287198993509207180640660227118393922274245276
        );                                      
        
        vk.IC[2] = Pairing.G1Point( 
            7176723442139538992725958844262649018553445232422211285426631745391687243259,
            7714322986261523008276003740717489960719056987621184859408146870085147961149
        );                                      
        
        vk.IC[3] = Pairing.G1Point( 
            5190872078362463721482561037929623545946106289163631456613239828318983388490,
            2220759466758000501713299135756039854212367709093397155454190628913410237401
        );                                      
        
        vk.IC[4] = Pairing.G1Point( 
            15796452891140016965411981146257100835232758146520134500223508628787562221427,
            14867431758532486608289705607353009167663804625228609556750454871825238626040
        );                                      
        
        vk.IC[5] = Pairing.G1Point( 
            20116807643400475685392802774276891006818909211768762213952055739531265733542,
            14017605387404680890240241543161754965020767038143259306496636154363507852790
        );                                      
        
        vk.IC[6] = Pairing.G1Point( 
            10727269674539485599796834926897167046662311245847113069983686212426119516379,
            10785878193785464113687380862777449882553388647823262393896261186064938346103
        );                                      
        
    }
    /// @return r  bool true if proof is valid
    function verifyEddsaProof(
            uint[2] memory a,
            uint[2][2] memory b,
            uint[2] memory c,
            uint[6] memory input
        ) public view returns (bool r) {
        Proof memory proof;
        proof.A = Pairing.G1Point(a[0], a[1]);
        proof.B = Pairing.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
        proof.C = Pairing.G1Point(c[0], c[1]);
        uint[] memory inputValues = new uint[](input.length);
        for(uint i = 0; i < input.length; i++){
            inputValues[i] = input[i];
        }
        if (verify(eddsaVerifyingKey(), inputValues, proof) == 0) {
            return true;
        } else {
            return false;
        }
    }
}
