# Makefile for Canvas AI Orchestration Platform
# Provides convenient commands for Docker and Kubernetes operations

.PHONY: help dev prod build test clean logs health backup k8s-deploy k8s-dev k8s-staging k8s-prod k8s-status k8s-logs k8s-clean

# Default target
help: ## Show this help message
	@echo "Canvas AI Orchestration Platform - Commands"
	@echo "==========================================="
	@echo ""
	@echo "Docker Commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -v "k8s-" | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Kubernetes Commands:"
	@grep -E '^k8s-[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "For detailed Kubernetes help: make k8s-help"

# Development commands
dev: ## Start development environment
	@echo "🚀 Starting development environment..."
	@chmod +x docker/scripts/dev-start.sh
	@./docker/scripts/dev-start.sh

dev-build: ## Build development image
	@echo "🔨 Building development image..."
	@docker-compose --env-file .env.development build canvas-app

dev-logs: ## Show development logs
	@docker-compose --env-file .env.development logs -f canvas-app

dev-shell: ## Access development container shell
	@docker-compose --env-file .env.development exec canvas-app sh

dev-stop: ## Stop development environment
	@docker-compose --env-file .env.development down

# Production commands
prod: ## Deploy production environment
	@echo "🚀 Deploying production environment..."
	@chmod +x docker/scripts/prod-deploy.sh
	@./docker/scripts/prod-deploy.sh

prod-build: ## Build production image
	@echo "🔨 Building production image..."
	@docker-compose --env-file .env.production build canvas-app

prod-update: ## Update production deployment
	@echo "🔄 Updating production deployment..."
	@chmod +x docker/scripts/prod-update.sh
	@./docker/scripts/prod-update.sh

prod-logs: ## Show production logs
	@docker-compose --env-file .env.production logs -f canvas-app

prod-stop: ## Stop production environment
	@docker-compose --env-file .env.production down

# Testing commands
test: ## Run tests in container
	@echo "🧪 Running tests..."
	@docker-compose -f docker-compose.yml -f docker-compose.test.yml run --rm test

test-build: ## Build test image
	@docker-compose -f docker-compose.yml -f docker-compose.test.yml build test

test-e2e: ## Run end-to-end tests
	@echo "🎭 Running E2E tests..."
	@docker-compose -f docker-compose.yml -f docker-compose.test.yml run --rm e2e-test

# Utility commands
build: ## Build all images
	@echo "🔨 Building all images..."
	@docker-compose build

logs: ## Show logs for all services
	@docker-compose logs -f

health: ## Check health of all services
	@echo "🏥 Checking service health..."
	@chmod +x docker/scripts/health-check.sh
	@./docker/scripts/health-check.sh

backup: ## Create backup of all data
	@echo "💾 Creating backup..."
	@chmod +x docker/scripts/backup.sh
	@./docker/scripts/backup.sh

clean: ## Clean up Docker resources
	@echo "🧹 Cleaning up..."
	@chmod +x docker/scripts/cleanup.sh
	@./docker/scripts/cleanup.sh

# Database commands
db-reset: ## Reset database (development only)
	@echo "🗄️ Resetting database..."
	@docker-compose --env-file .env.development exec mongodb mongosh canvas_orchestration --eval "db.dropDatabase()"
	@echo "✅ Database reset completed"

db-seed: ## Seed database with sample data
	@echo "🌱 Seeding database..."
	@docker-compose --env-file .env.development --profile seeder up db-seeder

db-shell: ## Access MongoDB shell
	@docker-compose --env-file .env.development exec mongodb mongosh canvas_orchestration

redis-cli: ## Access Redis CLI
	@docker-compose --env-file .env.development exec redis redis-cli

# Monitoring commands
stats: ## Show Docker container stats
	@docker stats $(shell docker-compose ps -q)

ps: ## Show running containers
	@docker-compose ps

images: ## Show Docker images
	@docker images | grep -E "(canvas|mongo|redis|opensearch)"

