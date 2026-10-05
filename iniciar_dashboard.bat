@echo off
title Servidor Dashboard IIN - Calendario Operativo
color 0b
echo ========================================================
echo   INICIANDO DASHBOARD LOCAL - CALENDARIO OPERATIVO IIN
echo ========================================================
echo.
cd /d "%~dp0"
echo Abriendo servidor Vite en puerto local...
echo.
call npm run dev
pause
