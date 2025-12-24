#!/bin/bash
# Setup script for Docker access in devcontainer

set -e

echo "Setting up Docker access..."

# Try to add user to docker group if it exists
if getent group docker > /dev/null 2>&1; then
    echo "Adding user to docker group..."
    sudo usermod -aG docker $USER 2>/dev/null || true
fi

# Set permissions on Docker socket (host socket mounted at docker-host.sock)
if [ -S /var/run/docker-host.sock ]; then
    echo "Configuring Docker socket permissions..."
    sudo chmod 666 /var/run/docker-host.sock 2>/dev/null || true
    # Also try to change ownership if possible
    sudo chown root:docker /var/run/docker-host.sock 2>/dev/null || true
fi

# Verify Docker access
echo "Verifying Docker installation..."
if command -v docker &> /dev/null; then
    echo "Docker CLI found: $(docker --version)"
    
    # Test Docker connection
    if docker info > /dev/null 2>&1; then
        echo "✅ Docker is accessible and working!"
        docker info --format "Docker Host: {{.Name}}"
    else
        echo "⚠️  Docker CLI is installed but cannot connect to daemon."
        echo "   This is normal if using host Docker socket and permissions need adjustment."
    fi
else
    echo "⚠️  Docker CLI not found. The docker-in-docker feature should install it."
fi

# Verify docker-compose
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    echo "✅ Docker Compose is available"
else
    echo "⚠️  Docker Compose not found"
fi

echo "Docker setup complete!"

