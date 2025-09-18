#!/bin/bash

# Canvas Orchestration Kubernetes Cluster Setup Script
# This script sets up prerequisites for the Canvas Orchestration Platform

set -euo pipefail

# Configuration
CLUSTER_NAME=${CLUSTER_NAME:-canvas-cluster}
REGION=${AWS_REGION:-us-east-1}
NODE_GROUP_NAME=${NODE_GROUP_NAME:-canvas-nodes}
KUBERNETES_VERSION=${KUBERNETES_VERSION:-1.28}

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# Check if running on AWS
check_aws() {
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed"
    fi

    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
    fi

    success "AWS CLI configured correctly"
}

# Install required tools
install_tools() {
    log "Installing required tools..."

    # Install kubectl if not present
    if ! command -v kubectl &> /dev/null; then
        log "Installing kubectl..."
        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
        chmod +x kubectl
        sudo mv kubectl /usr/local/bin/
    fi

    # Install eksctl if not present
    if ! command -v eksctl &> /dev/null; then
        log "Installing eksctl..."
        curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
        sudo mv /tmp/eksctl /usr/local/bin/
    fi

    # Install helm if not present
    if ! command -v helm &> /dev/null; then
        log "Installing helm..."
        curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    fi

    # Install kustomize if not present
    if ! command -v kustomize &> /dev/null; then
        log "Installing kustomize..."
        curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
        sudo mv kustomize /usr/local/bin/
    fi

    success "All tools installed successfully"
}

# Create EKS cluster
create_eks_cluster() {
    log "Creating EKS cluster: $CLUSTER_NAME"

    # Check if cluster already exists
    if aws eks describe-cluster --name "$CLUSTER_NAME" --region "$REGION" &> /dev/null; then
        warn "Cluster $CLUSTER_NAME already exists"
        return 0
    fi

    # Create cluster configuration
    cat > cluster-config.yaml << EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: $CLUSTER_NAME
  region: $REGION
  version: "$KUBERNETES_VERSION"

# IAM configuration
iam:
  withOIDC: true
  serviceAccounts:
  - metadata:
      name: aws-load-balancer-controller
      namespace: kube-system
    wellKnownPolicies:
      awsLoadBalancerController: true
  - metadata:
      name: ebs-csi-controller-sa
      namespace: kube-system
    wellKnownPolicies:
      ebsCSIController: true
  - metadata:
      name: efs-csi-controller-sa
      namespace: kube-system
    wellKnownPolicies:
      efsCSIController: true

# VPC configuration
vpc:
  enableDnsHostnames: true
  enableDnsSupport: true
  cidr: "10.0.0.0/16"

# Node groups
nodeGroups:
- name: application-nodes
  instanceType: t3.large
  minSize: 3
  maxSize: 10
  desiredCapacity: 3
  volumeSize: 50
  volumeType: gp3
  labels:
    node-type: application
  tags:
    k8s.io/cluster-autoscaler/enabled: "true"
    k8s.io/cluster-autoscaler/$CLUSTER_NAME: "owned"

- name: database-nodes
  instanceType: r5.xlarge
  minSize: 3
  maxSize: 6
  desiredCapacity: 3
  volumeSize: 100
  volumeType: gp3
  labels:
    node-type: database
  taints:
    database: "true:NoSchedule"
  tags:
    k8s.io/cluster-autoscaler/enabled: "true"
    k8s.io/cluster-autoscaler/$CLUSTER_NAME: "owned"

# Add-ons
addons:
- name: vpc-cni
  version: latest
- name: coredns
  version: latest
- name: kube-proxy
  version: latest
- name: aws-ebs-csi-driver
  version: latest

# CloudWatch logging
cloudWatch:
  clusterLogging:
    enableTypes: ["api", "audit", "authenticator", "controllerManager", "scheduler"]
EOF

    # Create the cluster
    eksctl create cluster -f cluster-config.yaml

    # Update kubeconfig
    aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER_NAME"

    success "EKS cluster created successfully"
}

