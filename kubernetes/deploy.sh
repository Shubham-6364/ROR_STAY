#!/bin/bash
# ROR-STAY Kubernetes Deployment Script

set -e

echo "🚀 ROR-STAY Kubernetes Deployment"
echo "=================================="
echo ""

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

echo "📝 Deploying to Kubernetes..."
kubectl apply -k kubernetes/base/

echo ""
echo "⏳ Waiting for pods to be ready (this may take a few minutes)..."
kubectl wait --for=condition=ready pod -l app=mongodb -n ror-stay --timeout=300s
kubectl wait --for=condition=ready pod -l app=backend -n ror-stay --timeout=300s
kubectl wait --for=condition=ready pod -l app=frontend -n ror-stay --timeout=300s
kubectl wait --for=condition=ready pod -l app=nginx -n ror-stay --timeout=300s

echo ""
echo "📊 Deployment Status:"
kubectl get pods -n ror-stay

echo ""
echo "🌐 Services:"
kubectl get services -n ror-stay

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Get LoadBalancer IP: kubectl get service nginx-service -n ror-stay"
echo "2. Create admin user (see kubernetes deployment guide)"
echo "3. Access: http://<EXTERNAL-IP>"
echo ""
