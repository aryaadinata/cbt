@echo off
title CBT Frontend Web - Port 3005
color 0B
echo ===================================================================
echo     MENJALANKAN FRONTEND CBT WEB (PORT 3005)
echo ===================================================================
cd /d "%~dp0"
npm.cmd run dev
pause
