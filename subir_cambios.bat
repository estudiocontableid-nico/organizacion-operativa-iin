@echo off
title Subir Cambios a GitHub - Organizacion Operativa IIN
color 0a
echo ========================================================
echo   SUBIENDO CAMBIOS A GITHUB
echo ========================================================
echo.
cd /d "%~dp0"
git push origin main
echo.
echo ========================================================
echo Listo! Vercel detectara el commit y actualizara la web.
echo ========================================================
pause
