@echo off
setlocal

:: Verifica se ja esta rodando como Administrador; se nao, pede elevacao (UAC)
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo Solicitando permissao de administrador...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo ==========================================================
echo   Instalando o Agente de Impressao 80mm como Servico
echo ==========================================================
echo.

if not exist ".env" (
    echo [ERRO] Arquivo .env nao encontrado nesta pasta.
    echo.
    echo Antes de continuar:
    echo   1. Copie o arquivo .env.example e renomeie para .env
    echo   2. Abra o .env e preencha BACKEND_URL e PRINTER_TOKEN
    echo   3. Rode este instalador de novo
    echo.
    pause
    exit /b 1
)

echo [1/3] Instalando dependencias (pode demorar um pouco)...
call npm install
if errorlevel 1 goto erro

echo.
echo [2/3] Compilando o agente...
call npm run build
if errorlevel 1 goto erro

echo.
echo [3/3] Instalando e iniciando o servico do Windows...
node install-service.js
if errorlevel 1 goto erro

echo.
echo Tudo pronto! O agente de impressao vai iniciar sozinho sempre
echo que este computador ligar. Nao precisa deixar nada aberto.
echo.
pause
exit /b 0

:erro
echo.
echo [ERRO] Algo deu errado durante a instalacao. Revise as mensagens acima.
pause
exit /b 1
