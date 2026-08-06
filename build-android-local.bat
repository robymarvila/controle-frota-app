@echo off
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
echo [3/3] Compilando APK via Gradle...
echo ==============================================================================
cd android
call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo [AVISO] Se o build falhar por falta de JDK 17/Android SDK local,
    echo abra a pasta 'android' no Android Studio e clique em 'Build > Build APK(s)'.
    cd ..
    pause
    exit /b %errorlevel%
)
cd ..

echo ==============================================================================
echo [SUCESSO] APK gerado com sucesso em:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo ==============================================================================
pause
