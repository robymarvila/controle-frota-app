@echo off
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%
set ANDROID_HOME=C:\Android\Sdk
set ANDROID_SDK_ROOT=C:\Android\Sdk

echo ==============================================================================
echo [1/3] Compilando assets web do projeto (Vite)...
echo ==============================================================================
call npm run build
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao executar npm run build.
    pause
    exit /b %errorlevel%
)

echo ==============================================================================
echo [2/3] Sincronizando com o projeto nativo Android (Capacitor)...
echo ==============================================================================
call npx cap sync android
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao executar npx cap sync android.
    pause
    exit /b %errorlevel%
)

echo ==============================================================================
echo [3/3] Compilando APK Release Oficial (Assinado) via Gradle...
echo ==============================================================================
cd android
call gradlew.bat assembleRelease
if %errorlevel% neq 0 (
    echo [ERRO] Falha na compilacao do Gradle.
    cd ..
    pause
    exit /b %errorlevel%
)
cd ..

echo ==============================================================================
echo [SUCESSO] APK Release Assinado gerado com sucesso em:
echo android\app\build\outputs\apk\release\app-release.apk
echo ==============================================================================
pause
