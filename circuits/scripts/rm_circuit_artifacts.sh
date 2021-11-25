cd "$(dirname "$0")"
mkdir -p ../build
cd ../build

# remove circom build artifact
rm ./lighthouse*
# remove verification keys
rm ./verification_key.json
# remove challenges and response used in trusted setup
rm ./challenge_phase2*
rm ./response_phase2*
