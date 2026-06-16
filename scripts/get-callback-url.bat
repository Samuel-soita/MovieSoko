@echo off
echo Creating public HTTPS callback URL for M-Pesa sandbox...
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Invoke-RestMethod -Uri 'https://webhook.site/token' -Method POST).uuid"') do set UUID=%%i
echo.
echo Add this to your .env file:
echo MPESA_CALLBACK_URL=https://webhook.site/%UUID%
echo MPESA_SANDBOX_CALLBACK_URL=https://webhook.site/%UUID%
echo.
echo View callbacks at: https://webhook.site/#!/%UUID%
echo Then restart: npm start
