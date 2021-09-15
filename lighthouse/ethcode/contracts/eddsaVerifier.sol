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
            [14281613179077299491687917758324824713577827597362934474704553125917019066384,
             15228947731599578741159182954321445546067875850940728898179056946600017911514],
            [12493223812545022666133902362638860954665538795489882476926601986970392444364,
             13609745165315706494926334956592415755192191748581072131217083184687925792553]
        );
        vk.IC = new Pairing.G1Point[](8);
        
        vk.IC[0] = Pairing.G1Point( 
            16329492445940450340642901680848721337572357683926986693637678439191008629408,
            5426405411891257339514969817988488092988607275510580069984409334136342951885
        );                                      
        
        vk.IC[1] = Pairing.G1Point( 
            5997249991351331409046634160116692734378090013118301054144093911033894832910,
            8748241104939616685558875517710111660054499033139313154248313796818839465040
        );                                      
        
        vk.IC[2] = Pairing.G1Point( 
            3163103547996426920028189248461596479227996401795141494738239979630864709276,
            5901539481678769062906052336492852075428806621272276950563827129599928375720
        );                                      
        
        vk.IC[3] = Pairing.G1Point( 
            10809812611912290448910002813314333933901163084656383261853490089295986833016,
            18281926890993806810590221150059622286570053308135777000428419567320081619376
        );                                      
        
        vk.IC[4] = Pairing.G1Point( 
            10861608297015451423227045996791421579207352172593936316560627723196749764749,
            14740278313396148072351122925466201340131969209500903925636048487572217482584
        );                                      
        
        vk.IC[5] = Pairing.G1Point( 
            1063178028560453569054569648816157770918840439829496690560599234750887418742,
            18675462284407265393722664363359097123683696535752745862959340136331834782568
        );                                      
        
        vk.IC[6] = Pairing.G1Point( 
            18981367299770610087285411009569519101784944362546709463787726883426562609749,
            18498595900122530514373736414186823664327570512281744278922235586900746739544
        );                                      
        
        vk.IC[7] = Pairing.G1Point( 
            3968585703229162705298481997425904690495068364314605568588742410691612954375,
            16476381356790008032924309866082276962477673746554375729815718307710783067610
        );                                      
        
    }
    /// @return r  bool true if proof is valid
    function verifyEddsaProof(
            uint[2] memory a,
            uint[2][2] memory b,
            uint[2] memory c,
            uint[7] memory input
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
