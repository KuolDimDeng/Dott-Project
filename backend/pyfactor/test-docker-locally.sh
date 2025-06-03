#!/bin/bash

# Test Docker container locally
echo "Building Docker image..."
docker build -t pyfactor-test .

echo "Running Docker container..."
docker run -d -p 8000:8000 --name pyfactor-test-container pyfactor-test

echo "Waiting for container to start..."
sleep 10

echo "Checking container logs..."
docker logs pyfactor-test-container

echo "Testing health endpoint..."
curl -f http://localhost:8000/health/ || echo "Health check failed"

echo "Container status:"
docker ps -a | grep pyfactor-test

echo "To view full logs: docker logs pyfactor-test-container"
echo "To stop and remove: docker stop pyfactor-test-container && docker rm pyfactor-test-container" 