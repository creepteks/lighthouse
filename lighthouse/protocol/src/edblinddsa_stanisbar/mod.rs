extern crate rand_core;
extern crate ed25519_dalek;

use rand_core::OsRng;
use ed25519_dalek::Keypair;
use ed25519_dalek::Signer;
use ed25519_dalek::Verifier;
use ed25519_dalek::Signature;
use ed25519_dalek::PublicKey;

pub fn simple_signature_test() {
    let mut csprng = OsRng{};
    let keypair: Keypair = Keypair::generate(&mut csprng);

    let message: &[u8] = b"This is a test of the tsunami alert system.";
    let signature: Signature = keypair.sign(message);

    assert!(keypair.verify(message, &signature).is_ok());
    
    let public_key: PublicKey = keypair.public;
    assert!(public_key.verify(message, &signature).is_ok());
}

extern crate curve25519_dalek;

use curve25519_dalek::constants;
use curve25519_dalek::scalar::Scalar;

use sha2::{Digest, Sha512};
use serde_json;


pub fn blind_signature_test() {
    let mut rng = OsRng{};
    // PHASE 01: signer side
    // create pub/sec keypair
    // TODO refactor this to a separate utility func
    let g = constants::ED25519_BASEPOINT_POINT;
    // permenant keypair
    let x = Scalar::random(&mut rng);
    let p = x * g;
    // ephemeral keypair
    let k = Scalar::random(&mut rng);
    let r = k * g;

    // PHASE 02: user side
    let a = Scalar::random(&mut rng);
    let b = Scalar::random(&mut rng);

    // create a SHA2-512 object
    // this type of hashing is coming from the example of scalar.rs
    let r_prime = r + (a * g) + (b * p);
    let h = Sha512::new()
        .chain(serde_json::to_string(&r_prime).unwrap())
        .chain(serde_json::to_string(&p).unwrap())
        .chain("my vote address commitment");
    let e_prime = Scalar::from_hash(h);
    let e = e_prime + b;

    // PHASE 03 server side
    let s = e * x + k;

    // PHASE 04 user side
    let s_prime = s + a;

    // VERIFICATION step
    let rhs = s_prime * g;
    let lhs = e_prime * p + r_prime;

    assert_eq!(rhs, lhs);
}