# Install essential add-ons
install_addons() {
    log "Installing essential add-ons..."

    # Add Helm repositories
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo add cert-manager https://charts.jetstack.io
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo update

    # Install NGINX Ingress Controller
    log "Installing NGINX Ingress Controller..."
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --create-namespace \
        --set controller.service.type=LoadBalancer \
        --set controller.metrics.enabled=true \
        --set controller.podAnnotations."prometheus\.io/scrape"="true" \
        --set controller.podAnnotations."prometheus\.io/port"="10254"

    # Install cert-manager
    log "Installing cert-manager..."
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.crds.yaml
    helm upgrade --install cert-manager cert-manager/cert-manager \
        --namespace cert-manager \
        --create-namespace \
        --version v1.13.0

    # Install AWS Load Balancer Controller
    log "Installing AWS Load Balancer Controller..."
    helm repo add eks https://aws.github.io/eks-charts
    helm repo update
    helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
        -n kube-system \
        --set clusterName="$CLUSTER_NAME" \
        --set serviceAccount.create=false \
        --set serviceAccount.name=aws-load-balancer-controller

    # Install cluster autoscaler
    log "Installing cluster autoscaler..."
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml
    kubectl patch deployment cluster-autoscaler -n kube-system -p '{"spec":{"template":{"metadata":{"annotations":{"cluster-autoscaler.kubernetes.io/safe-to-evict":"false"}}}}}'
    kubectl patch deployment cluster-autoscaler -n kube-system -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"cluster-autoscaler\",\"command\":[\"./cluster-autoscaler\",\"--v=4\",\"--stderrthreshold=info\",\"--cloud-provider=aws\",\"--skip-nodes-with-local-storage=false\",\"--expander=least-waste\",\"--node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/$CLUSTER_NAME\"]}]}}}}"

    # Install metrics server
    log "Installing metrics server..."
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

    success "Add-ons installed successfully"
}

# Setup storage classes
setup_storage() {
    log "Setting up storage classes..."

    # Create EBS storage class
    cat << EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: canvas-ssd-storage
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Retain
EOF

    # Create EFS storage class (for shared storage)
    EFS_ID=$(aws efs create-file-system --region "$REGION" --tags Key=Name,Value=canvas-shared-storage --query 'FileSystemId' --output text)

    cat << EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: canvas-shared-storage
provisioner: efs.csi.aws.com
parameters:
  provisioningMode: efs-utils
  fileSystemId: $EFS_ID
  directoryPerms: "0755"
volumeBindingMode: Immediate
allowVolumeExpansion: true
reclaimPolicy: Retain
EOF

    success "Storage classes configured successfully"
}

# Setup monitoring namespace
setup_monitoring() {
    log "Setting up monitoring namespace..."

    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    kubectl label namespace monitoring name=monitoring

    success "Monitoring namespace created"
}

# Display cluster information
show_cluster_info() {
    log "Cluster information:"
    echo
    echo "Cluster Name: $CLUSTER_NAME"
    echo "Region: $REGION"
    echo "Kubernetes Version: $KUBERNETES_VERSION"
    echo
    echo "Nodes:"
    kubectl get nodes -o wide
    echo
    echo "Namespaces:"
    kubectl get namespaces
    echo
    echo "Storage Classes:"
    kubectl get storageclass
    echo
    echo "Ingress Controller Service:"
    kubectl get service -n ingress-nginx
}

# Cleanup function
cleanup() {
    if [ -f cluster-config.yaml ]; then
        rm cluster-config.yaml
    fi
}

# Main execution
main() {
    log "Starting Canvas Orchestration cluster setup..."

    trap cleanup EXIT

    check_aws
    install_tools
    create_eks_cluster
    install_addons
    setup_storage
    setup_monitoring
    show_cluster_info

    success "Cluster setup completed successfully!"
    log "You can now deploy the Canvas Orchestration Platform using:"
    log "  ./deploy.sh production deploy"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --cluster-name)
            CLUSTER_NAME="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --kubernetes-version)
            KUBERNETES_VERSION="$2"
            shift 2
            ;;
        -h|--help)
            cat << EOF
Usage: $0 [options]

Options:
  --cluster-name NAME        EKS cluster name (default: canvas-cluster)
  --region REGION           AWS region (default: us-east-1)
  --kubernetes-version VER  Kubernetes version (default: 1.28)
  -h, --help               Show this help message

Environment Variables:
  CLUSTER_NAME             EKS cluster name
  AWS_REGION              AWS region
  KUBERNETES_VERSION      Kubernetes version
EOF
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Run main function
main