@echo off
title Enviar Controle Operacional para o GitHub
echo ==============================================================================
echo [1/2] Preparando Git e arquivos locais...
echo ==============================================================================

set "GIT_EXE=%LOCALAPPDATA%\Git\cmd\git.exe"

if not exist "%GIT_EXE%" (
    echo [ERRO] Git nao encontrado em %GIT_EXE%
    pause
    exit /b 1
)

"%GIT_EXE%" branch -M main
"%GIT_EXE%" remote remove origin 2>nul
"%GIT_EXE%" remote add origin https://github.com/robymarvila/controle-frota-app.git
"%GIT_EXE%" add .
"%GIT_EXE%" commit -m "feat: App Nativo Android Capacitor com rastreamento GPS e Actions" 2>nul

echo ==============================================================================
echo [2/2] Enviando para o GitHub (https://github.com/robymarvila/controle-frota-app.git)...
echo.
echo Se solicitado, faca o login na janela do navegador que se abrir.
echo ==============================================================================

"%GIT_EXE%" push -u origin main --force

if %errorlevel% neq 0 (
    echo.
    echo [AVISO] Se o push falhar por autenticacao, gere um Personal Access Token no GitHub
    echo ou instale o GitHub Desktop.
    pause
    exit /b %errorlevel%
)

echo.
echo ==============================================================================
echo [SUCESSO!] Todos os arquivos foram enviados para o GitHub com sucesso!
echo.
echo Acesse https://github.com/robymarvila/controle-frota-app/actions
echo para ver o seu APK sendo gerado automaticamente!
echo ==============================================================================
pause
