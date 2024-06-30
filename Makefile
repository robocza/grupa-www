# Executables (local)
DOCKER_COMP = docker compose

# Docker containers
NODE_CONT   = $(DOCKER_COMP) exec --user 1000:1000 node

# Executables
NODE      = node

# Misc
.DEFAULT_GOAL = help

## —— 🌍 GR Makefile 🌍 —————————————————————————————————————————————————————————————————————————————————
help: ## Outputs this help screen
	@grep -E '(^[a-zA-Z0-9\./_-]+:.*?##.*$$)|(^##)' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}{printf "\033[32m%-30s\033[0m %s\n", $$1, $$2}' | sed -e 's/\[32m##/[33m/'

## —— Shortcuts ⏩ —————————————————————————————————————————————————————————————————————————————————————————————————————
sh: docker-sh ## Shortcut to docker-sh
start: docker-start ## Shortcut to docker-start
stop: docker-stop ## Shortcut to docker-stop

## —— Docker 🐳 ————————————————————————————————————————————————————————————————————————————————————————————————————————
docker-build: ## Builds the Docker images
	@$(DOCKER_COMP) build --pull #--progress=plain

docker-build-no-cache: ## Builds the Docker images without cache
	@$(DOCKER_COMP) build --pull --progress=plain --no-cache

docker-up: ## Start the docker hub in detached mode (no logs)
	@$(DOCKER_COMP) up --detach

docker-start: ## Start the containers
	@$(DOCKER_COMP) start

docker-stop: ## Stop the containers
	@$(DOCKER_COMP) stop

docker-restart: ## Restart the containers
	@$(DOCKER_COMP) restart

docker-down: ## Stop the docker hub
	@$(DOCKER_COMP) down --remove-orphans

docker-ps: ## Show current processes
	@$(DOCKER_COMP) ps

docker-logs: ## Show live logs
	@$(DOCKER_COMP) logs --tail=0 --follow

docker-sh: docker-sh-node ## Shortcut to docker-sh-node

docker-sh-node: ## Connect to the node container
	@$(NODE_CONT) fish

## —— Build ————————————————————————————————————————————————————————————————————————————————————————————————————————

git-sync: ## Sync git submodules
	git submodule update --remote --merge
	git add src/content/blog
	git commit -m "Update blog"
	git push
