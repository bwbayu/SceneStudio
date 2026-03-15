# SceneStudio — System Architecture

## Overview

SceneStudio is an AI-powered interactive FMV (Full Motion Video) storyboard generator. Users submit a script or story prompt; the system uses a multi-agent Gemini pipeline to produce a branching storyboard with AI-generated character images, location images, and video scenes.

- **Frontend**: React 19 + TypeScript + Vite, served via Firebase Hosting
- **Backend**: Python FastAPI, containerized and deployed on Cloud Run
- **AI Models**: Google Gemini Flash (text + image), Veo (video generation)
- **Agent Framework**: Google ADK (`google-adk`) with `LlmAgent` + `Runner`
- **Database**: Firestore (session state + storyboard content)
- **Asset Storage**: Google Cloud Storage (images + videos)
- **Deployment**: Manual CLI — `gcloud run deploy` (Cloud Run) + `firebase deploy` (Firebase Hosting)

---

## 1. High-Level System Architecture

```mermaid
graph TD
    User["👤 User (Browser)"]

    subgraph GCP_Frontend["Firebase Hosting"]
        FE["React 19 + Vite\nTypeScript · Tailwind CSS\nTanStack Query"]
    end

    subgraph GCP_Backend["Cloud Run (Backend)"]
        API["FastAPI\nPython 3.11"]
        Agents["Multi-Agent Layer\n(Google ADK)"]
        Services["Service Layer\nGCS · Firestore · Gemini SDK"]
    end

    subgraph Gemini["Google Gemini Platform"]
        GFlash["gemini-3-flash-preview\nText Reasoning\n(Multi-Agent)"]
        GImage["gemini-3.1-flash-image-preview\nImage Generation"]
        GVeo["veo-3.1-fast-generate-preview\nVideo Generation"]
    end

    subgraph Storage["Google Cloud Storage"]
        GCS["Bucket: gemini-hackathon-*\nActor Images\nTheme Images\nStory Thumbnails\nScene Videos"]
    end

    subgraph DB["Firestore (NoSQL)"]
        FSessions["Collection: sessions\nPipeline state · Q&A history"]
        FStoryboards["Collection: storyboards\nActors · Themes · Scenes · Segments"]
    end

    User -- "HTTPS" --> GCP_Frontend
    FE -- "REST API (HTTP)" --> API
    API --> Agents
    API --> Services
    Agents -- "Google ADK SDK" --> GFlash
    Services -- "google-genai SDK" --> GImage
    Services -- "google-genai SDK" --> GVeo
    Services -- "GCS SDK" --> GCS
    Services -- "Firestore SDK" --> FSessions
    Services -- "Firestore SDK" --> FStoryboards
```

---

## 2. Multi-Agent Pipeline

The backend uses **Google ADK** to orchestrate 7 specialized `LlmAgent` instances, all powered by `gemini-3-flash-preview`. Agents run sequentially or in parallel depending on their data dependencies.

```mermaid
flowchart TD
    Script["📄 Raw Script / Story Prompt"]

    subgraph Phase1["Phase 1 — Script Analysis"]
        Director["🎬 Director Agent\ngemini-3-flash-preview\nhigh thinking budget\nAnalyzes script · Asks clarifying Q&A"]
    end

    QA{"Clarification\nNeeded?"}
    UserAnswer["💬 User Answers\n(via frontend polling)"]

    subgraph Phase2["Phase 2 — Parallel Specialists"]
        direction LR
        Screenwriter["✍️ Screenwriter Agent\nScene structure\n5–7 scenes + 2–3 endings"]
        Casting["🎭 Casting Agent\nActor visual profiles\nPhysical · Outfit · Personality"]
        Designer["🏛️ Production Designer Agent\nLocation / Theme profiles\nAtmosphere · Lighting · Mood"]
    end

    subgraph Phase3["Phase 3 — Segment Engineering"]
        SegEng["🎞️ Segment Engineer Agent\n3 video segments per scene\nVeo prompts · Camera · Dialogue · Audio"]
    end

    subgraph Phase4["Phase 4 — Parallel Asset Generation"]
        direction LR
        ActorImg["🖼️ Actor Images\ngemini-3.1-flash-image-preview"]
        ThemeImg["🌅 Theme Images\ngemini-3.1-flash-image-preview"]
        Thumb["📸 Story Thumbnail\ngemini-3.1-flash-image-preview\nCinematic 16:9"]
    end

    subgraph Phase5["Phase 5 — On-Demand Video Generation"]
        Veo1["🎬 Segment 1\nveo-3.1-fast-generate-preview\ntext-to-video · 8 sec"]
        Veo2["▶️ Segment 2\nextend-video · 8 sec"]
        Veo3["▶️ Segment 3\nextend-video · 8 sec"]
    end

    GCS_Store["☁️ GCS Upload\n+ Firestore Update"]
    StoryboardReady["✅ Storyboard Complete"]

    Script --> Phase1
    Director --> QA
    QA -- "Yes" --> UserAnswer --> Director
    QA -- "No / Analysis Ready" --> Phase2
    Phase2 --> Phase3
    Phase3 --> Phase4
    Veo1 --> Veo2 --> Veo3
    Phase4 --> GCS_Store
    Phase5 --> GCS_Store
    GCS_Store --> StoryboardReady

    note1["User can trigger Phase 5\nper scene from the Scene Editor"]
    Phase5 -.-> note1
```

