mod edblinddsa_stanisbar;
mod nizk;

fn main() {
    // edblinddsa_stanisbar::simple_signature_test();
    // edblinddsa_stanisbar::blind_signature_test();

    nizk::schnorr_id_sim_bn128();
    // nizk::schnorr_sig_nizk_bn128();
}

