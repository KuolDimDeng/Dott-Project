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

    # Navigate to the directory containing docker-compose.yml
    cd /Users/kuoldeng/projectx

    # Check if docker-compose.yml exists
    if [ ! -f "docker-compose.yml" ]; then
        echo "docker-compose.yml not found in the current directory."
        exit 1
    fi

    # Remove old containers and volumes
    echo "Removing old containers and volumes..."
    docker compose down -v

    # Build and run Docker containers
    if [ "$1" == "--detach" ] || [ "$1" == "-d" ]; then
        echo "Building and starting containers in detached mode..."
        docker compose up --build -d
    else
        echo "Building and starting containers..."
        docker compose up --build
    fi
else
    echo "Unknown architecture"
    exit 1
fi