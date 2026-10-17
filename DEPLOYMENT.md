# Vercel + Render deployment

Paths below are relative to the Git repository root (the folder containing this file).
If the repository contains another enclosing DocLib directory, include that prefix in dashboard root paths.

## AI service on Render

- Service type: Python Web Service
- Root directory: `ai-service`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Set `GEMINI_API_KEY` in Render's environment settings.
- Check `https://YOUR-AI-SERVICE.onrender.com/health/`.

The service imports Gemini and ChromaDB during startup. A missing Gemini key,
failed dependency installation, or ChromaDB initialization error can prevent it
from binding a port; inspect the first traceback in the Render logs.
ChromaDB uses local storage. To preserve indexed documents across redeployments,
attach a persistent disk and set `CHROMA_PATH` to a directory on that disk.
Otherwise documents may need to be reuploaded after restart or redeployment.

## Express backend on Vercel

- Root directory: `backend`
- Framework preset: Express (the checked-in configuration also specifies it).
- Use the default install/build settings; remove old custom build/output overrides.
- Enable Fluid compute for the configured 300 second function duration.
- Set the following production environment variables:

```dotenv
AI_SERVICE_URL=https://YOUR-AI-SERVICE.onrender.com
FRONTEND_URL=https://YOUR-FRONTEND.vercel.app
MONGODB_URI=YOUR_MONGODB_ATLAS_CONNECTION_STRING
JWT_SECRET=YOUR_RANDOM_SECRET
```

`FRONTEND_URL` must be the exact browser origin, with no path or trailing slash.
Configure MongoDB Atlas network access to allow the deployed backend to connect.
Also copy your storage configuration into Vercel: either `USE_CLOUDINARY=true`
with `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, or
S3's `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`.
Email verification/reset also require `SMTP_USER` and `SMTP_PASS`.

Check `https://YOUR-BACKEND.vercel.app/api/health` after redeployment.
This endpoint confirms the gateway runs; it does not check MongoDB or the AI service.
Database connection failures return 503 on routes that require MongoDB.

Uploads now wait for AI ingestion before returning 201 with `status: ready`.
Ingestion failures return 502 and save `status: failed`. No document ingestion
runs after sending the response. Long processing can still exceed the function
duration; larger jobs require a durable worker/queue.
Vercel also applies its request body limit before Express, so the local 50 MB
Multer limit does not mean 50 MB uploads work on Vercel. Use a small text file
for the first upload test; large uploads need direct-to-storage uploads.

The existing settings editor writes a YAML file inside the application directory.
That operation is not supported by Vercel's read-only deployment filesystem;
persisting settings across the separate services requires a separate change.

## Frontend on Vercel

- Root directory: `frontend`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_URL=https://YOUR-BACKEND.vercel.app` (without `/api`).

Redeploy after changing environment variables. Vite embeds its environment
variables during the build. Test login, upload a small TXT document, then query it.

## Local checks

```sh
cd frontend
npm run build
```

Platform references:
- https://vercel.com/docs/frameworks/backend/express
- https://vercel.com/docs/project-configuration/vercel-json
- https://render.com/docs/deploy-fastapi

## Gemini embedding quota (429)

If logs show `embed_content_free_tier_requests` and
`EmbedContentRequestsPerMinutePerUserPerProjectPerModel-FreeTier`, the upload
reached Google's per-minute embedding quota. Follow the response's retry delay,
pause repeated uploads, and retry with one small document. Check the affected
project's active limits in https://aistudio.google.com/rate-limit . Quotas are
per project, so replacing a key within the same project does not raise them.
If normal usage repeatedly exceeds the free limit, review paid-tier quotas and
billing in AI Studio before choosing whether to upgrade.

The embedding client retries transient quota errors once after the provider's
delay (up to a minute), with SDK retries disabled to avoid multiplying calls.
If quota remains exhausted, ingestion and the gateway return 429 with
`Retry-After`, and the frontend displays the quota message. Longer jobs still
need a durable worker to avoid request timeouts; retry handling cannot increase
Google's quota.

Run the offline retry regression tests from `ai-service`:

```sh
GEMINI_API_KEY=offline-test-key venv/bin/python -m unittest discover -s tests -v
```
