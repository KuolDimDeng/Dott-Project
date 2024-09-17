#!/bin/bash

# Detect architecture
ARCH=$(uname -m)

if [ "$ARCH" = "x86_64" ] || [ "$ARCH" = "arm64" ]; then
    echo "Running on $ARCH architecture"
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        echo "Docker is not running. Please start Docker and try again."
        exit 1
    fi

    # Build and run Docker containers
    docker-compose up --build

else
    echo "Unknown architecture"
    exit 1
fi