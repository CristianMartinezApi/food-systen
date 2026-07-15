@echo off
setlocal

net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo Solicitando permissao de administrador...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo ==========================================================
echo   Removendo o Agente de Impressao 80mm (Servico do Windows)
echo ==========================================================
echo.

node uninstall-service.js

echo.
pause
