# Deployment Guide

## Local Development

```bash
# 1. Start infrastructure
pnpm infra:up

# 2. Install & build
pnpm install
pnpm build

# 3. Run tests
pnpm test

# 4. Start development
pnpm dev
```

## Kubernetes (Production)

```bash
# 1. Build images
pnpm build
docker build -t agi-ecosystem/dag-compiler:2.0.0 -f infra/docker/Dockerfile.dag-compiler packages/dag-compiler/
docker build -t agi-ecosystem/agent-os-runtime:2.0.0 -f infra/docker/Dockerfile.agent-os packages/agent-os-runtime/
docker build -t agi-ecosystem/mythos-policy-engine:2.0.0 -f infra/docker/Dockerfile.mythos packages/mythos-policy-engine/

# 2. Deploy to K8s
kubectl apply -k infra/k8s/overlays/production

# 3. Verify
kubectl get pods -n agi-ecosystem
kubectl get hpa -n agi-ecosystem
```

## AWS (Terraform)

```bash
cd infra/terraform
terraform init
terraform plan -var="db_password=$DB_PASSWORD"	erraform apply
```

## Autoscaling Configuration

| Component | Min | Max | Metric | Target |
|-----------|-----|-----|--------|--------|
| DAG Compiler | 3 | 20 | CPU | 70% |
| Agent OS | 5 | 50 | CPU + Queue Depth | 60% / 10 |
| Mythos | 3 | 10 | CPU | 75% |
| Postgres | 1 | 1 | N/A | StatefulSet |
| Kafka | 3 | 3 | N/A | Fixed replicas |

## Monitoring

- Prometheus metrics on `:9090/metrics`
- Health checks on `:8080/health` and `:8080/ready`
- Istio service mesh for mTLS & traffic management
- Network policies for zero-trust pod communication
