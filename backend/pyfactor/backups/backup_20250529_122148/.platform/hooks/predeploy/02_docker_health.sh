#!/bin/bash
# Docker health check and cleanup script

echo "Performing Docker health checks and cleanup..."

# Stop any hanging containers gracefully
echo "Checking for stuck containers..."
STUCK_CONTAINERS=$(docker ps -q -f status=running -f status=restarting)
if [ ! -z "$STUCK_CONTAINERS" ]; then
    echo "Found stuck containers, stopping gracefully..."
    docker stop -t 30 $STUCK_CONTAINERS || true
fi

# Clean up stopped containers
echo "Cleaning up stopped containers..."
docker container prune -f || true

# Clean up unused images (keep last 3)
echo "Cleaning up old images..."
docker image ls -q | tail -n +4 | xargs -r docker image rm -f || true

# Ensure Docker daemon is healthy
echo "Checking Docker daemon health..."
if ! docker info &>/dev/null; then
    echo "Docker daemon not responding, restarting..."
    sudo systemctl restart docker
    sleep 5
fi

echo "✓ Docker health check completed"
