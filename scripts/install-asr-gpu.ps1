param([string]$DestinationRoot)
$projectRoot = if ($DestinationRoot) { [System.IO.Path]::GetFullPath($DestinationRoot) } else { Split-Path -Parent $PSScriptRoot }
New-Item -ItemType Directory -Force (Join-Path $projectRoot 'tools') | Out-Null
$ErrorActionPreference = 'Stop'
function Get-Sha256File([string]$File) {
    $stream = [System.IO.File]::OpenRead($File)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try { return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
    finally { $stream.Dispose(); $algorithm.Dispose() }
}

$release = 'b11552'
$destination = Join-Path $projectRoot 'tools\llama-cuda'
$assets = @(
    @{ Name = 'llama-b11552-bin-win-cuda-13.4-x64.zip'; Hash = '11317b2c71c9b390c1dfe6e15ad11365ea3de097cc32221236fd257f4c3ecbcf' },
    @{ Name = 'cudart-llama-bin-win-cuda-13.4-x64.zip'; Hash = '738f8c251ac22b70c3ae6f83a10cf222725df0395246a2cf58f32bdb85fbe668' }
)
foreach ($asset in $assets) {
    $archive = Join-Path $projectRoot ('tools\' + $asset.Name)
    if (-not (Test-Path -LiteralPath $archive) -or (Get-Sha256File $archive) -ne $asset.Hash) {
        & curl.exe -L --fail --connect-timeout 15 --max-time 600 --retry 2 --speed-time 30 --speed-limit 1024 ('https://github.com/ggml-org/llama.cpp/releases/download/' + $release + '/' + $asset.Name) -o $archive
        if ($LASTEXITCODE) { throw ('下载失败：' + $asset.Name) }
    }
    if ((Get-Sha256File $archive) -ne $asset.Hash) { throw ('SHA256 不匹配：' + $asset.Name) }
    Expand-Archive -LiteralPath $archive -DestinationPath $destination -Force
    Write-Host ('已校验并安装 ' + $asset.Name)
}
