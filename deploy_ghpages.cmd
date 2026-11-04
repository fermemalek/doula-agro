@echo off
echo ====================================================
echo   Deploiement Doula Agro vers GitHub et GitHub Pages
echo ====================================================
echo.

echo 1/3 Compilation du projet (Vite build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERREUR] La compilation a echoue.
    pause
    exit /b %errorlevel%
)

copy /y dist\index.html dist\404.html >nul

echo.
echo 2/3 Synchronisation de la branche principale (main)...
git push origin main

echo.
echo 3/3 Mise en ligne sur GitHub Pages (gh-pages)...
npx gh-pages -d dist

echo.
echo ====================================================
echo   Deploiement termine avec succes !
echo   Lien : https://fermemalek.github.io/doula-agro/
echo ====================================================
pause
