# Physiotherapy Guidance System

A production-grade, full-stack biomechanical analysis platform leveraging real-time computer vision, adaptive signal processing, and unsupervised machine learning to deliver clinically actionable exercise form assessment. The system ingests raw webcam telemetry, extracts high-fidelity skeletal kinematics via MediaPipe Pose Landmarker, applies temporal smoothing through a One Euro Filter, and performs unsupervised state-space modeling using K-Means clustering to autonomously construct corrective exercise templates from expert-demonstrated reference footage. A Dynamic Time Warping (DTW) inference engine then performs per-frame template conformity scoring, computing joint-space deviation vectors and rep-level error quantification to synthesize real-time multimodal corrective feedback — encompassing auditory directional cues, visual skeletal overlay annotations, and longitudinal progress analytics — bridging the gap between supervised clinical physiotherapy and autonomous home-based rehabilitation.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Computer Vision Pipeline](#computer-vision-pipeline)
- [Template Learning System](#template-learning-system)
- [Real-time Comparison Engine](#real-time-comparison-engine)
- [Exercise Configuration](#exercise-configuration)
- [UI / Portals](#ui--portals)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Architecture Overview

The system operates across three main phases:

1. **Pose Detection & Analysis** — Extracts 33 3D skeletal landmarks from a webcam feed using MediaPipe, then smooths the signal with a One Euro Filter and calculates joint/segment angles.
2. **Template Learning** — A doctor records a reference video. The system uses K-Means clustering to learn the correct exercise form as a sequence of "states," each defined by expected angle ranges.
3. **Real-time Comparison** — The patient performs the exercise. Their live angle data is matched against the learned template state-by-state, per-rep errors are computed, and corrective feedback is delivered via audio and on-screen cues.

### Mathematical Foundations

#### Landmark Signal Smoothing (One Euro Filter)

Raw pose landmarks `L ∈ ℝ³³ˣ³` are temporally filtered to suppress high-frequency jitter while preserving motion fidelity:

```
α(t) = 1 / (1 + (1 / (2π × f_c(t) × Δt)))
x̂(t) = α(t) × x(t) + (1 − α(t)) × x̂(t−1)
```

where the adaptive cutoff frequency `f_c(t)` is a function of instantaneous velocity:

```
f_c(t) = f_min + β × |x̂(t) − x̂(t−1)| / Δt
```

#### Joint Angle Computation (3-Point Interior Angle)

Given three landmarks `A, B, C` where `B` is the joint vertex:

```
θ_joint = | atan2(C_y − B_y, C_x − B_x) − atan2(A_y − B_y, A_x − B_x) |
```

Normalized to `θ ∈ [0°, 180°]`. Applied to: knee flexion, elbow flexion, shoulder abduction.

#### Segment Orientation (2-Point Relative to Vertical)

Given segment endpoints `S` (proximal) and `D` (distal):

```
θ_segment = | atan2(D_x − S_x, D_y − S_y) | × (180 / π)
```

Measures limb orientation relative to the gravitational axis. Applied to: thigh angle, lower leg angle, torso alignment.

#### Template State-Space Construction (K-Means Clustering)

Given reference frame angle vectors `X = {x₁, x₂, ..., xₙ}` where each `xᵢ ∈ ℝᵏ` (k = number of tracked angles):

```
J(C) = Σᵢ₌₁ⁿ min_{μⱼ ∈ C} ||xᵢ − μⱼ||²
```

Minimized via iterative Lloyd's algorithm to produce `K` cluster centroids `C = {μ₁, μ₂, ..., μ_K}`, each representing a distinct exercise state with associated mean `μⱼ` and variance `σⱼ²`.

#### Real-time State Matching

For each live frame with angle vector `x(t)`, the optimal template state is identified:

```
s*(t) = argmin_{s ∈ S_template} | x_primary(t) − μ_primary(s) |
```

#### Rep-Level Error Quantification

For matched state `s*(t)`, the multi-dimensional deviation vector is:

```
ε(t) = [ |x₁(t) − μ₁(s*)|, |x₂(t) − μ₂(s*)|, ..., |xₖ(t) − μₖ(s*)| ]
```

Normalized per-angle against dynamic range `Rᵢ = max(μᵢ) − min(μᵢ)`:

```
ε_norm(t)ᵢ = ε(t)ᵢ / Rᵢ × 100
```

#### Composite Form Score

Aggregated across all frames in a repetition:

```
F = max( 0, 100 − (1/n) × Σᵢ₌₁ⁿ ||ε(tᵢ)||₁ / 2 )
```

where `||·||₁` denotes the L₁ norm over the angle deviation vector.

### Data Flow

```
Webcam Feed → MediaPipe Pose Landmarker (L ∈ ℝ³³ˣ³)
         ↓
One Euro Filter (adaptive smoothing)
         ↓
Angle Computation (θ_joint, θ_segment)
         ↓
K-Means State Matching (s*(t) = argmin |x_primary − μ_primary|)
         ↓
Deviation Vector Computation (ε(t), ε_norm(t))
         ↓
Form Score Synthesis (F = max(0, 100 − ||ε||₁ / 2))
         ↓
Multimodal Feedback (Audio Cues + Skeleton Overlay + Session Persistence)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) + React 19 |
| **Language** | TypeScript 5 (strict mode) |
| **Styling** | Tailwind CSS v4 + shadcn/ui (new-york style) |
| **Animations** | Framer Motion 12 |
| **3D Rendering** | React Three Fiber 9 + Three.js 0.184 |
| **Backend / Auth** | Supabase (Auth + PostgreSQL + Storage) |
| **Computer Vision** | MediaPipe Pose Landmarker 0.10.22 (browser-side, GPU accelerated) |
| **Signal Processing** | One Euro Filter (custom implementation) |
| **Machine Learning** | K-Means Clustering (custom), Dynamic Time Warping (custom) |
| **Charts** | Recharts 2.15 |
| **Icons** | Lucide React |
| **Forms** | React Hook Form + Zod |
| **Testing** | Jest 30 + Testing Library |
| **Package Manager** | pnpm |

---

## Project Structure

```
physio-therapy-web/
├── app/                            # Next.js App Router routes
│   ├── layout.tsx                  # Root layout (Geist font, metadata)
│   ├── page.tsx                    # Landing page (3D scene, marketing)
│   ├── globals.css                 # Tailwind v4 config + shadcn/ui variables
│   │
│   ├── auth/callback/route.ts      # OAuth code exchange
│   ├── login/page.tsx              # Login form
│   ├── signup/page.tsx             # Signup form (with OTP)
│   ├── onboarding/page.tsx         # Post-signup profile setup
│   │
│   ├── doctor/
│   │   ├── page.tsx                # Doctor dashboard
│   │   └── record/page.tsx         # Record reference video
│   │
│   ├── patient/
│   │   ├── page.tsx                # Patient dashboard
│   │   └── compare/[id]/page.tsx   # Real-time exercise comparison
│   │
│   └── api/
│       ├── auth/signup/route.ts
│       ├── auth/logout/route.ts
│       ├── doctor/assign-exercise/route.ts
│       ├── exercises/assign/route.ts
│       ├── exercises/signed-url/route.ts
│       ├── exercises/sessions/route.ts
│       ├── ideal-templates/store/route.ts
│       └── patient/link-doctor/route.ts
│
├── components/                     # React components
│   ├── video-analysis-player.tsx   # Video analysis with skeleton overlay
│   ├── record-exercise.tsx         # Doctor reference recording component
│   ├── learned-template-view.tsx   # Template visualization
│   ├── comparison-recorder.tsx     # Patient real-time recording + comparison
│   ├── rep-error-graph.tsx         # Rep error visualization
│   └── ui/                         # shadcn/ui primitives
│
├── lib/                            # Core algorithms and utilities
│   ├── pose-analyzer.ts            # MediaPipe detection + angle calculation
│   ├── pose-angles.ts              # Joint & segment angle formulas
│   ├── pose-features.ts            # Feature extraction from landmarks
│   ├── filters.ts                  # One Euro Filter (signal smoothing)
│   ├── exercise-config.ts          # Exercise-specific angle configs
│   ├── exercise-state-learner.ts   # K-Means clustering for state learning
│   ├── template-learner.ts         # Template learning pipeline
│   ├── template-adapter.ts         # Template adaptation
│   ├── ideal-template-manager.ts   # Supabase template storage
│   ├── comparison.ts               # Template comparison engine
│   ├── dtw-scorer.ts               # Dynamic Time Warping scorer
│   ├── rep-error-calculator.ts     # Per-rep error calculation
│   ├── progress-scorer.ts          # Progress scoring
│   ├── recording-coach.ts          # Real-time coaching feedback
│   ├── audio-manager.ts            # Audio cue playback (EN/UR)
│   ├── storage.ts                  # LocalStorage utilities
│   └── utils.ts                    # cn() helper, formatters
│
├── utils/supabase/
│   ├── client.ts                   # Browser Supabase client
│   └── server.ts                   # Server-side Supabase client
│
├── public/
│   ├── images/                     # Static images
│   └── audio/
│       ├── en/                     # English audio cues
│       └── ur/                     # Urdu audio cues
│
├── __tests__/                      # Jest test suites
│   ├── lib.*.test.ts               # Algorithm unit tests
│   └── api.*.test.ts               # API route tests
│
├── proxy.ts                        # Supabase SSR middleware
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
├── jest.config.ts
├── jest.setup.ts
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- A Supabase project (auth + database + storage)

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd physio-therapy-web

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env.local
# Fill in your Supabase credentials (see Environment Variables)

# Run the dev server
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run Jest test suite |

---

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client-exposed) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key (client-exposed) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, bypasses RLS) |

---

## Database Schema

The database lives in Supabase (PostgreSQL). No local migration files exist — schema is managed in the Supabase dashboard.

### Tables

#### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Matches `auth.users.id` |
| `email` | text | User email |
| `role` | text | `'doctor'` or `'patient'` |
| `first_name` | text | |
| `last_name` | text | |

Auto-created via a database trigger on `auth.users` insert.

#### `doctors`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK, FK → users) | |
| `doctor_code` | text | Unique 6-char code for patient linking |
| `education` | text | |
| `specialization` | text | |
| `experience` | text | |

#### `patients`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK, FK → users) | |
| `doctor_id` | UUID (FK → doctors) | Assigned doctor |
| `age` | integer | |
| `gender` | text | |
| `disease` | text | Diagnosis/condition |

#### `exercise_assignments`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `doctor_id` | UUID (FK → doctors) | |
| `patient_id` | UUID (FK → patients) | |
| `name` | text | Display name (e.g., "Left Knee Extension") |
| `exercise_type` | text | Config key (e.g., `knee_extension`) |
| `video_url` | text | Reference video URL in storage |
| `video_path` | text | Storage path for signed URL generation |
| `template` | jsonb | Learned template (states, angles, rep structure) |
| `notes` | text | Doctor's instructions |
| `allow_progression` | boolean | Whether to increase difficulty over time |
| `reps` | integer | Target reps per set |
| `sets` | integer | Number of sets |
| `frequency` | integer | Sessions per week |
| `assigned_at` | timestamptz | When assigned |

#### `exercise_sessions`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `patient_id` | UUID (FK → patients) | |
| `assignment_id` | UUID (FK → exercise_assignments) | |
| `similarity_score` | numeric | Overall similarity to template (0-1) |
| `reps_completed` | integer | Total reps attempted |
| `reps_expected` | integer | Target reps (from template's `recommendedReps`) |
| `valid_reps` | integer | Reps meeting minimum quality threshold |
| `good_reps` | integer | Reps with high form score |
| `form_score` | numeric | Average form score across reps (0-100) |
| `progress_score` | numeric | Progress metric |
| `state_matches` | jsonb | Per-frame state matching data |
| `angle_deviations` | jsonb | Per-rep angle deviation breakdown |
| `duration_seconds` | integer | Session duration |
| `completed_at` | timestamptz | When session was completed |

#### `exercise_schedule`
| Column | Type | Notes |
|---|---|---|
| `assignment_id` | UUID (FK → exercise_assignments) | |
| `patient_id` | UUID (FK → patients) | |
| `day_of_week` | text | Day name (e.g., "Monday") |
| `is_rest_day` | boolean | If true, no exercise this day |

#### `ideal_templates`
| Column | Type | Notes |
|---|---|---|
| `exercise_type` | text (unique) | Config key |
| `template` | jsonb | Doctor-curated ideal template |
| `video_url` | text | Source video |
| `analyzed_at` | timestamptz | When analyzed |

### Storage

- **Bucket:** `reference-videos` (private)
- Videos are accessed via time-limited signed URLs generated by `/api/exercises/signed-url`

---

## API Routes

All API routes use **Bearer token authentication** — the `Authorization` header is extracted and verified via `supabase.auth.getUser(token)`.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register user, create profile row, generate `doctor_code` for doctors |
| `POST` | `/api/auth/logout` | Sign out via server client, redirect to `/login` |
| `GET` | `/auth/callback` | OAuth code exchange (Google/GitHub login) |
| `POST` | `/api/patient/link-doctor` | Patient links to doctor via 6-char `doctor_code` |
| `POST` | `/api/exercises/assign` | Doctor assigns exercise with full weekly schedule |
| `POST` | `/api/doctor/assign-exercise` | Simpler exercise assignment variant |
| `GET` | `/api/exercises/signed-url` | Generate signed URL for reference video |
| `POST` | `/api/exercises/sessions` | Save exercise session results |
| `POST` | `/api/ideal-templates/store` | Store doctor-curated ideal template |

---

## Computer Vision Pipeline

### MediaPipe Pose Landmarker

- **Model:** `pose_landmarker_full.task` (Float16, ~12MB)
- **Output:** 33 3D skeletal landmarks per frame (x, y, z, visibility)
- **Delegate:** GPU acceleration (WebGL)
- **FPS:** ~30 FPS on modern hardware

### One Euro Filter

Raw landmark coordinates are jittery, especially at low velocities. The One Euro Filter provides adaptive smoothing:

- **Low velocity (static pose):** High smoothing factor → removes jitter
- **High velocity (fast movement):** Low smoothing factor → preserves responsiveness

**Formula:**
```
α = 1 / (1 + (1 / (2π × cutoff × dt)))
x̂ᵢ = α × xᵢ + (1 - α) × x̂ᵢ₋₁
```

Where `cutoff` is dynamically computed from the signal's velocity using a speed coefficient (`min_cutoff`) and a beta parameter for speed-dependent responsiveness.

### Angle Calculation

Two types of angles are computed from the 33 landmarks:

#### Joint Angles (3-point interior angle)
Measures the angle at a joint formed by three landmarks:

```
θ = |atan2(Cᵧ - Bᵧ, Cₓ - Bₓ) - atan2(Aᵧ - Bᵧ, Aₓ - Bₓ)|
```

Result normalized to 0–180°. Used for: knee flexion, elbow flexion, shoulder abduction.

#### Segment Angles (2-point relative to vertical)
Measures body segment orientation relative to gravity:

```
θ = |atan2(Eₓ - Sₓ, Eᵧ - Sᵧ)| × (180 / π)
```

Result: 0–180° from vertical. Used for: thigh angle, lower leg angle, torso alignment.

---

## Template Learning System

Instead of hardcoding angle thresholds, the system learns correct form from a doctor's reference video.

### Pipeline

1. **Video Ingestion** — Doctor records or uploads a reference video via `/doctor/record`
2. **Frame-by-Frame Analysis** — Each frame goes through the full pose pipeline (MediaPipe → Filter → Angles)
3. **K-Means Clustering** — Angle vectors from all frames are clustered into `K` states
4. **State Ordering** — States are sorted by primary angle to establish the exercise sequence
5. **Rep Detection** — The system identifies start/peak/end states to define a complete repetition cycle
6. **Template Storage** — The learned template (states, angles, rep structure) is saved to `exercise_assignments.template`

### K-Means Clustering

- **Input:** Vector of relevant angles for each frame
- **K:** Automatically determined (typically 4–8 states per exercise)
- **Output:** Cluster centroids representing key poses (start, mid-range, peak contraction, etc.)
- **Each state includes:** Mean angle, standard deviation, frame count, and temporal position

### Rep Structure

A repetition is defined as: `Start → Peak → Start`

- **Start State:** The state with minimum (or maximum) primary angle extension
- **Peak State:** The state mathematically furthest from the Start State
- **Cycle:** Movement from Start through intermediate states to Peak and back

---

## Real-time Comparison Engine

When the patient performs an exercise, each frame is compared against the learned template.

### State Matching

For every live frame:
1. Compute the patient's current angle vector
2. Find the nearest template state (by primary angle proximity)
3. Match all secondary angles to that state's expected values

### Error Calculation

```
errorᵢ = |userAngleᵢ - templateStateMeanᵢ|
percentErrorᵢ = (errorᵢ / rangeᵢ) × 100
```

Where `rangeᵢ` is the dynamic range observed for that angle across all template states.

### Form Score

```
score = max(0, 100 - (averageError / 2))
```

### Rep Validation

A rep is classified based on accumulated quality:
- **valid_reps:** Reps meeting minimum form threshold
- **good_reps:** Reps with consistently high form scores

### Feedback Generation

The system identifies the highest-error angle and generates directional feedback:
- `userAngle > expected` → "Lower" / "Decrease angle"
- `userAngle < expected` → "Higher" / "Increase angle"

Feedback is delivered via:
- **Audio cues** — MP3 files in English and Urdu (`public/audio/en/`, `public/audio/ur/`)
- **On-screen indicators** — Color-coded skeleton overlay (green = good, yellow = warning, red = deviation)
- **Rep error graphs** — Per-rep breakdown via Recharts

---

## Exercise Configuration

Exercises are configured in `lib/exercise-config.ts`. Each exercise type defines:

```typescript
{
  name: "Knee Extension",
  anglesOfInterest: [
    { name: "knee_angle", joint: "knee", type: "joint", landmarks: [...] },
    { name: "thigh_angle", joint: "thigh", type: "segment", landmarks: [...] },
    { name: "lower_leg_angle", joint: "lower_leg", type: "segment", landmarks: [...] },
  ],
  primaryAngle: "knee_angle",
  alias: ["knee", "leg extension"],
  defaultReps: 10,
  description: "Extend the knee..."
}
```

### Currently Supported Exercises

| Exercise Type | Primary Angle | Tracked Angles |
|---|---|---|
| `knee_extension` | Knee Angle | Knee angle, thigh segment, lower leg segment |
| `scap_wall_slides` | Shoulder Angle | Shoulder angle, elbow angle, arm segment, forearm segment |

New exercises are added by defining a new entry in `exercise-config.ts` with the appropriate `anglesOfInterest` and `primaryAngle`.

---

## UI / Portals

### Landing Page (`/`)
- 3D scene rendered with React Three Fiber (animated geometry)
- Framer Motion entrance animations
- Marketing sections for features, services, and team
- Responsive (mobile hamburger menu)

### Auth Flow
- `/login` — Email/password login
- `/signup` — Email/password + role selection (doctor/patient) + OTP verification
- `/onboarding` — Profile setup (name, doctor: education/specialization/experience, patient: age/gender/disease)

### Doctor Dashboard (`/doctor`)
Four sidebar tabs:
| Tab | Content |
|---|---|
| **Overview** | Summary stats, recent patient activity |
| **Patients** | Patient list, assign exercises, link patients |
| **Calendar** | Weekly/monthly view, filter by patient/exercise, clickable exercise days → patient profile |
| **DroidCam Setup** | Step-by-step DroidCam configuration guide |

Also: `/doctor/record` — Record reference exercise videos (uses webcam, feeds into template learning pipeline)

### Patient Dashboard (`/patient`)
Four sidebar tabs:
| Tab | Content |
|---|---|
| **Overview** | Today's Agenda (reps progress bar per exercise, tap to compare), weekly streak, form score trend |
| **Exercises** | Assigned exercises with progress tracking, view comparison page |
| **Calendar** | Weekly/monthly view, filter by exercise, clickable days with exercise checklists, links to comparison page |
| **DroidCam Setup** | Step-by-step DroidCam configuration guide |

### Exercise Comparison (`/patient/compare/[assignmentId]`)
- Split-screen: reference video (left) + live webcam (right)
- Real-time skeleton overlay on both feeds
- Live form score, rep counter, state indicator
- Audio feedback cues during exercise
- Session results saved to `exercise_sessions` on completion

---

## Testing

### Setup
- **Runner:** Jest 30 with `jsdom` environment
- **Utilities:** `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
- **Transform:** `ts-jest` with React JSX support

### Running Tests

```bash
pnpm test           # Run all tests
pnpm test -- --watch  # Watch mode
```

### Test Coverage

19 test files covering:

| Test File | What It Tests |
|---|---|
| `lib.exercise-config.test.ts` | Exercise configuration, aliases, angle lookup |
| `lib.exercise-state-learner.test.ts` | K-Means clustering, state generation |
| `lib.template-learner.test.ts` | Full template learning pipeline |
| `lib.comparison.test.ts` | State matching, error calculation |
| `lib.dtw-scorer.test.ts` | Dynamic Time Warping scoring |
| `lib.filters.test.ts` | One Euro Filter smoothing behavior |
| `lib.progress-scorer.test.ts` | Progress scoring logic |
| `lib.recording-coach.test.ts` | Coaching feedback generation |
| `lib.rep-error-calculator.test.ts` | Per-rep error breakdown |
| `lib.utils.test.ts` | Utility functions |
| `api.auth.signup.test.ts` | Signup API route |
| `api.auth.logout.test.ts` | Logout API route |
| `api.exercises.assign.test.ts` | Exercise assignment API |
| `api.exercises.sessions.test.ts` | Session recording API |
| `api.exercises.signed-url.test.ts` | Signed URL generation |
| `api.ideal-templates.store.test.ts` | Template storage API |
| `api.patient.link-doctor.test.ts` | Doctor linking API |
| `api.doctor.assign-exercise.test.ts` | Doctor assignment API |

Coverage scope: `lib/**/*.ts`, `app/api/**/*.ts`, `utils/supabase/**/*.ts`

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Create the tables listed in [Database Schema](#database-schema)
3. Create a storage bucket named `reference-videos` (private)
4. Optionally create the `auth.users` → `users` trigger:
   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS trigger AS $$
   BEGIN
     INSERT INTO public.users (id, email, role)
     VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'role', 'patient'));
     RETURN new;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```
5. Add RLS policies as needed for your security requirements

### Browser Requirements

The computer vision pipeline requires:
- WebRTC-compatible browser (Chrome, Edge, Firefox)
- Webcam access (physical or virtual, e.g., DroidCam)
- WebGL support (for GPU-accelerated MediaPipe)
- Modern CPU (for real-time angle calculations at 30 FPS)

---

## License

Private — All rights reserved.
