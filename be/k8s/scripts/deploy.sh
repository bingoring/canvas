#!/bin/bash

# Canvas Orchestration Kubernetes Deployment Script
# Usage: ./deploy.sh [environment] [action]
# Environment: development, staging, production
# Action: deploy, rollback, delete, status

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$K8S_DIR")"

# Default values
ENVIRONMENT=${1:-development}
ACTION=${2:-deploy}
IMAGE_TAG=${IMAGE_TAG:-latest}
NAMESPACE="canvas-orchestration"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Validate environment
validate_environment() {
    case $ENVIRONMENT in
        development|staging|production)
            log "Environment: $ENVIRONMENT"
            ;;
        *)
            error "Invalid environment: $ENVIRONMENT. Must be development, staging, or production"
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed"
    fi

    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        error "helm is not installed"
    fi

    # Check if kustomize is installed
    if ! command -v kustomize &> /dev/null; then
        error "kustomize is not installed"
    fi

    # Check kubernetes connection
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
    fi

    success "Prerequisites check passed"
}

# Set namespace based on environment
set_namespace() {
    case $ENVIRONMENT in
        development)
            NAMESPACE="canvas-orchestration-dev"
            ;;
        staging)
            NAMESPACE="canvas-orchestration-staging"
            ;;
        production)
            NAMESPACE="canvas-orchestration"
            ;;
    esac
    log "Using namespace: $NAMESPACE"
}

# Create namespace if it doesn't exist
create_namespace() {
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log "Creating namespace: $NAMESPACE"
        kubectl create namespace "$NAMESPACE"
        kubectl label namespace "$NAMESPACE" environment="$ENVIRONMENT"
    else
        log "Namespace $NAMESPACE already exists"
    fi
}

# Deploy using Kustomize (for dev/staging)
deploy_kustomize() {
    log "Deploying using Kustomize for $ENVIRONMENT environment..."

    OVERLAY_DIR="$K8S_DIR/overlays/$ENVIRONMENT"

    if [ ! -d "$OVERLAY_DIR" ]; then
        error "Overlay directory not found: $OVERLAY_DIR"
    fi

    # Update image tag
    cd "$OVERLAY_DIR"
    kustomize edit set image "canvas-orchestration=canvas-orchestration:$IMAGE_TAG"

    # Apply resources
    log "Applying Kubernetes resources..."
    kustomize build . | kubectl apply -f -

    # Wait for deployment
    log "Waiting for deployment to complete..."
    kubectl rollout status deployment/canvas-app -n "$NAMESPACE" --timeout=600s

    success "Deployment completed successfully"
}

# Deploy using Helm (for production)
deploy_helm() {
    log "Deploying using Helm for production environment..."

    HELM_CHART="$K8S_DIR/helm/canvas-orchestration"
    VALUES_FILE="$HELM_CHART/values-prod.yaml"

    if [ ! -f "$VALUES_FILE" ]; then
        warn "Production values file not found, using default values"
        VALUES_FILE="$HELM_CHART/values.yaml"
    fi

    # Install/upgrade with Helm
    helm upgrade --install canvas-orchestration "$HELM_CHART" \
        --namespace "$NAMESPACE" \
        --create-namespace \
        --set app.image.tag="$IMAGE_TAG" \
        --values "$VALUES_FILE" \
        --wait \
        --timeout=600s

    success "Helm deployment completed successfully"
}

# Deploy function
deploy() {
    log "Starting deployment for $ENVIRONMENT environment..."

    create_namespace

    case $ENVIRONMENT in
        development|staging)
            deploy_kustomize
            ;;
        production)
            deploy_helm
            ;;
    esac

    # Show deployment status
    show_status
}

# Rollback function
rollback() {
    log "Rolling back deployment in $ENVIRONMENT environment..."

    case $ENVIRONMENT in
        development|staging)
            kubectl rollout undo deployment/canvas-app -n "$NAMESPACE"
            kubectl rollout status deployment/canvas-app -n "$NAMESPACE" --timeout=300s
            ;;
        production)
            helm rollback canvas-orchestration -n "$NAMESPACE"
            ;;
    esac

    success "Rollback completed successfully"
}

# Delete function
delete() {
    warn "This will delete all resources in namespace: $NAMESPACE"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        case $ENVIRONMENT in
            development|staging)
                OVERLAY_DIR="$K8S_DIR/overlays/$ENVIRONMENT"
                cd "$OVERLAY_DIR"
                kustomize build . | kubectl delete -f -
                ;;
            production)
                helm uninstall canvas-orchestration -n "$NAMESPACE"
                ;;
        esac

        # Delete namespace
        kubectl delete namespace "$NAMESPACE" --ignore-not-found=true
        success "Resources deleted successfully"
    else
        log "Delete operation cancelled"
    fi
}

# Show status function
show_status() {
    log "Deployment status for $ENVIRONMENT environment:"
    echo

    # Show pods
    echo "Pods:"
    kubectl get pods -n "$NAMESPACE" -o wide
    echo

    # Show services
    echo "Services:"
    kubectl get services -n "$NAMESPACE"
    echo

    # Show ingress
    echo "Ingress:"
    kubectl get ingress -n "$NAMESPACE" 2>/dev/null || echo "No ingress found"
    echo

    # Show persistent volumes
    echo "Persistent Volume Claims:"
    kubectl get pvc -n "$NAMESPACE"
    echo

    # Show HPA status
    echo "Horizontal Pod Autoscalers:"
    kubectl get hpa -n "$NAMESPACE" 2>/dev/null || echo "No HPA found"
}

# Health check function
health_check() {
    log "Performing health check..."

    # Wait for pods to be ready
    kubectl wait --for=condition=ready pod -l app=canvas-app -n "$NAMESPACE" --timeout=300s

    # Get service endpoint
    SERVICE_IP=$(kubectl get service canvas-app-service -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}')

    # Perform health check using a temporary pod
    kubectl run health-check-temp --image=curlimages/curl --rm -i --restart=Never -n "$NAMESPACE" -- \
        curl -f "http://$SERVICE_IP/health" || error "Health check failed"

    success "Health check passed"
}

# Usage function
usage() {
    cat << EOF
Usage: $0 [environment] [action]

Environments:
  development    Deploy to development environment
  staging        Deploy to staging environment
  production     Deploy to production environment

Actions:
  deploy         Deploy the application (default)
  rollback       Rollback to previous deployment
  delete         Delete all resources
  status         Show deployment status
  health         Perform health check

Environment Variables:
  IMAGE_TAG      Docker image tag to deploy (default: latest)

Examples:
  $0 development deploy
  $0 production rollback
  IMAGE_TAG=v1.2.3 $0 staging deploy
EOF
}

# Main execution
main() {
    if [ $# -eq 0 ] || [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
        usage
        exit 0
    fi

    validate_environment
    check_prerequisites
    set_namespace

    case $ACTION in
        deploy)
            deploy
            health_check
            ;;
        rollback)
            rollback
            ;;
        delete)
            delete
            ;;
        status)
            show_status
            ;;
        health)
            health_check
            ;;
        *)
            error "Invalid action: $ACTION. Use deploy, rollback, delete, status, or health"
            ;;
    esac
}

# Run main function
main "$@"