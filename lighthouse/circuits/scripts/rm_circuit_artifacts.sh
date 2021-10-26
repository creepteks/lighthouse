# remove circom build artifact
rm ./build/lighthouse*
rm ./build/eddsaVerifier*
# remove verification keys
rm ./build/verification_key.json
rm ./build/eddsaverification_key.json
# remove challenges and response used in trusted setup
rm ./build/challenge_phase2*
rm ./build/response_phase2*
