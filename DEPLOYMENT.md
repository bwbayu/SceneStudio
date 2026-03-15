# SceneStudio — GCP Deployment Proof

## Live URLs

https://asas-demo.web.app

---

## Google Cloud Services in Use

### 1. Cloud Run — Backend API
The FastAPI backend is containerized and deployed on Cloud Run (Jakarta, `asia-southeast2`).

- [`server/Dockerfile`](server/Dockerfile) — container definition

### 2. Firestore — Database
All pipeline sessions and storyboard data are stored in Firestore.

- [`server/api/firestore/firestoreService.py`](server/api/firestore/firestoreService.py) — Firestore async read/write service
- Database ID: `gemini-hackathon`
- Collections: `sessions` (pipeline state), `storyboards` (actors, themes, scenes, segments)

### 3. Google Cloud Storage — Asset Storage
AI-generated images and videos are stored in GCS and served publicly.

- [`server/api/gcs/GCSService.py`](server/api/gcs/GCSService.py) — GCS upload/download service
- Stores: actor portraits, theme/location images, story thumbnails, scene videos
- Path structure: `sessions/{session_id}/actors/`, `scenes/{scene_id}/seg{n}/`

### 4. Secret Manager — Credentials
The GCP service account JSON key is stored in Secret Manager and mounted as a file inside the Cloud Run container.

### 5. Artifact Registry — Docker Images
Container images are stored in Artifact Registry

### 6. Firebase Hosting — Frontend CDN
The React frontend is deployed to Firebase Hosting with global CDN and automatic HTTPS.

---

## Key Code References

| File | GCP Service |
|------|-------------|
| [`server/api/firestore/firestoreService.py`](server/api/firestore/firestoreService.py) | Firestore — session and storyboard persistence |
| [`server/api/gcs/GCSService.py`](server/api/gcs/GCSService.py) | Cloud Storage — image and video asset management |
| [`server/api/scene/sceneService.py`](server/api/scene/sceneService.py) | Veo video generation via `google-genai` SDK |
| [`server/api/story_board/storyBoardService.py`](server/api/story_board/storyBoardService.py) | Gemini multi-agent pipeline via Google ADK |
| [`server/Dockerfile`](server/Dockerfile) | Cloud Run container definition |
