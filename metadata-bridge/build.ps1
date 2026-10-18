$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    & go build -mod=vendor -trimpath -o metadata-bridge.exe .
    if ($LASTEXITCODE -ne 0) { throw 'Go build failed' }
} finally { Pop-Location }
