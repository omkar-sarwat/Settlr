#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Check health status of all Settlr services
.DESCRIPTION
    Pings all service health endpoints and displays status
.EXAMPLE
    .\check-health.ps1
#>

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  🏥 Settlr Services Health Check" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$services = @(
    @{Name="API Gateway"; Url="http://localhost:3000/health"},
    @{Name="Account Service"; Url="http://localhost:3001/health"},
    @{Name="Payment Service"; Url="http://localhost:3002/health"},
    @{Name="Admin Service"; Url="http://localhost:3003/health"},
    @{Name="Fraud Service"; Url="http://localhost:3004/health"},
    @{Name="Webhook Service"; Url="http://localhost:3005/health"},
    @{Name="Notification Service"; Url="http://localhost:3006/health"},
    @{Name="Settlr UI"; Url="http://localhost:5173"}
)

$healthyCount = 0
$unhealthyCount = 0

foreach ($service in $services) {
    Write-Host "$($service.Name)".PadRight(25) -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri $service.Url -TimeoutSec 2 -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ HEALTHY" -ForegroundColor Green
            $healthyCount++
        } else {
            Write-Host "⚠ DEGRADED (Status: $($response.StatusCode))" -ForegroundColor Yellow
            $unhealthyCount++
        }
    } catch {
        Write-Host "✗ DOWN" -ForegroundColor Red
        $unhealthyCount++
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Healthy:   " -NoNewline
Write-Host "$healthyCount / $($services.Count)" -ForegroundColor $(if ($healthyCount -eq $services.Count) { "Green" } else { "Yellow" })
Write-Host "  Unhealthy: " -NoNewline
Write-Host "$unhealthyCount / $($services.Count)" -ForegroundColor $(if ($unhealthyCount -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($healthyCount -eq $services.Count) {
    Write-Host "✓ All services are healthy!" -ForegroundColor Green
    exit 0
} elseif ($healthyCount -gt 0) {
    Write-Host "⚠ Some services are unhealthy" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✗ All services are down" -ForegroundColor Red
    Write-Host "  Run: .\start-all.ps1 to start services" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
