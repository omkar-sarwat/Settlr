#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Stop all Settlr services
.DESCRIPTION
    Kills all PowerShell windows running Settlr services and the UI
.EXAMPLE
    .\stop-all.ps1
#>

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Red
Write-Host "  🛑 Stopping All Settlr Services" -ForegroundColor Red
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Red
Write-Host ""

# Define service names to look for in window titles
$serviceNames = @(
    "Account Service",
    "Payment Service",
    "Admin Service",
    "Fraud Service",
    "Webhook Service",
    "Notification Service",
    "API Gateway",
    "Settlr UI"
)

# Get all PowerShell processes
$powershellProcesses = Get-Process -Name "powershell" -ErrorAction SilentlyContinue

$stoppedCount = 0

foreach ($process in $powershellProcesses) {
    try {
        $windowTitle = $process.MainWindowTitle
        
        # Check if the window title matches any of our services
        foreach ($serviceName in $serviceNames) {
            if ($windowTitle -like "*$serviceName*") {
                Write-Host "Stopping: $serviceName (PID: $($process.Id))" -ForegroundColor Yellow
                Stop-Process -Id $process.Id -Force
                $stoppedCount++
                break
            }
        }
    } catch {
        # Ignore errors for processes we can't access
    }
}

# Also kill any node processes that might be running our services
Write-Host "`nChecking for orphaned node processes..." -ForegroundColor Cyan

$nodePorts = @(3000, 3001, 3002, 3003, 3004, 3005, 3006, 5173)

foreach ($port in $nodePorts) {
    try {
        $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connection) {
            $processId = $connection.OwningProcess
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Stopping process on port ${port}: $($process.Name) (PID: $processId)" -ForegroundColor Yellow
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                $stoppedCount++
            }
        }
    } catch {
        # Port not in use, continue
    }
}

Write-Host ""
if ($stoppedCount -gt 0) {
    Write-Host "✓ Stopped $stoppedCount service(s)" -ForegroundColor Green
} else {
    Write-Host "ℹ No running services found" -ForegroundColor Yellow
}
Write-Host ""
