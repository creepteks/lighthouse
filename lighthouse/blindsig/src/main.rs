extern crate rand_core;
extern crate ed25519_dalek;

use rand_core::OsRng;
use ed25519_dalek::Keypair;
use ed25519_dalek::Signer;
use ed25519_dalek::Verifier;
use ed25519_dalek::Signature;
use ed25519_dalek::PublicKey;


fn main() {
    let mut csprng = OsRng{};
    let keypair: Keypair = Keypair::generate(&mut csprng);

    let message: &[u8] = b"This is a test of the tsunami alert system.";
    let signature: Signature = keypair.sign(message);

    assert!(keypair.verify(message, &signature).is_ok());
    
    let public_key: PublicKey = keypair.public;
    assert!(public_key.verify(message, &signature).is_ok());
}
