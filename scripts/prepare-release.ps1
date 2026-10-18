$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    & (Join-Path $projectRoot 'metadata-bridge/build.ps1')
    if (-not (Test-Path 'tools/mpv/mpv.exe')) { & (Join-Path $PSScriptRoot 'install-mpv.ps1') }
    foreach ($license in @('LICENSE.GPL','LICENSE.LGPL')) {
        $licensePath = Join-Path $projectRoot ('tools/mpv/' + $license)
        if (-not (Test-Path -LiteralPath $licensePath)) {
            & curl.exe -fL --retry 3 -o $licensePath ('https://raw.githubusercontent.com/mpv-player/mpv/v0.41.0/' + $license)
            if ($LASTEXITCODE -ne 0) { throw ('mpv license download failed: ' + $license) }
        }
    }
    # The FFmpeg archive is cached but always checksum-verified and extracted.
    & (Join-Path $PSScriptRoot 'install-ffmpeg.ps1')
    foreach ($binary in @('metadata-bridge/metadata-bridge.exe','tools/mpv/mpv.exe','tools/ffmpeg/bin/ffmpeg.exe','tools/ffmpeg/bin/ffprobe.exe')) {
        if (-not (Test-Path -LiteralPath $binary)) { throw ('Missing release binary: ' + $binary) }
    }
    & npm.cmd run build:icons
    if ($LASTEXITCODE -ne 0) { throw 'Icon build failed' }
} finally { Pop-Location }
