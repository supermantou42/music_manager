param([ValidateRange(1,32)][int]$Parallel = 32, [int]$Port = 8082, [switch]$Cpu, [ValidateRange(0,262144)][int]$ContextSize = 0)
$ErrorActionPreference = 'Stop'
$folder = if ($Cpu) { 'tools\llama' } else { 'tools\llama-cuda' }
$root = Join-Path $PSScriptRoot $folder
$exe = Join-Path $root 'llama-server.exe'
if (-not (Test-Path -LiteralPath $exe)) {
    $found = Get-ChildItem -LiteralPath $root -Filter llama-server.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $exe = $found.FullName } else { throw 'GPU 运行库尚未安装，请运行 install-asr-gpu.ps1；CPU 回退可使用 start-asr.ps1 -Cpu' }
}
if ($ContextSize -eq 0) { $ContextSize = $Parallel * 2048 }
$arguments = @('-m', 'D:\models\gguf\Qwen3-ASR-1.7B-Q8_0.gguf', '--mmproj', 'D:\models\gguf\mmproj-Qwen3-ASR-1.7B-Q8_0.gguf', '--host', '127.0.0.1', '--port', "$Port", '-c', "$ContextSize", '--parallel', "$Parallel")
if (-not $Cpu) { $arguments += @('--device', 'CUDA0', '--n-gpu-layers', '99') }
& $exe @arguments
if ($LASTEXITCODE) { throw ('模型服务退出：' + $LASTEXITCODE) }
