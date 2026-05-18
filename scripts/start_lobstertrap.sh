#!/bin/bash
# Start script for the actual Veea Lobster Trap binary
# Fetches from https://github.com/veeainc/lobstertrap

set -e

echo "Starting Lobster Trap Proxy setup..."

if [ ! -d "lobstertrap" ]; then
    echo "Cloning lobstertrap repository..."
    git clone https://github.com/veeainc/lobstertrap || {
        echo "Failed to clone. Binary must be built manually."
        exit 1
    }
    cd lobstertrap
    echo "Building lobstertrap binary..."
    make build
    cd ..
fi

BINARY="./lobstertrap/lobstertrap"
if [ ! -f "$BINARY" ]; then
    echo "Binary not found at $BINARY. Running make build..."
    (cd lobstertrap && make build)
fi

if [ -f "$BINARY" ]; then
    echo "Copying binary to lobster-trap/ for ARGUS discovery..."
    mkdir -p lobster-trap
    cp "$BINARY" lobster-trap/lobstertrap
    chmod +x lobster-trap/lobstertrap

    echo ""
    echo "=== Lobster Trap binary ready ==="
    echo "  Path: lobster-trap/lobstertrap"
    echo ""
    echo "Set USE_LOBSTER_TRAP_BINARY=true in .env to enable."
    echo ""
    echo "Quick test:"
    echo "  lobster-trap/lobstertrap inspect --policy configs/lobstertrap_policy.yaml \"test prompt\""
else
    echo "Lobster Trap binary not found. ARGUS will fall back to its internal Python simulated engine."
fi