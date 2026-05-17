#!/bin/bash
# Start script for the actual Veea Lobster Trap binary proxy

set -e

echo "Starting Lobster Trap Proxy setup..."

if [ ! -d "lobster-trap" ]; then
    echo "Cloning lobster-trap repository..."
    # Replace with the actual Veea Lobster Trap repo URL from hackathon docs
    git clone https://github.com/veea-ai/lobster-trap || echo "Failed to clone. Continuing with simulation mode..."
    
    if [ -d "lobster-trap" ]; then
        cd lobster-trap
        echo "Building lobstertrap binary..."
        make build || true
        cd ..
    fi
fi

if [ -f "lobster-trap/lobstertrap" ]; then
    echo "Running Lobster Trap on port 8002..."
    export USE_LOBSTER_TRAP_BINARY="true"
    ./lobster-trap/lobstertrap serve \
        --policy configs/healthcare_policy.yaml \
        --backend http://localhost:8001 \
        --listen :8002 &
    echo "Lobster trap running in background."
else
    echo "Lobster Trap binary not found. ARGUS will fall back to its internal Python simulated engine."
    echo "Set USE_LOBSTER_TRAP_BINARY=false"
fi
