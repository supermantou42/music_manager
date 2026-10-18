$projectRoot = Split-Path -Parent $PSScriptRoot
$ErrorActionPreference = 'Stop'
$release = 'b11552'
$destination = Join-Path $projectRoot 'tools\llama-cuda'
$assets = @(
    @{ Name = 'llama-b11552-bin-win-cuda-13.4-x64.zip'; Hash = '11317b2c71c9b390c1dfe6e15ad11365ea3de097cc32221236fd257f4c3ecbcf' },
    @{ Name = 'cudart-llama-bin-win-cuda-13.4-x64.zip'; Hash = '738f8c251ac22b70c3ae6f83a10cf222725df0395246a2cf58f32bdb85fbe668' }
)
foreach ($asset in $assets) {
    $archive = Join-Path $projectRoot ('tools\' + $asset.Name)
    if (-not (Test-Path -LiteralPath $archive) -or (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLower() -ne $asset.Hash) {
        & curl.exe -L --fail --connect-timeout 15 --max-time 600 --retry 2 --speed-time 30 --speed-limit 1024 ('https://github.com/ggml-org/llama.cpp/releases/download/' + $release + '/' + $asset.Name) -o $archive
        if ($LASTEXITCODE) { throw ('下载失败：' + $asset.Name) }
    }
    if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLower() -ne $asset.Hash) { throw ('SHA256 不匹配：' + $asset.Name) }
    Expand-Archive -LiteralPath $archive -DestinationPath $destination -Force
    Write-Host ('已校验并安装 ' + $asset.Name)
}
