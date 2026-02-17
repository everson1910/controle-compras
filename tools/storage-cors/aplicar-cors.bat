@echo off
set BUCKET=gs://controle-compras-ab501.firebasestorage.app

echo ==========================
echo Aplicando CORS no bucket:
echo %BUCKET%
echo ==========================

gcloud auth login
gcloud config set project controle-compras-ab501

gsutil cors set cors.json %BUCKET%

echo.
echo ==========================
echo PRONTO. CORS aplicado.
echo ==========================
pause
