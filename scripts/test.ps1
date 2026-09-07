# Backend must be running on :8000 before executing.
# Signs in as the single admin (ADMIN_EMAIL/ADMIN_PASSWORD; default admin@carbon-compass.local/admin123).
$ErrorActionPreference = "Continue"
$BASE = "http://localhost:8000"

function Get-StatusCode($ScriptBlock) {
  try { & $ScriptBlock | Out-Null; return 200 } catch { return [int]$_.Exception.Response.StatusCode }
}

Write-Host "=== Carbon Compass E2E Tests ===" -ForegroundColor Cyan

# 1. Health check (public)
Write-Host "[1] Health check (public)..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$BASE/api/v1/health" -Method GET
Write-Host "  Status: $($health.status) | Mock: $($health.mock_mode) | Storage: $($health.apis.storage)" -ForegroundColor Green

# 2. Auth guard: unauthenticated analyze must be rejected
Write-Host "[2] Auth guard (401 without token)..." -ForegroundColor Yellow
$guardBody = @{ query = "31.42, 73.08"; sector = "textile" } | ConvertTo-Json
$code = Get-StatusCode { Invoke-RestMethod -Uri "$BASE/api/v1/facilities/analyze" -Method POST -Body $guardBody -ContentType "application/json" }
if ($code -eq 401) { Write-Host "  PASS (401)" -ForegroundColor Green } else { Write-Host "  FAIL ($code)" -ForegroundColor Red }

