# Devcontainer Configuration

This devcontainer is configured for RepoMind development with Docker support.

## Features

- **Node.js 20** (LTS) with npm
- **Docker CLI** and **Docker Compose** installed
- **Git** and **GitHub CLI** pre-installed
- **VS Code Extensions** for Next.js/TypeScript development

## Docker Configuration

The devcontainer is configured to **connect to the host Docker daemon** by default. This means:

- `docker build` and `docker push` commands will use your host's Docker daemon
- Images built will be available on your host machine
- You can use `docker-compose` to manage services

### Using Host Docker (Default)

The devcontainer is configured to use the host Docker daemon by default. Simply run:

```bash
docker ps
docker build -t myimage .
docker push myimage
```

### Switching to Docker-in-Docker

If you need isolated Docker (Docker-in-Docker) instead of using the host daemon:

1. Edit `.devcontainer/devcontainer.json`
2. Comment out or remove the `mounts` section
3. Comment out or remove the `DOCKER_HOST` environment variable
4. Rebuild the devcontainer

### Verifying Docker Access

After the container starts, verify Docker is working:

```bash
docker ps
docker info
docker-compose version
```

If you encounter permission issues, the setup script will attempt to fix them automatically. You may need to restart the container if permission changes are made.

## Development Workflow

1. **Start the devcontainer**: Open in VS Code and select "Reopen in Container"

2. **Install dependencies** (done automatically):
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build Docker images** (if needed):
   ```bash
   docker build -t repomind:latest .
   ```

5. **Use docker-compose** (if you have a docker-compose.yml):
   ```bash
   docker-compose up -d
   ```

## Environment Variables

Create a `.env.local` file in the project root with:

```env
GITHUB_TOKEN="your_github_token"
GEMINI_API_KEY="your_gemini_api_key"
KV_REST_API_READ_ONLY_TOKEN="your_kv_token"
KV_REST_API_TOKEN="your_kv_token"
KV_REST_API_URL="your_kv_url"
KV_URL="your_kv_url"
REDIS_URL="your_redis_url"
```

## Troubleshooting

### Docker Permission Denied

If you get permission errors with Docker:

1. The setup script should handle this automatically
2. If issues persist, you may need to adjust permissions on your host:
   ```bash
   # On host (not in container)
   sudo chmod 666 /var/run/docker.sock
   ```
3. Or add your user to the docker group on the host

### Docker Not Found

If Docker commands are not available:

1. Check that the docker-in-docker feature is installed
2. Verify the container has been rebuilt after configuration changes
3. Check the container logs for any installation errors

### Cannot Connect to Docker Daemon

If you see "Cannot connect to Docker daemon":

1. Verify the Docker socket is mounted (check `mounts` in devcontainer.json)
2. Check that `DOCKER_HOST` environment variable is set correctly
3. Verify the host Docker daemon is running

