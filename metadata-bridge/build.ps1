$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    $go = if ($env:MUSIC_GO) { $env:MUSIC_GO } else { (Get-Command go -ErrorAction Stop).Source }
    $version = & $go version
    if ($version -notmatch 'go(\d+\.\d+)' -or [version]$Matches[1] -lt [version]'1.25') {
        $moduleCache = (& $go env GOMODCACHE).Trim()
        $cached = Get-ChildItem -LiteralPath (Join-Path $moduleCache 'golang.org') -Directory -Filter 'toolchain@v0.0.1-go*.windows-amd64' -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match '-go(\d+\.\d+\.\d+)\.windows-amd64$' -and [version]$Matches[1] -ge [version]'1.25' } |
            Sort-Object { [version](($_.Name -split '-go')[1] -replace '\.windows-amd64$','') } -Descending | Select-Object -First 1
        if (-not $cached) { throw 'Go 1.25+ is required. Install it or set MUSIC_GO to its go.exe path.' }
        $go = Join-Path $cached.FullName 'bin/go.exe'
    }
    & $go test -mod=vendor .
    if ($LASTEXITCODE -ne 0) { throw 'Go adapter tests failed' }
    & $go build -mod=vendor -trimpath -o metadata-bridge.exe .
    if ($LASTEXITCODE -ne 0) { throw 'Go build failed' }
} finally { Pop-Location }