# Network commands
network-inspect: ## Inspect Docker network
	@docker network inspect canvas_canvas-network

# Volume commands
volumes: ## Show Docker volumes
	@docker volume ls | grep canvas

volume-inspect: ## Inspect specific volume (usage: make volume-inspect VOLUME=mongodb_data)
	@docker volume inspect canvas_$(VOLUME)

# Security commands
security-scan: ## Run security scan on images
	@echo "🔒 Running security scan..."
	@command -v trivy >/dev/null 2>&1 || { echo "Trivy not installed. Install with: brew install trivy"; exit 1; }
	@trivy image canvas-orchestration-app:latest

# Quick start commands
quick-start: dev ## Quick start development environment (alias for dev)

quick-prod: prod ## Quick start production environment (alias for prod)

# Install commands
install-deps: ## Install system dependencies for Docker operations
	@echo "📦 Installing system dependencies..."
	@command -v docker >/dev/null 2>&1 || { echo "Docker not installed. Please install Docker first."; exit 1; }
	@command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose not installed. Please install Docker Compose first."; exit 1; }
	@echo "✅ Dependencies verified"

# Environment setup
setup-env: ## Setup environment files
	@echo "⚙️ Setting up environment files..."
	@[ -f .env ] || cp .env.example .env
	@[ -f .env.development ] || cp .env.example .env.development
	@echo "✅ Environment files setup completed"
	@echo "📝 Please edit .env files with your actual values"

# =====================================
# Kubernetes Commands
# =====================================

# Kubernetes deployment commands
k8s-deploy: ## Deploy to Kubernetes using deployment script
	@echo "🚀 Deploying to Kubernetes..."
	@chmod +x k8s/scripts/deploy.sh
	@./k8s/scripts/deploy.sh $(ENV) deploy

k8s-dev: ## Deploy to development Kubernetes environment
	@echo "🛠️ Deploying to development environment..."
	@chmod +x k8s/scripts/deploy.sh
	@./k8s/scripts/deploy.sh development deploy

k8s-staging: ## Deploy to staging Kubernetes environment
	@echo "🎭 Deploying to staging environment..."
	@chmod +x k8s/scripts/deploy.sh
	@./k8s/scripts/deploy.sh staging deploy

k8s-prod: ## Deploy to production Kubernetes environment
	@echo "🏭 Deploying to production environment..."
	@chmod +x k8s/scripts/deploy.sh
	@./k8s/scripts/deploy.sh production deploy

# Kubernetes management commands
k8s-status: ## Show Kubernetes deployment status
	@echo "📊 Kubernetes deployment status..."
	@chmod +x k8s/scripts/deploy.sh
	@./k8s/scripts/deploy.sh $(ENV) status

k8s-dev-status: ## Show development environment status
	@echo "📊 Development environment status..."
	@chmod +x k8s/scripts/deploy.sh
	@./k8s/scripts/deploy.sh development status

k8s-staging-status: ## Show staging environment status
	@echo "📊 Staging environment status..."
	@chmod +x k8s/scripts/deploy.sh
	@./k8s/scripts/deploy.sh staging status

k8s-prod-status: ## Show production environment status
	@echo "📊 Production environment status..."
	@chmod +x k8s/scripts/deploy.sh
	@./k8s/scripts/deploy.sh production status

# Kubernetes utility commands
k8s-logs: ## Show Kubernetes application logs
	@echo "📋 Fetching Kubernetes logs..."
	@kubectl logs -f deployment/canvas-app -n $(shell [ "$(ENV)" = "development" ] && echo "canvas-orchestration-dev" || [ "$(ENV)" = "staging" ] && echo "canvas-orchestration-staging" || echo "canvas-orchestration")

k8s-logs-dev: ## Show development environment logs
	@kubectl logs -f deployment/canvas-app -n canvas-orchestration-dev

