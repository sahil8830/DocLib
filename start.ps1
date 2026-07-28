# =====================================================
#  Contexa — Start Script (No Docker)
#  Run this to start all services locally
# =====================================================
#  Prerequisites:
#   - Node.js 18+ installed
#   - Python 3.10+ installed
#   - pip install virtualenv
#   - GEMINI_API_KEY set in .env files
# =====================================================

Write-Host ""
Write-Host "  ⚡ Contexa RAG System — Starting up..." -ForegroundColor Cyan
Write-Host ""

# ── Setup .env files ──────────────────────────────────────────
if (!(Test-Path ".\backend\.env")) {
  Copy-Item ".env.example" ".\backend\.env"
  Write-Host "  ✓ Created backend/.env from .env.example" -ForegroundColor Green
}
if (!(Test-Path ".\ai-service\.env")) {
  Copy-Item ".env.example" ".\ai-service\.env"
  Write-Host "  ✓ Created ai-service/.env from .env.example" -ForegroundColor Green
}

# ── Create data dirs ──────────────────────────────────────────
New-Item -ItemType Directory -Path ".\data\uploads" -Force | Out-Null
New-Item -ItemType Directory -Path ".\data\chroma_db" -Force | Out-Null

# ── Python venv ────────────────────────────────────────────────
Write-Host ""
Write-Host "  Setting up Python virtual environment..." -ForegroundColor Yellow
if (!(Test-Path ".\ai-service\venv")) {
  python -m venv .\ai-service\venv
}
.\ai-service\venv\Scripts\pip install -r .\ai-service\requirements.txt -q
Write-Host "  ✓ Python dependencies installed" -ForegroundColor Green

# ── Start Python AI service (background) ──────────────────────
Write-Host ""
Write-Host "  Starting Python AI microservice on :8000..." -ForegroundColor Yellow
$aiJob = Start-Job -ScriptBlock {
  Set-Location $using:PWD
  .\ai-service\venv\Scripts\python .\ai-service\main.py
}
Start-Sleep -Seconds 3
Write-Host "  ✓ AI service started (PID: $($aiJob.Id))" -ForegroundColor Green

# ── Start Express backend (background) ────────────────────────
Write-Host ""
Write-Host "  Starting Express backend on :3001..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
  Set-Location "$using:PWD\backend"
  npm run dev
}
Start-Sleep -Seconds 2
Write-Host "  ✓ Backend started" -ForegroundColor Green

# ── Start React frontend ───────────────────────────────────────
Write-Host ""
Write-Host "  Starting React frontend on :5173..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  ════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   Open: http://localhost:5173" -ForegroundColor Green
Write-Host "  ════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Set-Location .\frontend
npm run dev
