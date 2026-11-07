@echo off
title Doula Agro
cd /d "%~dp0"

echo ==============================================
echo       Lancement de Doula Agro
echo ==============================================

netstat -ano | findstr :8080 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [*] Demarrage du serveur local...
    start "" /b cmd /c "npm run dev"
    timeout /t 3 /nobreak >nul
) else (
    echo [*] Le serveur est deja actif.
)

echo [*] Ouverture de l'application dans votre navigateur...
start http://localhost:8080/#/
exit

