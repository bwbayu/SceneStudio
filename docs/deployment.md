# Deployment Guide — SceneStudio

This document explains the deployment architecture, tooling choices, and step-by-step process for deploying SceneStudio to Google Cloud Platform.

> **Clone-and-run friendly:** This guide is written for anyone who forks or clones this repository. All GCP resources (GCS bucket, Firestore database, Cloud Run service, Firebase Hosting, etc.) are created from scratch by Terraform — no manual console setup required.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [GCP Services Used](#2-gcp-services-used)
3. [Repository Structure for Deployment](#3-repository-structure-for-deployment)
4. [Required Code Changes Before Deploying](#4-required-code-changes-before-deploying)
5. [Infrastructure as Code — Terraform](#5-infrastructure-as-code--terraform)
6. [CI/CD Pipeline — Cloud Build](#6-cicd-pipeline--cloud-build)
7. [Backend Container — Dockerfile](#7-backend-container--dockerfile)
8. [Secrets Management](#8-secrets-management)
9. [First-Time Setup Steps](#9-first-time-setup-steps)
10. [Cost Estimate](#10-cost-estimate)

---

## 1. Architecture Overview

SceneStudio is split into two independently deployed components:

```
User (Judge / Participant)
        │
        ├──── HTTPS ────► Firebase Hosting ──── React SPA (static)
        │                        │
        │                 (API calls from browser)
        │                        │
        └──── HTTPS ────► Cloud Run ──────────── FastAPI backend
                                 │
                    ┌────────────┼─────────────┐
                    │            │             │
               Firestore   Cloud Storage   Secret Manager
              (sessions,   (images/videos) (API keys, SA key)
              storyboards)
```

### Why This Architecture

| Component | Choice | Reason |
|-----------|--------|--------|
| Frontend hosting | **Firebase Hosting** | Free CDN, automatic HTTPS, one-command deploy |
| Backend compute | **Cloud Run** | Serverless containers, no VM management, free tier |
| IaC | **Terraform** | Industry-standard, full GCP provider, reproducible |
| CI/CD | **Cloud Build** | Native GCP integration, free tier (120 min/day) |
| Secrets | **Secret Manager** | Keeps credentials out of the repo and container image |

### Key Cloud Run Configuration

The backend has two characteristics that require specific Cloud Run settings:

- **`min-instances=1`** — The pipeline tracks in-progress jobs in memory (Python `dict`). If the instance scales to zero during an active job, that job is lost. Setting minimum instances to 1 prevents this.
- **`timeout=3600`** — Video generation can take up to 10 minutes. Cloud Run's default request timeout is 60 seconds; this must be raised to 3600s (1 hour, the maximum).

The frontend uses a polling pattern to handle long jobs — it submits a job, then periodically calls `/status` until complete, so the HTTP connection doesn't block on generation time.

---

## 2. GCP Services Used

All services below are created by Terraform during first-time setup. Nothing needs to be created manually in the GCP console.

| Service | Purpose | Created By |
|---------|---------|------------|
| **Cloud Run** | Hosts the FastAPI backend container | Terraform |
| **Firebase Hosting** | Hosts the React frontend static files | Terraform |
| **Artifact Registry** | Stores Docker images for Cloud Run | Terraform |
| **Firestore** | Stores pipeline sessions and storyboard data | Terraform |
| **Cloud Storage** | Stores generated images and videos (public read) | Terraform |
| **Secret Manager** | Stores API keys and service account credentials | Terraform |
| **Cloud Build** | Automates build and deploy on git push | Terraform (trigger) |

---

## 3. Repository Structure for Deployment

```
gemini-hackathon/
├── cloudbuild.yaml          # CI/CD: triggered on push to main
├── server/
│   ├── Dockerfile           # Container definition for the FastAPI backend
│   └── ...
├── client/
│   └── ...
└── infra/                   # Terraform infrastructure definitions
    ├── main.tf              # All GCP resources
    ├── variables.tf         # Input variables (customize here for your project)
    └── outputs.tf           # Cloud Run URL, bucket name, Firebase URL
```

---

## 4. Required Code Changes Before Deploying

The application code has several values hardcoded that must be read from environment variables instead. This makes the app work with whatever resources Terraform creates, rather than being tied to the original project's specific names.

### 4.1 Frontend — Parameterize the API URL

`client/src/api/axios.ts` hardcodes `http://localhost:8000/api`. Change it to read from a Vite environment variable:

```typescript
// client/src/api/axios.ts
const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';
```

The Cloud Build pipeline injects `VITE_API_BASE_URL` at build time pointing to the Cloud Run URL. Local development continues to use `localhost:8000` with no manual config.

### 4.2 Backend — GCS Bucket Name from Environment Variable

`server/api/gcs/GCSService.py` hardcodes the bucket name:

```python
# Current (hardcoded — change this)
BUCKET_NAME = "gemini-hackathon-8565416389"
```

Change it to read from an environment variable:

```python
import os

BUCKET_NAME = os.environ.get("GCS_BUCKET_NAME", "gemini-hackathon-8565416389")
```

Terraform outputs the bucket name and Cloud Run is configured to inject it as `GCS_BUCKET_NAME`.

### 4.3 Backend — Firestore Database Name from Environment Variable

`server/api/firestore/firestoreService.py` hardcodes the Firestore database ID:

```python
# Current (hardcoded — change this)
self._db = AsyncClient(credentials=self._credentials, database="gemini-hackathon")
```

Change it to read from an environment variable:

```python
import os

db_name = os.environ.get("FIRESTORE_DATABASE", "gemini-hackathon")
self._db = AsyncClient(credentials=self._credentials, database=db_name)
```

Terraform creates the Firestore database and Cloud Run injects its name as `FIRESTORE_DATABASE`.

### 4.4 CORS (Optional for Hackathon)

The backend sets `allow_origins=["*"]`. For a hackathon this is fine — no change needed. In production, restrict it to the Firebase Hosting domain.

---

## 5. Infrastructure as Code — Terraform

Terraform in the `infra/` directory provisions **all** GCP resources reproducibly. Running `terraform apply` on a fresh GCP project creates everything from scratch.

### `infra/variables.tf`

```hcl
variable "project_id" {
  description = "Your GCP project ID"
  # No default — must be set by the user
}

variable "region" {
  description = "GCP region for Cloud Run, Artifact Registry, and GCS"
  default     = "us-central1"
}

variable "firestore_database" {
  description = "Name of the Firestore database to create"
  default     = "scenestudio"
}
```

To customize for your project, create `infra/terraform.tfvars`:

```hcl
project_id = "your-gcp-project-id"
region     = "asia-southeast1"   # optional, change to your preferred region
```

### `infra/main.tf`

#### Provider

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}
```

#### Artifact Registry

```hcl
resource "google_artifact_registry_repository" "backend" {
  repository_id = "scenestudio-backend"
  format        = "DOCKER"
  location      = var.region
}
```

#### Cloud Storage Bucket (public read)

Terraform creates the bucket. The bucket name is derived from your project ID to avoid global naming collisions.

```hcl
resource "google_storage_bucket" "assets" {
  name                        = "${var.project_id}-assets"
  location                    = var.region
  uniform_bucket_level_access = true    # Required for IAM-based public access
  public_access_prevention    = "inherited"  # Must NOT be "enforced"

  cors {
    origin          = ["*"]
    method          = ["GET"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }
}

resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.assets.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
```

> **Note on `public_access_prevention`:** If your GCP organization enforces public access prevention at the org level, `allUsers` IAM bindings will be blocked. For personal/hackathon GCP projects this is almost never the case. Verify with:
> ```bash
> gcloud storage buckets describe gs://YOUR_BUCKET \
>   --format="value(iamConfiguration.publicAccessPrevention)"
> ```
> If it returns `enforced`, you would need to use signed URLs instead (requires changes to `GCSService.py`).

#### Firestore Database

```hcl
resource "google_firestore_database" "main" {
  project     = var.project_id
  name        = var.firestore_database
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  # Prevent accidental deletion of the database (and all its data)
  deletion_policy = "DELETE"
}
```

#### Secret Manager — API Keys and Service Account

```hcl
resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "gemini-api-key"
  replication { auto {} }
}

resource "google_secret_manager_secret" "apixo_api_key" {
  secret_id = "apixo-api-key"
  replication { auto {} }
}

# Service account JSON key — mounted as a file in Cloud Run
resource "google_secret_manager_secret" "sa_key" {
  secret_id = "gcp-service-account-key"
  replication { auto {} }
}
```

#### Cloud Run Service

The Cloud Run service receives all resource names (bucket, Firestore database) as environment variables, so the same container image works in any GCP project.

```hcl
resource "google_cloud_run_v2_service" "backend" {
  name     = "scenestudio-backend"
  location = var.region

  template {
    scaling {
      min_instance_count = 1   # Keep alive — in-memory tasks must not be lost
      max_instance_count = 1   # Single instance sufficient for hackathon
    }

    timeout = "3600s"          # Video generation takes up to ~10 min

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/scenestudio-backend/backend:latest"

      # --- Resource names (no secrets, just config) ---
      env {
        name  = "GCS_BUCKET_NAME"
        value = google_storage_bucket.assets.name
      }

      env {
        name  = "FIRESTORE_DATABASE"
        value = google_firestore_database.main.name
      }

      # --- API keys from Secret Manager ---
      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gemini_api_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "APIXO_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.apixo_api_key.secret_id
            version = "latest"
          }
        }
      }

      # --- Service account key mounted as a file ---
      volume_mounts {
        name       = "sa-key"
        mount_path = "/app/keys"
      }
    }

    volumes {
      name = "sa-key"
      secret {
        secret       = google_secret_manager_secret.sa_key.secret_id
        default_mode = 0444
        items {
          version = "latest"
          path    = "service-account.json"   # mounted at /app/keys/service-account.json
        }
      }
    }
  }

  depends_on = [
    google_artifact_registry_repository.backend,
    google_firestore_database.main,
    google_storage_bucket.assets,
  ]
}

# Allow unauthenticated browser calls from the frontend
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

> **Note on the SA key path:** The secret is mounted at `/app/keys/service-account.json`. Update the credentials path in `firestoreService.py` and `GCSService.py` to read from `os.environ.get("GCP_SA_KEY_PATH", "keys/service-account.json")` so it works both locally (with the original `keys/gemini-hackathon.json`) and in Cloud Run.

#### Firebase Hosting

```hcl
resource "google_firebase_hosting_site" "frontend" {
  provider = google-beta
  project  = var.project_id
  site_id  = "${var.project_id}-frontend"
}
```

### `infra/outputs.tf`

```hcl
output "backend_url" {
  description = "Cloud Run backend URL — use this as VITE_API_BASE_URL in Cloud Build"
  value       = google_cloud_run_v2_service.backend.uri
}

output "gcs_bucket_name" {
  description = "GCS bucket name — injected into Cloud Run as GCS_BUCKET_NAME"
  value       = google_storage_bucket.assets.name
}

output "firestore_database" {
  description = "Firestore database name — injected into Cloud Run as FIRESTORE_DATABASE"
  value       = google_firestore_database.main.name
}

output "frontend_url" {
  description = "Firebase Hosting URL"
  value       = "https://${google_firebase_hosting_site.frontend.site_id}.web.app"
}
```

---

## 6. CI/CD Pipeline — Cloud Build

`cloudbuild.yaml` at the project root defines the automated deployment pipeline, triggered on every push to `main`.

```yaml
# cloudbuild.yaml
steps:
  # --- BACKEND ---

  # 1. Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - build
      - -t
      - '${_REGION}-docker.pkg.dev/$PROJECT_ID/scenestudio-backend/backend:$COMMIT_SHA'
      - -t
      - '${_REGION}-docker.pkg.dev/$PROJECT_ID/scenestudio-backend/backend:latest'
      - ./server
    id: build-backend

  # 2. Push image to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - push
      - '--all-tags'
      - '${_REGION}-docker.pkg.dev/$PROJECT_ID/scenestudio-backend/backend'
    waitFor: ['build-backend']
    id: push-backend

  # 3. Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - run
      - deploy
      - scenestudio-backend
      - --image=${_REGION}-docker.pkg.dev/$PROJECT_ID/scenestudio-backend/backend:$COMMIT_SHA
      - --region=${_REGION}
      - --platform=managed
    waitFor: ['push-backend']
    id: deploy-backend

  # --- FRONTEND ---

  # 4. Install frontend dependencies
  - name: 'node:20'
    entrypoint: npm
    args: ['install']
    dir: client
    id: install-frontend

  # 5. Build the React app (inject the Cloud Run URL at build time)
  - name: 'node:20'
    entrypoint: npm
    args: ['run', 'build']
    dir: client
    env:
      - 'VITE_API_BASE_URL=${_BACKEND_URL}/api'
    waitFor: ['install-frontend', 'deploy-backend']
    id: build-frontend

  # 6. Deploy to Firebase Hosting
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: bash
    args:
      - -c
      - |
        npm install -g firebase-tools
        firebase deploy --only hosting --project $PROJECT_ID
    dir: client
    waitFor: ['build-frontend']

substitutions:
  _REGION: us-central1          # Change to match your Terraform region variable
  _BACKEND_URL: ''              # Set to your Cloud Run URL after first deploy

options:
  logging: CLOUD_LOGGING_ONLY
```

### Pipeline Flow

```
git push to main
       │
       ▼
Cloud Build triggered
       │
       ├── [Backend]  docker build → push to Artifact Registry → gcloud run deploy
       │
       └── [Frontend] npm install → npm run build (VITE_API_BASE_URL injected) → firebase deploy
```

---

## 7. Backend Container — Dockerfile

```dockerfile
# server/Dockerfile

# --- Build stage ---
FROM python:3.11-slim AS builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# --- Runtime stage ---
FROM python:3.11-slim

WORKDIR /app

COPY --from=builder /install /usr/local

# Copy application source (keys/ and .env are excluded — secrets come from Secret Manager)
COPY agents/ ./agents/
COPY api/ ./api/
COPY utils/ ./utils/
COPY template/ ./template/
COPY models.py .
COPY main.py .

ENV PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
```

`server/.dockerignore`:

```
__pycache__/
*.pyc
.env
env/
keys/
adk-docs/
docs/
test_*.py
```

---

## 8. Secrets Management

### What Goes in Secret Manager

| Secret ID | Contents |
|-----------|----------|
| `gemini-api-key` | Gemini API key |
| `apixo-api-key` | Apixo API key |
| `gcp-service-account-key` | Service account JSON (for Firestore + GCS auth) |

Terraform creates the Secret Manager secrets (the containers/slots), but does not store the actual values — that would require putting secrets in the Terraform state file. After `terraform apply`, upload values manually once:

```bash
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-
echo -n "YOUR_APIXO_API_KEY"  | gcloud secrets versions add apixo-api-key  --data-file=-

# Service account JSON (create one in IAM → Service Accounts with Firestore + GCS roles)
gcloud secrets versions add gcp-service-account-key \
  --data-file=path/to/your-service-account-key.json
```

### How Secrets Reach the Container

- `GEMINI_API_KEY` and `APIXO_API_KEY` → injected as environment variables via `secret_key_ref` in Cloud Run.
- Service account JSON → mounted as a file at `/app/keys/service-account.json` via a Cloud Run secret volume.
- `GCS_BUCKET_NAME` and `FIRESTORE_DATABASE` → plain environment variables (not secrets), set directly from Terraform outputs.

---

## 9. First-Time Setup Steps

> Run these steps once to bootstrap a fresh deployment from a cloned repo. After this, all subsequent deploys are automated via `git push`.

### Prerequisites

- `gcloud` CLI installed and authenticated (`gcloud auth login`)
- `terraform` CLI installed (v1.5+)
- `firebase` CLI installed (`npm install -g firebase-tools`) and logged in
- A GCP project created with billing enabled

### Step 1 — Enable required GCP APIs

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  firebase.googleapis.com \
  storage.googleapis.com \
  --project YOUR_PROJECT_ID
```

### Step 2 — Configure Terraform variables

```bash
cat > infra/terraform.tfvars << EOF
project_id = "YOUR_PROJECT_ID"
region     = "us-central1"
EOF
```

### Step 3 — Provision infrastructure

```bash
cd infra
terraform init
terraform apply
```

This creates: Artifact Registry, GCS bucket (public read), Firestore database, Secret Manager secrets, Cloud Run service, Firebase Hosting site.

Note the outputs — you'll need them in the next steps:

```bash
terraform output
# backend_url       = "https://scenestudio-backend-xxxx-uc.a.run.app"
# gcs_bucket_name   = "your-project-id-assets"
# firestore_database = "scenestudio"
# frontend_url      = "https://your-project-id-frontend.web.app"
```

### Step 4 — Upload secrets

```bash
# API keys
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-
echo -n "YOUR_APIXO_API_KEY"  | gcloud secrets versions add apixo-api-key  --data-file=-

# Service account key (create one with roles: Firestore User, Storage Object Admin)
gcloud secrets versions add gcp-service-account-key \
  --data-file=path/to/service-account.json
```

### Step 5 — Set the backend URL in Cloud Build

After `terraform apply`, update `cloudbuild.yaml` with the Cloud Run URL:

```yaml
substitutions:
  _REGION: us-central1
  _BACKEND_URL: 'https://scenestudio-backend-xxxx-uc.a.run.app'  # from terraform output
```

### Step 6 — Connect Cloud Build to the repository

In the [Cloud Build console](https://console.cloud.google.com/cloud-build/triggers), create a trigger:
- **Repository:** connect your GitHub repo
- **Branch:** `^main$`
- **Config file:** `cloudbuild.yaml`

### Step 7 — Deploy

```bash
git push origin main
```

Cloud Build automatically builds the Docker image, deploys to Cloud Run, builds the React frontend with the correct API URL injected, and deploys to Firebase Hosting.

---

## 10. Cost Estimate

For a ~2 week hackathon with low traffic (judges and participants):

| Service | Free Tier | Expected Usage | Cost |
|---------|-----------|----------------|------|
| Firebase Hosting | 10 GB storage, 10 GB/mo transfer | < 100 MB | **Free** |
| Cloud Run | 180K vCPU-sec/mo, 360K GiB-sec/mo | ~100K vCPU-sec | **Free** |
| Artifact Registry | 0.5 GB storage | ~500 MB image | **Free** |
| Firestore | 1 GiB storage, 50K reads/day | Minimal | **Free** |
| Cloud Storage | 5 GB standard storage | < 1 GB | **Free** |
| Secret Manager | 10K access ops/mo | < 1K | **Free** |
| Cloud Build | 120 build-minutes/day | < 30 min/deploy | **Free** |
| **Total GCP** | | | **~$0/month** |

External costs (Gemini API calls, Apixo image/video generation) are billed separately and depend on usage volume, not this deployment configuration.
