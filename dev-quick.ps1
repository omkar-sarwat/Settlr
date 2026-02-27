#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Quick development mode (assumes setup is done)
.DESCRIPTION
    Starts all services without running npm install or migrations (fast daily development)
.EXAMPLE
    .\dev-quick.ps1
#>

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host "  ⚡ Quick Dev Mode - Starting Settlr..." -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host ""

# Check .env exists
if (-not (Test-Path ".env")) {
    Write-Host "✗ .env file not found!" -ForegroundColor Red
    Write-Host "Run: Copy-Item .env.example .env" -ForegroundColor Yellow
    exit 1
}

# Load environment variables
Get-Content ".env" | ForEach-Object {
    if ($_ -match "^([A-Z_]+)=(.*)$") {
        [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
    }
}

Write-Host "Starting services..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Service definitions with colors
$services = @(
    @{Name="Account Service"; Command="npm"; Args=@("run", "dev:account"); Color="Blue"},
    @{Name="Payment Service"; Command="npm"; Args=@("run", "dev:payment"); Color="Green"},
    @{Name="Fraud Service"; Command="npm"; Args=@("run", "dev:fraud"); Color="Yellow"},
    @{Name="Webhook Service"; Command="npm"; Args=@("run", "dev:webhook"); Color="Magenta"},
    @{Name="Notification Service"; Command="npm"; Args=@("run", "dev:notification"); Color="Cyan"},
    @{Name="API Gateway"; Command="npm"; Args=@("run", "dev:gateway"); Color="White"}
)

# Start backend services in new windows
foreach ($service in $services) {
    Write-Host "→ $($service.Name)" -ForegroundColor $service.Color
    
    $scriptBlock = "
        `$Host.UI.RawUI.WindowTitle = '$($service.Name)'
        Write-Host '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' -ForegroundColor $($service.Color)
        Write-Host '  $($service.Name)' -ForegroundColor $($service.Color)
        Write-Host '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' -ForegroundColor $($service.Color)
        Set-Location '$PWD'
        & $($service.Command) $($service.Args -join ' ')
    "
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $scriptBlock
    Start-Sleep -Milliseconds 300
}

Start-Sleep -Seconds 3

# Start UI
Write-Host "`n→ Settlr UI" -ForegroundColor Magenta
$uiScript = "
    `$Host.UI.RawUI.WindowTitle = 'Settlr UI'
    Write-Host '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' -ForegroundColor Magenta
    Write-Host '  Settlr UI' -ForegroundColor Magenta
    Write-Host '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' -ForegroundColor Magenta
    Set-Location '$PWD/settlr-ui'
    npm run dev
"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $uiScript

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  ✓ All services started!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "  Settlr UI:  http://localhost:5173" -ForegroundColor Magenta
Write-Host "  API:        http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "  To stop: " -NoNewline -ForegroundColor Yellow
Write-Host ".\stop-all.ps1" -ForegroundColor White
Write-Host ""
