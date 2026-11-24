@echo off
title Sistem CBT - Stop Servers
color 0C

echo ===================================================================
echo     MENGHENTIKAN LAYANAN SERVER CBT (PORT 5005 ^& PORT 3005)
echo ===================================================================
echo.

echo [*] Menghentikan Backend API CBT di Port 5005...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5005 ^| findstr LISTENING') do (
    taskkill /F /T /PID %%a >nul 2>&1
    echo     [OK] Berhasil menghentikan proses Port 5005 (PID: %%a)
)

echo [*] Menghentikan Frontend Web CBT di Port 3005...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3005 ^| findstr LISTENING') do (
    taskkill /F /T /PID %%a >nul 2>&1
    echo     [OK] Berhasil menghentikan proses Port 3005 (PID: %%a)
)

echo.
echo ===================================================================
echo   SELURUH SERVER CBT TELAH BERHASIL DIHENTIKAN.
echo ===================================================================
echo.
pause
