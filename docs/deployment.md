# Deployment Guide — SceneStudio

This document explains the deployment architecture and step-by-step process for deploying SceneStudio to Google Cloud Platform using manual CLI commands.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [GCP Services Used](#2-gcp-services-used)
3. [Production vs Development](#3-production-vs-development)
4. [Prerequisites](#4-prerequisites)
5. [Backend Deployment — Cloud Run](#5-backend-deployment--cloud-run)
6. [Frontend Deployment — Firebase Hosting](#6-frontend-deployment--firebase-hosting)
7. [Secrets Management](#7-secrets-management)
8. [Verification](#8-verification)
9. [Cost Estimate](#9-cost-estimate)

---

## 1. Architecture Overview

```
User (Browser)
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
            (sessions,   (images/videos) (SA key)
            storyboards)
```

### Key Cloud Run Configuration

- **`min-instances=1`** — The pipeline tracks in-progress jobs in memory (Python `dict`). If the instance scales to zero during an active job, that job is lost. Setting minimum instances to 1 prevents this.
- **`timeout=3600`** — Video generation can take up to 10 minutes. Cloud Run's default request timeout is 60 seconds; this must be raised to 3600s (1 hour, the maximum).

---

## 2. GCP Services Used

| Service | Purpose |
|---------|---------|
| **Cloud Run** | Hosts the FastAPI backend container |
| **Firebase Hosting** | Hosts the React frontend static files |
| **Artifact Registry** | Stores Docker images for Cloud Run |
| **Firestore** | Stores pipeline sessions and storyboard data |
| **Cloud Storage** | Stores generated images and videos (public read) |
| **Secret Manager** | Stores service account credentials |

---

## 3. Production vs Development

Generate features (Create Story, Add Scene, Generate Video) are **hidden in production** and only visible in development. This is controlled by Vite's built-in `import.meta.env.DEV` flag:

- `npm run dev` → `DEV = true` → all features visible
- `npm run build` → `DEV = false` → generate features hidden

This means the production backend does **not** require `GEMINI_API_KEY` or `APIXO_API_KEY`. Only Firestore and GCS credentials are needed to serve the read-only storyboard viewer.

---

## 4. Prerequisites

- `gcloud` CLI installed and authenticated (`gcloud auth login`)
- `docker` running locally (Docker Desktop)
- `firebase` CLI installed and logged in:
  ```bash
  npm install -g firebase-tools
  firebase login
  ```
- A GCP project with billing enabled

Enable required APIs (run once):

```
gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com --project PROJECT_ID
```

---

## 5. Backend Deployment — Cloud Run

### Step 1 — Create Artifact Registry repository

```
gcloud artifacts repositories create scenestudio-backend --repository-format=docker --location=REGION --project=PROJECT_ID
```

### Step 2 — Configure Docker authentication

```
gcloud auth configure-docker REGION-docker.pkg.dev
```

### Step 3 — Build and push Docker image

Run from the project root (not inside `server/`):

```
docker build -t REGION-docker.pkg.dev/PROJECT_ID/scenestudio-backend/backend:latest ./server
docker push REGION-docker.pkg.dev/PROJECT_ID/scenestudio-backend/backend:latest
```

> **Windows users**: Run these commands in **cmd.exe** (not Git Bash or PowerShell). Git Bash mangles Unix-style paths (e.g. `/app/keys/...` → `C:/Program Files/Git/app/keys/...`), and PowerShell may have script execution policy restrictions.

### Step 4 — Upload service account key to Secret Manager

```
gcloud secrets create gcp-service-account-key --data-file=server/keys/gemini-hackathon.json --project=PROJECT_ID
```

Grant the default compute service account access to the secret:

```
gcloud secrets add-iam-policy-binding gcp-service-account-key --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor" --project=PROJECT_ID
```

To find your `PROJECT_NUMBER`:

```
gcloud projects describe PROJECT_ID --format="value(projectNumber)"
```

### Step 5 — Deploy to Cloud Run

Run in **cmd.exe** on Windows:

```
gcloud run deploy scenestudio-backend --image=REGION-docker.pkg.dev/PROJECT_ID/scenestudio-backend/backend:latest --region=REGION --allow-unauthenticated --min-instances=1 --max-instances=1 --timeout=3600 --update-secrets="/app/keys/service-account.json=gcp-service-account-key:latest" --set-env-vars="GCP_SA_KEY_PATH=/app/keys/service-account.json,GCS_BUCKET_NAME=YOUR_BUCKET_NAME,FIRESTORE_DATABASE=YOUR_FIRESTORE_DB" --project=PROJECT_ID
```

Copy the Cloud Run URL from the output (e.g. `https://scenestudio-backend-xxxx-as.a.run.app`). You need it for the frontend build.

### How the SA key reaches the container

The service account JSON is stored in Secret Manager and **mounted as a file** at `/app/keys/service-account.json` inside the container via `--update-secrets`. The `GCP_SA_KEY_PATH` env var tells the Python code where to find it.

---

## 6. Frontend Deployment — Firebase Hosting

### Step 1 — Build the frontend

Inject the Cloud Run URL at build time:

```bash
cd client
VITE_API_BASE_URL=https://YOUR-CLOUD-RUN-URL/api npm run build
```

On Windows cmd.exe:

```
set VITE_API_BASE_URL=https://YOUR-CLOUD-RUN-URL/api && npm run build
```

### Step 2 — Deploy to Firebase Hosting

```bash
firebase deploy --only hosting --project PROJECT_ID
```

The `client/firebase.json` config points Firebase at the `dist/` folder and enables SPA routing:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

---

## 7. Secrets Management

Only one secret is used in production — the GCP service account JSON key, which grants access to Firestore and Cloud Storage.

| What | How |
|------|-----|
| Service account JSON | Stored in Secret Manager, mounted as a file at `/app/keys/service-account.json` |
| `GCS_BUCKET_NAME` | Plain env var in Cloud Run (not sensitive) |
| `FIRESTORE_DATABASE` | Plain env var in Cloud Run (not sensitive) |
| `GEMINI_API_KEY` | Not needed in production (generate features are hidden) |
| `APIXO_API_KEY` | Not needed in production (generate features are hidden) |

### Why no Gemini/Apixo keys in production

The generate pipeline (storyboard creation, video generation) is gated behind `import.meta.env.DEV` in the frontend — none of those API endpoints will be called from the production build. The Python services initialize the Gemini client **lazily** (only when the endpoint is actually called), so the app starts up and serves the read-only storyboard viewer without any Gemini API key present.

---

## 8. Verification

After deployment:

```bash
# Backend health check
curl https://YOUR-CLOUD-RUN-URL/health
# → {"status":"ok"}

# Frontend
# Visit the Firebase Hosting URL — existing storyboards should display correctly
```

---

## 9. Cost Estimate

For a ~2 week hackathon with low traffic:

| Service | Free Tier | Expected Usage | Cost |
|---------|-----------|----------------|------|
| Firebase Hosting | 10 GB storage, 10 GB/mo transfer | < 100 MB | **Free** |
| Cloud Run | 180K vCPU-sec/mo, 360K GiB-sec/mo | ~100K vCPU-sec | **Free** |
| Artifact Registry | 0.5 GB storage | ~500 MB image | **Free** |
| Firestore | 1 GiB storage, 50K reads/day | Minimal | **Free** |
| Cloud Storage | 5 GB standard storage | < 1 GB | **Free** |
| Secret Manager | 10K access ops/mo | < 1K | **Free** |
| **Total GCP** | | | **~$0/month** |

External costs (Gemini API calls, Apixo image/video generation) are billed separately and depend on usage volume. Since generate features are hidden in production, no external API costs are incurred from the deployed app.
