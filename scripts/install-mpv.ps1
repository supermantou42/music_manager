$projectRoot = Split-Path -Parent $PSScriptRoot
$ErrorActionPreference = 'Stop'
$mpvTarget = Join-Path $projectRoot 'tools\mpv'
$mpvArchive = Join-Path $mpvTarget 'mpv.7z'
$mpvUrl = 'https://github.com/shinchiro/mpv-winbuild-cmake/releases/download/20261011/mpv-x86_64-20261011-git-accb7b2821.7z'
$mpvSha = 'afdf8a0422510f0dd375196ef406607984d3861cf033fc9e74ed7997c8db4700'
New-Item -ItemType Directory -Force $mpvTarget | Out-Null
& curl.exe -fL --retry 3 -o $mpvArchive $mpvUrl
if ($LASTEXITCODE -ne 0) { throw 'mpv download failed' }
if ((Get-FileHash -LiteralPath $mpvArchive -Algorithm SHA256).Hash.ToLower() -ne $mpvSha) { throw 'mpv checksum mismatch' }
& 7z.exe x $mpvArchive "-o$mpvTarget" -y
if ($LASTEXITCODE -ne 0) { throw 'mpv extraction failed (requires 7-Zip)' }
& (Join-Path $mpvTarget 'mpv.exe') --version
