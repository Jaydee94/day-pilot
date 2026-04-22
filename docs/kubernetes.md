# ☸️ Kubernetes Deployment with Helm

<p align="center">
  <img src="../frontend/public/logo.svg" alt="DayPilot Logo" width="300" />
</p>

This guide explains how to deploy DayPilot on a Kubernetes cluster using the bundled Helm chart.
The chart deploys all four components of the stack: **backend**, **frontend**, **PostgreSQL**, and **Redis**.

---

## Prerequisites

| Tool | Minimum version | Install guide |
|------|----------------|---------------|
| `kubectl` | v1.28 | [kubernetes.io/docs/tasks/tools](https://kubernetes.io/docs/tasks/tools/) |
| `helm` | v3.14 | [helm.sh/docs/intro/install](https://helm.sh/docs/intro/install/) |
| A running Kubernetes cluster | — | [kind](https://kind.sigs.k8s.io/), [k3s](https://k3s.io/), or any managed cluster |

You also need container images for the backend and frontend published to a registry your cluster can pull from.
See [Building and pushing images](#building-and-pushing-images) below.

---

## Chart location

The Helm chart lives at:

```
helm/day-pilot/
```

---

## Building and pushing images

Build the images locally and push them to your registry:

```bash
# Set your registry prefix
export REGISTRY=ghcr.io/your-username   # or docker.io/your-username, etc.

# Backend
docker build -t $REGISTRY/day-pilot-backend:latest ./backend
docker push $REGISTRY/day-pilot-backend:latest

# Frontend
docker build \
  --build-arg VITE_API_URL=https://day-pilot.example.com \
  -t $REGISTRY/day-pilot-frontend:latest \
  ./frontend
docker push $REGISTRY/day-pilot-frontend:latest
```

> 💡 If your cluster is **kind** or **k3s** running locally, you can load images directly:
> ```bash
> kind load docker-image $REGISTRY/day-pilot-backend:latest
> kind load docker-image $REGISTRY/day-pilot-frontend:latest
> ```

---

## Quick start (minimal install)

> **Before installing,** generate strong secrets for the database password and voice webhook:
> ```bash
> export DB_PASS=$(openssl rand -hex 16)
> export WEBHOOK_SECRET=$(openssl rand -hex 32)
> ```

```bash
# 1. Create a namespace
kubectl create namespace day-pilot

# 2. Install the chart with your values
helm install day-pilot ./helm/day-pilot \
  --namespace day-pilot \
  --set backend.image.repository=ghcr.io/your-username/day-pilot-backend \
  --set frontend.image.repository=ghcr.io/your-username/day-pilot-frontend \
  --set secrets.openaiApiKey=sk-proj-... \
  --set secrets.openweathermapApiKey=your-weather-key \
  --set secrets.ntfyTopic=your-ntfy-topic \
  --set postgresql.auth.password="$DB_PASS" \
  --set secrets.voiceWebhookSecret="$WEBHOOK_SECRET"

# 3. Port-forward to test locally
kubectl -n day-pilot port-forward svc/day-pilot-frontend 3000:80 &
kubectl -n day-pilot port-forward svc/day-pilot-backend  8000:8000 &

# Open http://localhost:3000
```

---

## Production install with a values file

For a reproducible production setup, create a `my-values.yaml` file (do **not** commit secrets to git):

```yaml
# my-values.yaml

backend:
  image:
    repository: ghcr.io/your-username/day-pilot-backend
    tag: "1.0.0"
  replicas: 1

frontend:
  image:
    repository: ghcr.io/your-username/day-pilot-frontend
    tag: "1.0.0"

ingress:
  enabled: true
  className: nginx          # adjust for your ingress controller
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  host: day-pilot.example.com
  tls:
    - secretName: day-pilot-tls
      hosts:
        - day-pilot.example.com

config:
  timezone: "Europe/Berlin"
  dailySummaryTime: "07:00"
  weatherCity: "Berlin"

postgresql:
  auth:
    password: "a-very-strong-password"   # change this!

secrets:
  openaiApiKey: "sk-proj-..."
  openweathermapApiKey: "your-key"
  ntfyTopic: "your-topic"
  voiceWebhookSecret: "a-random-32-char-string"
```

Then install:

```bash
helm install day-pilot ./helm/day-pilot \
  --namespace day-pilot \
  --create-namespace \
  -f my-values.yaml
```

---

## Upgrading

After changing your values file or after pulling a new chart version:

```bash
helm upgrade day-pilot ./helm/day-pilot \
  --namespace day-pilot \
  -f my-values.yaml
```

---

## Uninstalling

```bash
helm uninstall day-pilot --namespace day-pilot
```

> ⚠️ This does **not** delete PersistentVolumeClaims. To also remove data:
> ```bash
> kubectl delete pvc --all -n day-pilot
> ```

---

## Using an external database or Redis

If you already have a PostgreSQL or Redis instance:

```yaml
# my-values.yaml

postgresql:
  enabled: false   # do not deploy bundled PostgreSQL

redis:
  enabled: false   # do not deploy bundled Redis

backend:
  extraEnv:
    - name: DATABASE_URL
      value: "postgresql://user:password@my-postgres-host:5432/daypilot"
    - name: REDIS_URL
      value: "redis://my-redis-host:6379/0"
```

---

## Using an existing Kubernetes Secret

To avoid putting secrets in your values file, create a Kubernetes Secret manually and reference it:

```bash
kubectl create secret generic day-pilot-secrets \
  --namespace day-pilot \
  --from-literal=OPENAI_API_KEY=sk-proj-... \
  --from-literal=OPENWEATHERMAP_API_KEY=your-key \
  --from-literal=NTFY_TOPIC=your-topic \
  --from-literal=NTFY_TOKEN= \
  --from-literal=CALDAV_URL= \
  --from-literal=CALDAV_USERNAME= \
  --from-literal=CALDAV_PASSWORD= \
  --from-literal=VOICE_WEBHOOK_SECRET=$(openssl rand -hex 32) \
  --from-literal=POSTGRES_PASSWORD=a-strong-db-password
```

Then in your values file:

```yaml
secrets:
  existingSecret: day-pilot-secrets
```

---

## Persisting Google OAuth tokens

The backend stores Google OAuth tokens in `/app/data/`. This is backed by a PersistentVolumeClaim by default.

If you need to pre-populate `credentials.json` from outside Kubernetes, you can copy it into the running pod:

```bash
kubectl cp ./data/credentials.json \
  day-pilot/$(kubectl get pod -n day-pilot -l app.kubernetes.io/name=day-pilot-backend -o jsonpath='{.items[0].metadata.name}'):/app/data/credentials.json
```

Then restart the backend pod to trigger the Google OAuth flow:

```bash
kubectl rollout restart deployment/day-pilot-backend -n day-pilot
kubectl logs -f deployment/day-pilot-backend -n day-pilot
# Look for the Google authorisation URL in the logs, then open it in your browser.
```

---

## Chart reference

All configurable values are documented in [`helm/day-pilot/values.yaml`](../helm/day-pilot/values.yaml).

| Section | Key | Default | Description |
|---------|-----|---------|-------------|
| Backend | `backend.replicas` | `1` | Number of backend pod replicas |
| Backend | `backend.image.repository` | `ghcr.io/jaydee94/day-pilot-backend` | Image repository |
| Backend | `backend.image.tag` | `latest` | Image tag |
| Backend | `backend.persistence.size` | `500Mi` | PVC size for Google tokens |
| Frontend | `frontend.replicas` | `1` | Number of frontend pod replicas |
| Frontend | `frontend.image.repository` | `ghcr.io/jaydee94/day-pilot-frontend` | Image repository |
| Ingress | `ingress.enabled` | `false` | Enable Ingress resource |
| Ingress | `ingress.host` | `day-pilot.example.com` | Hostname for Ingress |
| Config | `config.timezone` | `Europe/Berlin` | IANA timezone |
| Config | `config.dailySummaryTime` | `07:00` | Morning briefing time (HH:MM) |
| Config | `config.weatherCity` | `Berlin` | City for weather data |
| PostgreSQL | `postgresql.enabled` | `true` | Deploy bundled PostgreSQL |
| PostgreSQL | `postgresql.auth.password` | `change-me` | Database password (change this!) |
| PostgreSQL | `postgresql.persistence.size` | `5Gi` | PVC size |
| Redis | `redis.enabled` | `true` | Deploy bundled Redis |
| Redis | `redis.persistence.size` | `1Gi` | PVC size |
| Secrets | `secrets.existingSecret` | `""` | Use an existing Secret instead of creating one |

---

## Checking the deployment

```bash
# Check pod status
kubectl get pods -n day-pilot

# View backend logs
kubectl logs -n day-pilot deployment/day-pilot-backend

# View frontend logs
kubectl logs -n day-pilot deployment/day-pilot-frontend

# Describe a pod to debug startup issues
kubectl describe pod -n day-pilot -l app.kubernetes.io/name=day-pilot-backend
```

---

## Next steps

- ⚙️ Configure all options → [Configuration Reference](configuration.md)
- 🐳 Prefer Docker Compose? → [Getting Started Guide](getting-started.md)
- ❓ Having trouble? → [Troubleshooting Guide](troubleshooting.md)
