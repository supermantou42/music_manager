$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$healthy = $false
try { $null = Invoke-RestMethod 'http://127.0.0.1:8082/health' -TimeoutSec 2; $healthy = $true } catch {}
if (-not $healthy) {
    $script = Join-Path $PSScriptRoot 'start-asr.ps1'
    Start-Process powershell.exe -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $script + '"')) -WindowStyle Hidden
}
& npm.cmd start
