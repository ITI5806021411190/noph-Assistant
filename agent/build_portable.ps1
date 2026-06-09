param(
  [string]$Python = "python"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "Installing/refreshing Python dependencies..." -ForegroundColor Cyan
& $Python -m pip install --upgrade pip
& $Python -m pip install -r requirements.txt

Write-Host "Building portable exe..." -ForegroundColor Cyan
& $Python -m PyInstaller `
  --onefile `
  --noconsole `
  --name HealthAssistantRemoteAgent `
  health_assistant_remote_agent.py

Write-Host ""
Write-Host "Done. Portable file:" -ForegroundColor Green
Write-Host (Join-Path $ScriptDir "dist\HealthAssistantRemoteAgent.exe")