### Add-Scene Sub-Pipeline

When a user adds a new scene to an existing storyboard, a shorter pipeline runs:

```mermaid
flowchart LR
    Desc["📝 Scene Description"]
    SceneDir["🎬 Scene Director Agent\nmedium thinking budget\nClarifies new scene context"]
    QA2{"Questions?"}
    UserAns2["💬 User Answers"]
    SceneWriter["✍️ Scene Writer Agent\nGenerates title + summary"]
    SegEng2["🎞️ Segment Engineer Agent\n3 segment prompts"]
    Append["📋 Append to Storyboard\n(Firestore)"]

    Desc --> SceneDir --> QA2
    QA2 -- "Yes" --> UserAns2 --> SceneDir
    QA2 -- "Ready" --> SceneWriter --> SegEng2 --> Append
```

---

## 3. Image Generation Flow

Actor portraits, location images, and the story thumbnail are all generated by Gemini's image model (or nano-banana-2 via the same API surface), then stored in GCS with signed URLs served to the frontend.

```mermaid
sequenceDiagram
    participant BE as Backend (FastAPI)
    participant GM as Gemini Image Model<br/>(gemini-3.1-flash-image-preview<br/>/ nano-banana-2)
    participant GCS as Google Cloud Storage
    participant FS as Firestore
    participant FE as Frontend (React)

    BE->>GM: Generate image<br/>(prompt: actor/theme/thumbnail description)
    GM-->>BE: Image bytes (JPEG)
    BE->>GCS: Upload to sessions/{id}/actors/{actor_id}.jpg
    GCS-->>BE: GCS URI (gs://...)
    BE->>GCS: Generate signed HTTPS URL (expiring)
    GCS-->>BE: Signed URL
    BE->>FS: Update storyboard actor/theme with<br/>gcs_uri + signed_url
    FE->>FS: Poll storyboard or API response
    FE-->>FE: Display image via signed URL
```

**GCS Asset Paths:**
```
sessions/{session_id}/
  ├── thumbnail.jpg
  ├── actors/{actor_id}.jpg
  ├── themes/{theme_id}.jpg
  └── scenes/{scene_id}/
      ├── thumbnail.jpg
      ├── video.mp4          (merged)
      ├── seg1/video.mp4
      ├── seg2/video.mp4
      └── seg3/video.mp4
```

---

## 4. Video Generation Flow

Each scene is composed of 3 sequential 8-second video segments. Segment 1 is text-to-video; Segments 2 and 3 use extend-video from the previous segment. Up to 3 reference images (actors + theme) are passed to Veo for visual consistency.

```mermaid
sequenceDiagram
    participant FE as Frontend (React)
    participant BE as Backend (FastAPI)
    participant Veo as Veo Model<br/>(veo-3.1-fast-generate-preview / veo-3-1)
    participant GCS as Google Cloud Storage
    participant FS as Firestore

    FE->>BE: POST /api/scene/generate-video<br/>{scene_id, story_id, provider}
    BE->>GCS: Download actor + theme reference images
    GCS-->>BE: Image bytes

    BE->>Veo: Segment 1 — text-to-video<br/>visual prompt + camera + reference images
    Veo-->>BE: Operation ID (async)
    loop Poll every 10s (max 30 min)
        BE->>Veo: Check operation status
        Veo-->>BE: state: running | succeeded
    end
    Veo-->>BE: gs:// URI for segment 1 video

    BE->>Veo: Segment 2 — extend-video<br/>seg1 video + prompt + reference images
    Note over BE,Veo: Same polling loop
    Veo-->>BE: gs:// URI for segment 2 video

    BE->>Veo: Segment 3 — extend-video<br/>seg2 video + prompt + reference images
    Note over BE,Veo: Same polling loop
    Veo-->>BE: gs:// URI for segment 3 video

    BE->>GCS: Copy/upload segment videos to sessions/{id}/scenes/{id}/seg*/
    BE->>GCS: Extract first frame → scene thumbnail
    BE->>FS: Update scene with video URLs + thumbnail URL

    FE->>BE: GET /api/scene/generate-video/status
    BE-->>FE: {status: "complete", scene: {...}}
    FE-->>FE: Play video in Scene Editor
```

---

## 5. Data Storage Layer

### Firestore Document Structure

