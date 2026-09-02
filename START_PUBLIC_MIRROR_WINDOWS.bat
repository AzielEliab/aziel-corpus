@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Aziel Digital Library - Public Mirror
set "MIRROR=%~1"
if "%MIRROR%"=="" set "MIRROR=%CD%\aziel_public_mirror"
set "AZIEL_PY="
py -3.14 -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>&1 && set "AZIEL_PY=py -3.14"
if not defined AZIEL_PY py -3.13 -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>&1 && set "AZIEL_PY=py -3.13"
if not defined AZIEL_PY py -3.12 -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>&1 && set "AZIEL_PY=py -3.12"
if not defined AZIEL_PY py -3.11 -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>&1 && set "AZIEL_PY=py -3.11"
if not defined AZIEL_PY python -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>&1 && set "AZIEL_PY=python"
if not defined AZIEL_PY (echo Python 3.11+ was not found. Start the private master once with START_AZIEL_WINDOWS.bat or install Python 3.11+.pause exit /b 2)
if not exist "%MIRROR%\library.sqlite3" (echo Mirror snapshot not found: "%MIRROR%" echo Publish a mirror from the private master first.pause exit /b 4)
%AZIEL_PY% aziel_launcher.py --mode mirror --vault "%MIRROR%" --host 0.0.0.0 --no-browser
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" pause
exit /b %RC%
