docker_compose := "docker compose"
node_container := docker_compose + " exec --user 1000:1000 node"

# Lists the recipes
[private]
default:
    @just --list --unsorted

# —— Shortcuts ⏩ ——

# Shortcut to docker-sh
[group('shortcuts')]
sh: docker-sh

# Shortcut to docker-start
[group('shortcuts')]
start: docker-start

# Shortcut to docker-stop
[group('shortcuts')]
stop: docker-stop

# —— Docker 🐳 ——

# Builds the Docker images
[group('docker')]
docker-build:
    @{{docker_compose}} build --pull

# Builds the Docker images without cache
[group('docker')]
docker-build-no-cache:
    @{{docker_compose}} build --pull --progress=plain --no-cache

# Start the docker hub in detached mode (no logs)
[group('docker')]
docker-up:
    @{{docker_compose}} up --detach

# Start the containers
[group('docker')]
docker-start:
    @{{docker_compose}} start

# Stop the containers
[group('docker')]
docker-stop:
    @{{docker_compose}} stop

# Restart the containers
[group('docker')]
docker-restart:
    @{{docker_compose}} restart

# Stop the docker hub
[group('docker')]
docker-down:
    @{{docker_compose}} down --remove-orphans

# Show current processes
[group('docker')]
docker-ps:
    @{{docker_compose}} ps

# Show live logs
[group('docker')]
docker-logs:
    @{{docker_compose}} logs --tail=0 --follow

# Shortcut to docker-sh-node
[group('docker')]
docker-sh: docker-sh-node

# Connect to the node container
[group('docker')]
docker-sh-node:
    @{{node_container}} fish

# —— Build ——

# Pull git submodules changes
[group('build')]
git-submodule-pull:
    git submodule update --remote --merge
    git add src/content/blog

# Push git submodules changes
[group('build')]
git-submodule-push:
    git commit -m "Update blog"
    git push

# Pull and push git submodules changes
[group('build')]
git-submodule-sync: git-submodule-pull git-submodule-push

# Generate a self-signed cert for HTTPS on the dev server
[group('build')]
dev-cert:
    mkdir -p .docker/certs
    openssl req -x509 -newkey rsa:2048 -nodes -days 825 -subj "/CN=gr.local" \
        -addext "subjectAltName=DNS:gr.local,DNS:localhost,IP:127.0.0.1" \
        -keyout .docker/certs/dev-key.pem -out .docker/certs/dev-cert.pem

# Run the dev server (inside the node container)
[group('build')]
build-dev:
    npm run dev

# Build the site (inside the node container)
[group('build')]
build:
    npm run build
