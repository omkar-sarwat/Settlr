# Load all env vars from .env and start a service
param([string]$Service)

$envFile = Join-Path $PSScriptRoot "..\\.env"
Get-Content $envFile | ForEach-Object {
    if ($_ -match "^([A-Z_]+)=(.*)$") {
        [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
    }
}

$servicePath = "services/$Service/src/index.ts"
Write-Host "Starting $Service..."
npx tsx $servicePath