k8s-logs-staging: ## Show staging environment logs
	@kubectl logs -f deployment/canvas-app -n canvas-orchestration-staging

k8s-logs-prod: ## Show production environment logs
	@kubectl logs -f deployment/canvas-app -n canvas-orchestration

k8s-shell: ## Access application pod shell in Kubernetes
	@echo "🐚 Accessing pod shell..."
	@kubectl exec -it deployment/canvas-app -n $(shell [ "$(ENV)" = "development" ] && echo "canvas-orchestration-dev" || [ "$(ENV)" = "staging" ] && echo "canvas-orchestration-staging" || echo "canvas-orchestration") -- sh

k8s-health: ## Check Kubernetes deployment health
	@echo "🏥 Checking Kubernetes deployment health..."
	@chmod +x k8s/scripts/deploy.sh
	@./k8s/scripts/deploy.sh $(ENV) health

k8s-rollback: ## Rollback Kubernetes deployment
	@echo "🔄 Rolling back deployment..."
	@chmod +x k8s/scripts/deploy.sh
	@./k8s/scripts/deploy.sh $(ENV) rollback

k8s-scale: ## Scale Kubernetes deployment (usage: make k8s-scale REPLICAS=5)
	@echo "📈 Scaling deployment to $(REPLICAS) replicas..."
	@kubectl scale deployment canvas-app --replicas=$(REPLICAS) -n $(shell [ "$(ENV)" = "development" ] && echo "canvas-orchestration-dev" || [ "$(ENV)" = "staging" ] && echo "canvas-orchestration-staging" || echo "canvas-orchestration")

# Kubernetes cleanup commands
k8s-clean: ## Clean up Kubernetes resources
	@echo "🧹 Cleaning up Kubernetes resources..."
	@chmod +x k8s/scripts/deploy.sh
	@./k8s/scripts/deploy.sh $(ENV) delete

k8s-clean-dev: ## Clean up development environment
	@echo "🧹 Cleaning up development environment..."
	@chmod +x k8s/scripts/deploy.sh
	@./k8s/scripts/deploy.sh development delete

k8s-clean-staging: ## Clean up staging environment
	@echo "🧹 Cleaning up staging environment..."
	@chmod +x k8s/scripts/deploy.sh
	@./k8s/scripts/deploy.sh staging delete

k8s-clean-prod: ## Clean up production environment (DANGEROUS!)
	@echo "⚠️  WARNING: This will delete production environment!"
	@echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	@chmod +x k8s/scripts/deploy.sh
	@./k8s/scripts/deploy.sh production delete

# Kubernetes monitoring commands
k8s-top: ## Show Kubernetes resource usage
	@echo "📊 Kubernetes resource usage..."
	@kubectl top nodes
	@echo ""
	@kubectl top pods -n $(shell [ "$(ENV)" = "development" ] && echo "canvas-orchestration-dev" || [ "$(ENV)" = "staging" ] && echo "canvas-orchestration-staging" || echo "canvas-orchestration")

k8s-events: ## Show Kubernetes events
	@echo "📋 Recent Kubernetes events..."
	@kubectl get events -n $(shell [ "$(ENV)" = "development" ] && echo "canvas-orchestration-dev" || [ "$(ENV)" = "staging" ] && echo "canvas-orchestration-staging" || echo "canvas-orchestration") --sort-by='.lastTimestamp'

k8s-describe: ## Describe Kubernetes resources
	@echo "📄 Kubernetes resource details..."
	@kubectl get all -n $(shell [ "$(ENV)" = "development" ] && echo "canvas-orchestration-dev" || [ "$(ENV)" = "staging" ] && echo "canvas-orchestration-staging" || echo "canvas-orchestration")

# Kubernetes setup commands
k8s-setup: ## Setup Kubernetes cluster prerequisites
	@echo "⚙️ Setting up Kubernetes cluster..."
	@chmod +x k8s/scripts/setup-cluster.sh
	@./k8s/scripts/setup-cluster.sh

