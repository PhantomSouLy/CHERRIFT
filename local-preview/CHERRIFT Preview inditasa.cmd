@echo off
chcp 65001 > nul
setlocal
cd /d "%~dp0.."
where node >nul 2>&1
if errorlevel 1 (
 echo.
 echo Node.js nincs telepitve vagy nem erheto el a PATH-ban.
 echo Telepitsd a Node.js 24+ valtozatat: https://nodejs.org/
 echo Ezutan inditsd ujra ezt a .cmd fajlt.
 pause
 exit /b 1
)
node "local-preview\preview-server.mjs"
if errorlevel 1 pause
