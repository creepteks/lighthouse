// extern crate bn;
extern crate rand_0_3;
extern crate num;
extern crate ark_bn254;

// use ark_bn254::{G1Affine, Fq, Bn254};
use bn::*;

use num::bigint:: {BigInt, ToBigInt, RandBigInt, Sign};
use num::pow;

pub fn schnorr_id_sim_bn128(){
    let rng = &mut rand_0_3::thread_rng();
    let rng8 = &mut rand_0_8::thread_rng();

    // Round 0: Setup
    // Generate private key
    let alice_sk = Fr::random(rng);
    // Generate public keys in G1 
    let alice_pk = G1::one() * alice_sk;

    // Round 1: Alice chose a random number and publish a commitment
    let v_secret = Fr::random(rng);
    let v_pub = G1::one() * v_secret;
    
    // Round 2: bob sends challenge
    let lowest = 0.to_bigint().unwrap();
    let base = 2_i32.to_bigint().unwrap();
    let highest = pow(base, 160);
    let c_raw = rng8.gen_bigint_range(&lowest, &highest);
    let c = Fr::from_str(&c_raw.to_string()).unwrap();

    // Round 3 : alice create proof of knowledge
    let r = v_secret - alice_sk * c;

    // VERIFICATION
    let rhs = v_pub;
    let lhs = G1::one() * r + alice_pk * c;

    if rhs == lhs {
        println!("tada")
    } 
    else {
        println!("no tada")
    }

}

extern crate rustc_serialize;
use rustc_serialize::{json};

use sha3::{Digest, Sha3_256};
use sha2::{ Sha256};



pub fn schnorr_sig_nizk_bn128() {
    let rng = &mut rand_0_3::thread_rng();
    let rng8 = &mut rand_0_8::thread_rng();

    // Round 0: Setup
    // Generate private key
    let alice_sk = Fr::random(rng);
    // Generate public keys in G1 
    let alice_pk = G1::one() * alice_sk;

    // Round 1: Alice chose a random number and publish a commitment
    let v_secret = Fr::random(rng);
    let v_pub = G1::one() * v_secret;
    
    // // Round 2: alice computes challenge on her own
    let mut sha3 = sha3::Sha3_256::new()
    .chain(json::encode(&G1::one()).unwrap())
    .chain(json::encode(&v_pub).unwrap())
    .chain(json::encode(&alice_pk).unwrap())
    .chain(json::encode(b"resistance").unwrap());

    // read hash digest
    let mut output = [0u8; 32];
    output.copy_from_slice(&sha3.finalize());
    let cc = BigInt::from_radix_be(Sign::NoSign, &output, 16).unwrap();
    let cc_str = format!("{:?}", cc);
    println!("{}", cc_str);
    let c = Fr::from_str(&cc_str).unwrap();

    // Round 3 : alice create proof of knowledge
    let r = v_secret - alice_sk * c;

    // VERIFICATION
    let rhs = v_pub;
    let lhs = G1::one() * r + alice_pk * c;

    if rhs == lhs {
        println!("tada")
    } 
    else {
        println!("no tada")
    }
}