```mermaid
erDiagram
    sessions {
        string session_id PK
        string creator_id
        string script
        array qa_history
        string status
        string story_id FK
        string error
        timestamp created_at
        timestamp updated_at
    }

    storyboards {
        string story_id PK
        string session_id FK
        string creator_id
        string title
        string status
        string thumbnail_gcs_uri
        string thumbnail_url
        timestamp created_at
    }

    actors {
        string actor_id PK
        string name
        string physical_description
        string outfit_description
        string image_gcs_uri
        string image_url
    }

    themes {
        string theme_id PK
        string name
        string location_description
        string atmosphere
        string image_gcs_uri
        string image_url
    }

    scenes {
        string scene_id PK
        string title
        string summary
        string thumbnail_gcs_uri
        string thumbnail_url
        array choices
    }

    segments {
        string segment_id PK
        string visual_prompt
        string camera_movement
        string dialogue
        string audio_design
        string video_gcs_uri
        string video_url
        array actor_ids
        string theme_id
    }

    sessions ||--o| storyboards : "creates"
    storyboards ||--o{ actors : "contains (nested array)"
    storyboards ||--o{ themes : "contains (nested array)"
    storyboards ||--o{ scenes : "contains (nested array)"
    scenes ||--|| segments : "has 3 (nested array)"
```

> **Note:** In Firestore, `actors`, `themes`, `scenes`, and `segments` are stored as nested arrays within the `storyboards` document — not as separate collections.

### Session Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> clarifying : Director needs Q&A
    clarifying --> clarifying : User answers, more questions
    clarifying --> processing_agents : Director analysis ready
    pending --> processing_agents : No clarification needed
    processing_agents --> processing_assets : Screenwriter + Casting + Designer done
    processing_assets --> generating_images : Segment Engineer done
    generating_images --> storyboard_complete : All images generated
    storyboard_complete --> [*]
    pending --> error : Any failure
    clarifying --> error : Any failure
    processing_agents --> error : Any failure
    processing_assets --> error : Any failure
    generating_images --> error : Any failure
```

---

## 6. Deployment Architecture

```mermaid
graph LR
    subgraph Dev["Developer Workstation"]
        Code["Source Code"]
        DockerBuild["docker build + push"]
        GcloudDeploy["gcloud run deploy"]
        FBDeploy["firebase deploy"]
    end

    subgraph GCPInfra["GCP Infrastructure"]
        AR["Artifact Registry\nDocker Images"]

        subgraph CloudRun["Cloud Run (Backend)"]
            Container["FastAPI Container\nPython 3.11\nmin_instances=1\ntimeout=3600s"]
        end

        subgraph FBHosting["Firebase Hosting (Frontend)"]
            CDN["React SPA\nGlobal CDN\nHTTPS"]
        end

        subgraph Data["Data Layer"]
            FS2["Firestore\nSessions + Storyboards"]
            GCS2["Cloud Storage\nImages + Videos"]
        end

        subgraph Secrets["Secret Manager"]
            S3["GCP Service Account\nJSON key (file mount)"]
        end
    end

    Code --> DockerBuild --> AR --> Container
    Code --> FBDeploy --> CDN
    GcloudDeploy --> Container
    Secrets --> Container
    Container --> FS2
    Container --> GCS2
    CDN -- "REST API" --> Container
```

**Key Infrastructure Decisions:**
- **Cloud Run**: Serverless containers, `min-instances=1` to keep in-memory pipeline state alive, `timeout=3600s` to support Veo polling
- **Firebase Hosting**: CDN-backed static hosting for the React SPA
- **Secret Manager**: Service account JSON mounted as a file — never stored in the container image
- **Artifact Registry**: Private Docker registry in the same GCP project for fast pulls
- **No CI/CD**: Deployment is manual via `gcloud` and `firebase` CLI commands

---

## 7. Frontend–Backend API Contract

The frontend communicates exclusively via REST polling — no WebSockets. Long-running operations use a poll-until-complete pattern.

```mermaid
sequenceDiagram
    participant User
    participant FE as React Frontend
    participant BE as FastAPI Backend

    User->>FE: Submit story prompt
    FE->>BE: POST /api/pipeline/start {prompt}
    BE-->>FE: {session_id}

    loop Poll every 3s
        FE->>BE: GET /api/pipeline/status/{session_id}
        BE-->>FE: {status: "clarifying", questions: [...]}
    end

    FE-->>User: Show QuestionnaireModal
    User->>FE: Submit answers
    FE->>BE: POST /api/pipeline/{session_id}/answer {answers}

    loop Poll every 3s
        FE->>BE: GET /api/pipeline/status/{session_id}
        BE-->>FE: {status: "storyboard_complete", story_id}
    end

    FE-->>User: Navigate to Scene Editor (/story/{story_id})

    User->>FE: Click "Generate Video" for a scene
    FE->>BE: POST /api/scene/generate-video {scene_id, story_id}

    loop Poll every 5s
        FE->>BE: POST /api/scene/generate-video/status
        BE-->>FE: {status: "complete", scene: {...videos}}
    end

    FE-->>User: Play generated scene videos
```

**Polling Intervals:**
| Operation | Interval | Max Wait |
|-----------|----------|----------|
| Pipeline status | 3 seconds | Until terminal state |
| Add-scene status | 3 seconds | Until terminal state |
| Video generation | 5 seconds | ~30 minutes (Veo timeout) |
| Image generation (Gemini) | Immediate (sync) | ~10 seconds |
