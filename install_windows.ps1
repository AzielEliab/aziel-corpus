$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (-not $env:AZIEL_RUNTIME_HOME) { $env:AZIEL_RUNTIME_HOME = Join-Path $PSScriptRoot "runtime_assets" }$py = Get-Command py -ErrorAction SilentlyContinue
if (-not $py) {$python = Get-Command python -ErrorAction SilentlyContinue if (-not $python) {$winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) { throw "Python 3.11+ is required and winget is unavailable." }
    winget install --exact --id Python.Python.3.14 --accept-source-agreements --accept-package-agreements}
}
try { py -3 -m aziel_library.bootstrap --profile ocr --auto } catch { python -m aziel_library.bootstrap --profile ocr --auto }
try { py -3 -m unittest discover -s tests -v } catch { python -m unittest discover -s tests -v }
