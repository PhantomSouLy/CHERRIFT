@echo off
setlocal
cd /d "%~dp0"

if not exist "index.html" (
  echo [ERROR] index.html nem talalhato.
  echo A BAT fajlt a CHERRIFT repo gyokerebol futtasd.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p='index.html';" ^
  "$s=[System.IO.File]::ReadAllText($p);" ^
  "$targets=@('src/cherrift_supabase_timeout_fix.js?v=097singleton1','src/cherrift_supabase_timeout_fix.js?v=097singleton2');" ^
  "$new='src/cherrift_supabase_timeout_fix.js?v=0977lock1';" ^
  "if($s.Contains($new)){Write-Host '[OK] Cache-bust mar be van allitva.'; exit 0};" ^
  "$changed=$false;" ^
  "foreach($old in $targets){if($s.Contains($old)){$s=$s.Replace($old,$new);$changed=$true}};" ^
  "if(-not $changed){Write-Host '[ERROR] A vart script sor nem talalhato az index.html-ben.'; exit 2};" ^
  "[System.IO.File]::WriteAllText($p,$s,(New-Object System.Text.UTF8Encoding($false)));" ^
  "Write-Host '[OK] index.html cache-bust -> v=0977lock1'"

if errorlevel 1 (
  echo.
  echo Nem tortent mas modositas.
  pause
  exit /b 1
)

echo.
echo Kesz. Commit/deploy utan Ctrl+F5 vagy privat ablak.
pause
