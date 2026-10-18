$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    & go mod tidy
    if ($LASTEXITCODE -ne 0) { throw 'Go dependency installation failed' }
    & go build -trimpath -o metadata-bridge.exe .
    if ($LASTEXITCODE -ne 0) { throw 'Go build failed' }
} finally { Pop-Location }