k8s-deps: ## Install Kubernetes dependencies
	@echo "📦 Installing Kubernetes dependencies..."
	@command -v kubectl >/dev/null 2>&1 || { echo "kubectl not installed. Please install kubectl first."; exit 1; }
	@command -v helm >/dev/null 2>&1 || { echo "helm not installed. Please install helm first."; exit 1; }
	@command -v kustomize >/dev/null 2>&1 || { echo "kustomize not installed. Please install kustomize first."; exit 1; }
	@echo "✅ Kubernetes dependencies verified"

# Kubernetes database commands
k8s-db-shell: ## Access MongoDB shell in Kubernetes
	@echo "🗄️ Accessing MongoDB shell..."
	@kubectl exec -it statefulset/canvas-mongodb -n $(shell [ "$(ENV)" = "development" ] && echo "canvas-orchestration-dev" || [ "$(ENV)" = "staging" ] && echo "canvas-orchestration-staging" || echo "canvas-orchestration") -- mongosh

k8s-redis-cli: ## Access Redis CLI in Kubernetes
	@echo "🗄️ Accessing Redis CLI..."
	@kubectl exec -it statefulset/canvas-redis -n $(shell [ "$(ENV)" = "development" ] && echo "canvas-orchestration-dev" || [ "$(ENV)" = "staging" ] && echo "canvas-orchestration-staging" || echo "canvas-orchestration") -- redis-cli

# Kubernetes backup commands
k8s-backup: ## Create backup of Kubernetes resources
	@echo "💾 Creating Kubernetes backup..."
	@mkdir -p backups/$(shell date +%Y%m%d_%H%M%S)
	@kubectl get all,configmap,secret,pvc -n $(shell [ "$(ENV)" = "development" ] && echo "canvas-orchestration-dev" || [ "$(ENV)" = "staging" ] && echo "canvas-orchestration-staging" || echo "canvas-orchestration") -o yaml > backups/$(shell date +%Y%m%d_%H%M%S)/k8s-backup.yaml
	@echo "✅ Backup created in backups/ directory"

# Help for Kubernetes commands
k8s-help: ## Show Kubernetes commands help
	@echo "Canvas AI Orchestration Platform - Kubernetes Commands"
	@echo "====================================================="
	@echo ""
	@echo "Deployment Commands:"
	@echo "  k8s-dev          Deploy to development environment"
	@echo "  k8s-staging      Deploy to staging environment"
	@echo "  k8s-prod         Deploy to production environment"
	@echo ""
	@echo "Management Commands:"
	@echo "  k8s-status       Show deployment status (ENV=dev|staging|prod)"
	@echo "  k8s-logs         Show application logs (ENV=dev|staging|prod)"
	@echo "  k8s-health       Check deployment health (ENV=dev|staging|prod)"
	@echo "  k8s-rollback     Rollback deployment (ENV=dev|staging|prod)"
	@echo "  k8s-scale        Scale deployment (ENV=dev|staging|prod REPLICAS=N)"
	@echo ""
	@echo "Utility Commands:"
	@echo "  k8s-shell        Access pod shell (ENV=dev|staging|prod)"
	@echo "  k8s-db-shell     Access MongoDB shell (ENV=dev|staging|prod)"
	@echo "  k8s-redis-cli    Access Redis CLI (ENV=dev|staging|prod)"
	@echo ""
	@echo "Monitoring Commands:"
	@echo "  k8s-top          Show resource usage (ENV=dev|staging|prod)"
	@echo "  k8s-events       Show recent events (ENV=dev|staging|prod)"
	@echo "  k8s-describe     Describe all resources (ENV=dev|staging|prod)"
	@echo ""
	@echo "Examples:"
	@echo "  make k8s-dev                    # Deploy to development"
	@echo "  make k8s-logs ENV=staging       # Show staging logs"
	@echo "  make k8s-scale ENV=prod REPLICAS=10  # Scale production to 10 replicas"