@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Aziel Digital Library
set "AZIEL_PY="
py -3.14 -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>&1 && set "AZIEL_PY=py -3.14"
if not defined AZIEL_PY py -3.13 -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>&1 && set "AZIEL_PY=py -3.13"
if not defined AZIEL_PY py -3.12 -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>&1 && set "AZIEL_PY=py -3.12"
if not defined AZIEL_PY py -3.11 -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>&1 && set "AZIEL_PY=py -3.11"

if not defined AZIEL_PY python -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>&1 && set "AZIEL_PY=python"
if not defined AZIEL_PY (echo Python 3.11+ was not found. Attempting automatic Python 3.12 installation with WinGet...where winget >nul 2>&1 if errorlevel 1 goto :NO_PYTHON winget install --exact --id Python.Python.3.12 --accept-source-agreements --accept-package-agreements if errorlevel 1 goto :NO_PYTHON set "PY312=%LocalAppData%\Programs\Python\Python312\python.exe" if exist "%PY312%" set AZIEL_PY="%PY312%" if not defined AZIEL_PY py -3.12 -c "import sys" >nul 2>&1 && set "AZIEL_PY=py -3.12" if not defined AZIEL_PY python -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>&1 && set "AZIEL_PY=python"

)
if not defined AZIEL_PY goto :NO_PYTHON
if "%AZIEL_LIBRARY_PATH%"=="" set "AZIEL_LIBRARY_PATH=%CD%\aziel_library_data"

if "%AZIEL_RUNTIME_HOME%"=="" set "AZIEL_RUNTIME_HOME=%CD%\runtime_assets"
echo Starting Aziel Digital Library...%AZIEL_PY% aziel_launcher.py
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (echo.echo Aziel exited with code %RC%.echo See runtime_assets\launcher_bootstrap.log for optional-engine setup details.pause)

exit /b %RC%
:NO_PYTHON
echo.echo Automatic Python installation was unavailable or unsuccessful.echo Install Python 3.11 or newer, then double-click this file again.echo https://www.python.org/downloads/windows/pause
exit /b 2
