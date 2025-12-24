#!/bin/bash
# Script to load Docker image into K3s nodes
IMAGE_TAR="/tmp/repomind-image.tar"
IMAGE_NAME="docker4zerocool/repomind:latest"

# Get all nodes
NODES=$(kubectl get nodes -o jsonpath='{.items[*].metadata.name}')

for NODE in $NODES; do
  echo "Loading image into node: $NODE"
  
  # Create a pod to load the image
  kubectl run image-loader-$NODE \
    --image=busybox \
    --restart=Never \
    --overrides='
{
  "spec": {
    "hostNetwork": true,
    "hostPID": true,
    "containers": [{
      "name": "loader",
      "image": "busybox",
      "command": ["sh", "-c", "sleep 3600"],
      "volumeMounts": [{
        "name": "containerd",
        "mountPath": "/var/lib/rancher/k3s/agent/containerd"
      }]
    }],
    "volumes": [{
      "name": "containerd",
      "hostPath": {
        "path": "/var/lib/rancher/k3s/agent/containerd"
      }
    }]
  }
}' \
    --node-name=$NODE 2>&1 | head -3 || true
done