# 3. Admin login
Write-Host "[3] Admin login..." -ForegroundColor Yellow
$loginBody = @{ email = "admin@carbon-compass.local"; password = "admin123" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$BASE/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $login.access_token
$authHeaders = @{ Authorization = "Bearer $token" }
if ($token -and $login.user.role -eq "admin") {
  Write-Host "  PASS (role: $($login.user.role))" -ForegroundColor Green
} else {
  Write-Host "  FAIL (no token or wrong role)" -ForegroundColor Red
}

# 4. Self-serve registration (always 'user' role)
Write-Host "[4] Exporter registration (user role)..." -ForegroundColor Yellow
$suffix = Get-Random -Maximum 99999
$regBody = @{ email = "exporter$suffix@test.local"; password = "secret123"; company_name = "Test Exporter Ltd" } | ConvertTo-Json
$reg = Invoke-RestMethod -Uri "$BASE/api/v1/auth/register" -Method POST -Body $regBody -ContentType "application/json"
if ($reg.user.role -eq "user") { Write-Host "  PASS (role: user)" -ForegroundColor Green } else { Write-Host "  FAIL" -ForegroundColor Red }

# 5. Role separation: 'user' cannot seed demo data (403)
Write-Host "[5] Role separation (user blocked from admin action)..." -ForegroundColor Yellow
$userHeaders = @{ Authorization = "Bearer $($reg.access_token)" }
$code = Get-StatusCode { Invoke-RestMethod -Uri "$BASE/api/v1/admin/seed-demo" -Method POST -Headers $userHeaders }
if ($code -eq 403) { Write-Host "  PASS (403)" -ForegroundColor Green } else { Write-Host "  FAIL ($code)" -ForegroundColor Red }

# 6. Password change round-trip: old token revoked, old login rejected, new login works
Write-Host "[6] Password change (session revocation)..." -ForegroundColor Yellow
$suffix2 = Get-Random -Maximum 99999
$pwdEmail = "pwd-test-$suffix2@test.local"
$pwdRegBody = @{ email = $pwdEmail; password = "secret123"; company_name = "Pwd Test" } | ConvertTo-Json
$pwdReg = Invoke-RestMethod -Uri "$BASE/api/v1/auth/register" -Method POST -Body $pwdRegBody -ContentType "application/json"
$oldTokenHeaders = @{ Authorization = "Bearer $($pwdReg.access_token)" }
$changeBody = @{ current_password = "secret123"; new_password = "rotated456" } | ConvertTo-Json
$changed = Invoke-RestMethod -Uri "$BASE/api/v1/auth/change-password" -Method POST -Body $changeBody -ContentType "application/json" -Headers $oldTokenHeaders
$codeOldToken = Get-StatusCode { Invoke-RestMethod -Uri "$BASE/api/v1/auth/me" -Method GET -Headers $oldTokenHeaders }
$oldLoginBody = @{ email = $pwdEmail; password = "secret123" } | ConvertTo-Json
$codeOldLogin = Get-StatusCode { Invoke-RestMethod -Uri "$BASE/api/v1/auth/login" -Method POST -Body $oldLoginBody -ContentType "application/json" }
$newLoginBody = @{ email = $pwdEmail; password = "rotated456" } | ConvertTo-Json
$codeNewLogin = Get-StatusCode { Invoke-RestMethod -Uri "$BASE/api/v1/auth/login" -Method POST -Body $newLoginBody -ContentType "application/json" }
if ($codeOldToken -eq 401 -and $codeOldLogin -eq 401 -and $codeNewLogin -eq 200) {
  Write-Host "  PASS (old token 401, old password 401, new password 200)" -ForegroundColor Green
} else {
  Write-Host "  FAIL (old token=$codeOldToken, old login=$codeOldLogin, new login=$codeNewLogin)" -ForegroundColor Red
}

# 7. Brute-force lockout: 5 failed attempts lock the account (even correct password -> 429)
Write-Host "[7] Login lockout after repeated failures..." -ForegroundColor Yellow
$suffix3 = Get-Random -Maximum 99999
$lockEmail = "lock-test-$suffix3@test.local"
$lockRegBody = @{ email = $lockEmail; password = "lock12345"; company_name = "Lock Test" } | ConvertTo-Json
Invoke-RestMethod -Uri "$BASE/api/v1/auth/register" -Method POST -Body $lockRegBody -ContentType "application/json" | Out-Null
$wrongBody = @{ email = $lockEmail; password = "wrongpass" } | ConvertTo-Json
for ($i = 1; $i -le 5; $i++) {
  Invoke-RestMethod -Uri "$BASE/api/v1/auth/login" -Method POST -Body $wrongBody -ContentType "application/json" | Out-Null
}
$correctBody = @{ email = $lockEmail; password = "lock12345" } | ConvertTo-Json
$codeLocked = Get-StatusCode { Invoke-RestMethod -Uri "$BASE/api/v1/auth/login" -Method POST -Body $correctBody -ContentType "application/json" }
if ($codeLocked -eq 429) { Write-Host "  PASS (429 - correct password rejected while locked)" -ForegroundColor Green } else { Write-Host "  FAIL ($codeLocked)" -ForegroundColor Red }

# 8. Seed demo data (admin)
Write-Host "[8] Seed demo data (admin)..." -ForegroundColor Yellow
$seed = Invoke-RestMethod -Uri "$BASE/api/v1/admin/seed-demo" -Method POST -Headers $authHeaders
Write-Host "  Seeded: $($seed.seeded_count)" -ForegroundColor Green

# 9. List facilities (authenticated)
Write-Host "[9] List facilities..." -ForegroundColor Yellow
$list = Invoke-RestMethod -Uri "$BASE/api/v1/facilities" -Method GET -Headers $authHeaders
Write-Host "  Total: $($list.total)" -ForegroundColor Green

# 10. Insufficient-data guard (no fabricated score)
Write-Host "[10] Insufficient data check..." -ForegroundColor Yellow
$lahore = Invoke-RestMethod -Uri "$BASE/api/v1/facilities/cc-demo-lahore" -Method GET -Headers $authHeaders
if ($null -eq $lahore.risk_score) { Write-Host "  PASS" -ForegroundColor Green } else { Write-Host "  FAIL" -ForegroundColor Red }

# 11. PDF export (authenticated)
Write-Host "[11] PDF export..." -ForegroundColor Yellow
$pdf = Invoke-WebRequest -UseBasicParsing -Uri "$BASE/api/v1/facilities/cc-demo-faisalabad/report.pdf" -Method GET -Headers $authHeaders
if ($pdf.StatusCode -eq 200) { Write-Host "  PASS ($($pdf.RawContentLength) bytes)" -ForegroundColor Green } else { Write-Host "  FAIL" -ForegroundColor Red }

# 12. JSON analysis endpoint (full pipeline, authenticated)
Write-Host "[12] Live analysis..." -ForegroundColor Yellow
$r = Invoke-RestMethod -Uri "$BASE/api/v1/facilities/analyze" -Method POST -Body $guardBody -ContentType "application/json" -Headers $authHeaders
Write-Host "  Score: $($r.risk_score) Band: $($r.risk_band)" -ForegroundColor Green

# 13. SSE streaming analysis (progressive rendering, SRS 5.1)
Write-Host "[13] SSE streaming analysis..." -ForegroundColor Yellow
$stream = Invoke-WebRequest -UseBasicParsing -Uri "$BASE/api/v1/facilities/analyze/stream" -Method POST -Body $guardBody -ContentType "application/json" -Headers $authHeaders
$frames = ([regex]::Matches($stream.Content, "data: ")).Count
$hasInit = $stream.Content -match '"type":\s*"init"'
if ($frames -ge 10 -and $hasInit) { Write-Host "  PASS ($frames SSE frames, init event present)" -ForegroundColor Green } else { Write-Host "  FAIL ($frames frames, init=$hasInit)" -ForegroundColor Red }

# 14. Single admin account invariant
Write-Host "[14] Single admin account..." -ForegroundColor Yellow
$usersFile = Join-Path $PSScriptRoot "..\data\users.json"
$users = Get-Content $usersFile -Raw | ConvertFrom-Json
$adminCount = @($users | Where-Object { $_.role -eq "admin" }).Count
if ($adminCount -eq 1) { Write-Host "  PASS (exactly 1 admin)" -ForegroundColor Green } else { Write-Host "  FAIL ($adminCount admins)" -ForegroundColor Red }

Write-Host "=== Done ===" -ForegroundColor Cyan
