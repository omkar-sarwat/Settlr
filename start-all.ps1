#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Start the entire Settlr platform with one command
.DESCRIPTION
    This script starts all backend services and the UI in development mode.
    It handles dependency installation, database migrations, and parallel service startup.
.EXAMPLE
    .\start-all.ps1
    Starts all services with default settings
.EXAMPLE
    .\start-all.ps1 -SkipInstall
    Starts all services without running npm install
.EXAMPLE
    .\start-all.ps1 -SkipMigrations
    Starts all services without running database migrations
#>

param(
    [switch]$SkipInstall,
    [switch]$SkipMigrations,
    [switch]$ProductionMode
)

# Color output functions
function Write-Step {
    param([string]$Message)
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Yellow
}

# Check if .env file exists
function Test-EnvFile {
    if (-not (Test-Path ".env")) {
        Write-Error-Custom ".env file not found!"
        Write-Info "Please create a .env file from .env.example"
        Write-Host "Run: Copy-Item .env.example .env" -ForegroundColor Yellow
        exit 1
    }
    Write-Success ".env file found"
}

# Check prerequisites
function Test-Prerequisites {
    Write-Step "Checking Prerequisites"
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Success "Node.js installed: $nodeVersion"
    } catch {
        Write-Error-Custom "Node.js not found! Please install Node.js 20+ from https://nodejs.org"
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-Success "npm installed: $npmVersion"
    } catch {
        Write-Error-Custom "npm not found!"
        exit 1
    }
}

# Install dependencies
function Install-Dependencies {
    if ($SkipInstall) {
        Write-Info "Skipping dependency installation"
        return
    }
    
    Write-Step "Installing Dependencies"
    
    # Install root dependencies (workspaces)
    Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Failed to install backend dependencies"
        exit 1
    }
    Write-Success "Backend dependencies installed"
    
    # Install UI dependencies
    Write-Host "`nInstalling UI dependencies..." -ForegroundColor Cyan
    Set-Location settlr-ui
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Failed to install UI dependencies"
        Set-Location ..
        exit 1
    }
    Set-Location ..
    Write-Success "UI dependencies installed"
}

# Run database migrations
function Invoke-Migrations {
    if ($SkipMigrations) {
        Write-Info "Skipping database migrations"
        return
    }
    
    Write-Step "Running Database Migrations"
    
    # Check if migration script exists
    if (Test-Path "scripts/run-migrations.ps1") {
        & ./scripts/run-migrations.ps1
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Custom "Migration failed"
            exit 1
        }
    } else {
        Write-Info "No migration script found, skipping..."
    }
    
    Write-Success "Database migrations completed"
}

# Start all services
function Start-AllServices {
    Write-Step "Starting All Services"
    
    Write-Host "`nStarting services in parallel..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop all services`n" -ForegroundColor Yellow
    
    # Load environment variables from .env
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([A-Z_]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
        }
    }
    

    # Service definitions
    $services = @(
        @{Name="Account Service"; Command="npm"; Args=@("run", "dev:account"); Color="Blue"},
        @{Name="Payment Service"; Command="npm"; Args=@("run", "dev:payment"); Color="Green"},
        @{Name="Admin Service"; Command="npm"; Args=@("run", "dev:admin"); Color="DarkCyan"},
        @{Name="Fraud Service"; Command="npm"; Args=@("run", "dev:fraud"); Color="Yellow"},
        @{Name="Webhook Service"; Command="npm"; Args=@("run", "dev:webhook"); Color="Magenta"},
        @{Name="Notification Service"; Command="npm"; Args=@("run", "dev:notification"); Color="Cyan"},
        @{Name="API Gateway"; Command="npm"; Args=@("run", "dev:gateway"); Color="White"}
    )
    
    # Start each service in a new PowerShell window
    foreach ($service in $services) {
        Write-Host "Starting $($service.Name)..." -ForegroundColor $service.Color
        
        $scriptBlock = "
            `$Host.UI.RawUI.WindowTitle = '$($service.Name)'
            Write-Host '========================================' -ForegroundColor $($service.Color)
            Write-Host '  $($service.Name)' -ForegroundColor $($service.Color)
            Write-Host '========================================' -ForegroundColor $($service.Color)
            Write-Host ''
            Set-Location '$PWD'
            & $($service.Command) $($service.Args -join ' ')
        "
        
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $scriptBlock
        Start-Sleep -Milliseconds 500
    }
    
    # Wait a bit for services to start
    Write-Host "`nWaiting for backend services to initialize..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
    
    # Start UI in a new window
    Write-Host "`nStarting Settlr UI..." -ForegroundColor Magenta
    $uiScript = "
        `$Host.UI.RawUI.WindowTitle = 'Settlr UI'
        Write-Host '========================================' -ForegroundColor Magenta
        Write-Host '  Settlr UI (Frontend)' -ForegroundColor Magenta
        Write-Host '========================================' -ForegroundColor Magenta
        Write-Host ''
        Set-Location '$PWD/settlr-ui'
        npm run dev
    "
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $uiScript
    
    Write-Success "All services started!"
    Write-Host ""
    Write-Host "===================================================================" -ForegroundColor Green
    Write-Host "  Settlr Platform Running" -ForegroundColor Green
    Write-Host "===================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  API Gateway:           http://localhost:3000" -ForegroundColor White
    Write-Host "  Account Service:       http://localhost:3001" -ForegroundColor Blue
    Write-Host "  Payment Service:       http://localhost:3002" -ForegroundColor Green
    Write-Host "  Admin Service:         http://localhost:3003" -ForegroundColor DarkCyan
    Write-Host "  Fraud Service:         http://localhost:3004" -ForegroundColor Yellow
    Write-Host "  Webhook Service:       http://localhost:3005" -ForegroundColor Magenta
    Write-Host "  Notification Service:  http://localhost:3006" -ForegroundColor Cyan
    Write-Host "  Settlr UI:             http://localhost:5173" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "===================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  To stop all services, close all PowerShell windows" -ForegroundColor Yellow
    Write-Host "  Or run: " -NoNewline -ForegroundColor Yellow
    Write-Host ".\stop-all.ps1" -ForegroundColor White
    Write-Host ""
}

# Main execution
try {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "  SETTLR - Complete Platform Startup" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan
    
    Test-EnvFile
    Test-Prerequisites
    Install-Dependencies
    Invoke-Migrations
    Start-AllServices
    
} catch {
    Write-Error-Custom "An error occurred: $_"
    exit 1
}
