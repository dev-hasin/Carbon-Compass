# Carbon Compass E2E Test Script
# Backend must be running on :8000 before executing.
$ErrorActionPreference = "Continue"
$BASE = "http://localhost:8000"

Write-Host "=== Carbon Compass E2E Tests ===" -ForegroundColor Cyan

# 1. Health check
Write-Host "[1] Health check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$BASE/api/v1/health" -Method GET
Write-Host "  Status: $($health.status) | Mock: $($health.mock_mode) | OSS: $($health.apis.oss)" -ForegroundColor Green

# 2. Seed demo data
Write-Host "[2] Seed demo data..." -ForegroundColor Yellow
$seed = Invoke-RestMethod -Uri "$BASE/api/v1/admin/seed-demo" -Method POST
Write-Host "  Seeded: $($seed.seeded_count)" -ForegroundColor Green

# 3. List facilities
Write-Host "[3] List facilities..." -ForegroundColor Yellow
$list = Invoke-RestMethod -Uri "$BASE/api/v1/facilities" -Method GET
Write-Host "  Total: $($list.total)" -ForegroundColor Green

# 4. Insufficient-data guard (no fabricated score)
Write-Host "[4] Insufficient data check..." -ForegroundColor Yellow
$lahore = Invoke-RestMethod -Uri "$BASE/api/v1/facilities/cc-demo-lahore" -Method GET
if ($null -eq $lahore.risk_score) { Write-Host "  PASS" -ForegroundColor Green } else { Write-Host "  FAIL" -ForegroundColor Red }

# 5. PDF export
Write-Host "[5] PDF export..." -ForegroundColor Yellow
$pdf = Invoke-WebRequest -UseBasicParsing -Uri "$BASE/api/v1/facilities/cc-demo-faisalabad/report.pdf" -Method GET
if ($pdf.StatusCode -eq 200) { Write-Host "  PASS ($($pdf.RawContentLength) bytes)" -ForegroundColor Green } else { Write-Host "  FAIL" -ForegroundColor Red }

# 6. JSON analysis endpoint (full pipeline)
Write-Host "[6] Live analysis..." -ForegroundColor Yellow
$body = @{ query = "31.42, 73.08"; sector = "textile" } | ConvertTo-Json
$r = Invoke-RestMethod -Uri "$BASE/api/v1/facilities/analyze" -Method POST -Body $body -ContentType "application/json"
Write-Host "  Score: $($r.risk_score) Band: $($r.risk_band)" -ForegroundColor Green

# 7. SSE streaming analysis (progressive rendering, SRS 5.1)
Write-Host "[7] SSE streaming analysis..." -ForegroundColor Yellow
$stream = Invoke-WebRequest -UseBasicParsing -Uri "$BASE/api/v1/facilities/analyze/stream" -Method POST -Body $body -ContentType "application/json"
$frames = ([regex]::Matches($stream.Content, "data: ")).Count
if ($frames -ge 10) { Write-Host "  PASS ($frames SSE frames)" -ForegroundColor Green } else { Write-Host "  FAIL ($frames frames)" -ForegroundColor Red }

Write-Host "=== Done ===" -ForegroundColor Cyan
