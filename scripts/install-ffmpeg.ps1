$ErrorActionPreference = 'Stop'
function Get-Sha256File([string]$File) {
    $stream = [System.IO.File]::OpenRead($File)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try { return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
    finally { $stream.Dispose(); $algorithm.Dispose() }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$archive = Join-Path $projectRoot 'tools/ffmpeg-8.1.2-essentials_build.7z'
$expected = 'e25b682664025d49034c981afb4bae36238a40f29a3cc1c713ad9a8b5b3528f6'
$destination = Join-Path $projectRoot 'tools/ffmpeg'
New-Item -ItemType Directory -Force (Split-Path -Parent $archive) | Out-Null
if (-not (Test-Path -LiteralPath $archive) -or (Get-Sha256File $archive) -ne $expected) {
    & curl.exe -fL --connect-timeout 20 --max-time 600 --retry 3 -o $archive 'https://github.com/GyanD/codexffmpeg/releases/download/8.1.2/ffmpeg-8.1.2-essentials_build.7z'
    if ($LASTEXITCODE -ne 0) { throw 'FFmpeg download failed' }
}
if ((Get-Sha256File $archive) -ne $expected) { throw 'FFmpeg SHA256 mismatch' }
$expanded = Join-Path $projectRoot 'tools/ffmpeg-download'
& 7z.exe x $archive "-o$expanded" -y
if ($LASTEXITCODE -ne 0) { throw 'FFmpeg extraction failed' }
$bundle = Get-ChildItem -LiteralPath $expanded -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'bin/ffmpeg.exe') } | Select-Object -First 1
if (-not $bundle) { throw 'FFmpeg archive is missing bin/ffmpeg.exe' }
New-Item -ItemType Directory -Force $destination | Out-Null
Copy-Item -Path (Join-Path $bundle.FullName '*') -Destination $destination -Recurse -Force
& (Join-Path $destination 'bin/ffmpeg.exe') -version
if ($LASTEXITCODE -ne 0) { throw 'FFmpeg startup failed' }
