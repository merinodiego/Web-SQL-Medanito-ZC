@echo off
title Portal de Datos SCADA
cd /d "C:\Web SQL\backend"
echo ==========================================
echo   Portal de Datos SCADA - iniciando...
echo   Dejar esta ventana ABIERTA mientras se use.
echo   Ctrl+C para detener.
echo ==========================================
echo.
node index.js
echo.
echo *** El portal se detuvo. Revisa el mensaje de arriba. ***
pause
