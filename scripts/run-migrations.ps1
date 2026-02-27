#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run database migrations for Settlr
.DESCRIPTION
    Executes all SQL migration files in order from packages/database/migrations/
.EXAMPLE
    .\run-migrations.ps1
#>

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Running Database Migrations" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env
$envFile = Join-Path $PSScriptRoot "..\\.env"

if (-not (Test-Path $envFile)) {
    Write-Host "[ERROR] .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file from .env.example" -ForegroundColor Yellow
    exit 1
}

Write-Host "Loading environment variables..." -ForegroundColor Cyan
Get-Content $envFile | ForEach-Object {
    $line = $_
    if ($line -match '^([A-Z_]+)=(.*)$') {
        [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
    }
}

$databaseUrl = $env:DATABASE_URL

if (-not $databaseUrl) {
    Write-Host "[ERROR] DATABASE_URL not found in .env file!" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Database URL loaded" -ForegroundColor Green

# Get migration files
$migrationsPath = Join-Path $PSScriptRoot "..\packages\database\migrations"
$migrationFiles = Get-ChildItem -Path $migrationsPath -Filter "*.sql" | Sort-Object Name

if ($migrationFiles.Count -eq 0) {
    Write-Host "[ERROR] No migration files found in $migrationsPath" -ForegroundColor Red
    exit 1
}

Write-Host "`nFound $($migrationFiles.Count) migration file(s)" -ForegroundColor Cyan
Write-Host ""

# Run each migration
$successCount = 0
$migrateScript = Join-Path $PSScriptRoot "migrate.js"

foreach ($file in $migrationFiles) {
    Write-Host "Running: $($file.Name)..." -ForegroundColor Yellow
    
    try {
        # Execute SQL using psql (requires PostgreSQL client tools)
        if (Get-Command psql -ErrorAction SilentlyContinue) {
            $sqlContent = Get-Content -Path $file.FullName -Raw
            $sqlContent | psql $databaseUrl
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK] Success" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host "  [ERROR] Failed" -ForegroundColor Red
            }
        } else {
            # Fallback: use Node.js migration script
            node $migrateScript $file.FullName
            if ($LASTEXITCODE -eq 0) {
                $successCount++
            }
        }
    } catch {
        Write-Host "  [ERROR] $_" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Migration Summary" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Total migrations: $($migrationFiles.Count)" -ForegroundColor White
Write-Host "  Successful:       $successCount" -ForegroundColor Green
Write-Host "  Failed:           $($migrationFiles.Count - $successCount)" -ForegroundColor $(if ($successCount -eq $migrationFiles.Count) { "Green" } else { "Red" })
Write-Host ""

if ($successCount -eq $migrationFiles.Count) {
    Write-Host "[OK] All migrations completed successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[ERROR] Some migrations failed" -ForegroundColor Red
    exit 1
}
