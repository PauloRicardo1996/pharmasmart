param(
  [string]$ProjectRoot = ""
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ProjectRoot)) { $ProjectRoot = Split-Path -Parent $PSScriptRoot }
$envFile = Join-Path $ProjectRoot 'backend\.env'
if (-not (Test-Path -LiteralPath $envFile)) { throw "Arquivo de ambiente não encontrado: $envFile" }

function Read-DotEnvValue([string]$Name) {
  $line = Get-Content -LiteralPath $envFile | Where-Object { $_ -match "^$Name=" } | Select-Object -First 1
  if (-not $line) { throw "Variável $Name não encontrada em backend/.env" }
  return (($line -replace "^$Name=", '').Trim().Trim('"'))
}

function Find-PostgresTool([string]$Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  $known = "C:\Program Files\PostgreSQL\18\bin\$Name.exe"
  if (Test-Path -LiteralPath $known) { return $known }
  throw "$Name não está disponível no PATH nem em C:\Program Files\PostgreSQL\18\bin."
}

$databaseUrl = [Uri](Read-DotEnvValue 'DATABASE_URL')
$userInfo = $databaseUrl.UserInfo.Split(':', 2)
$env:PGPASSWORD = [Uri]::UnescapeDataString($userInfo[1])
$hostName = $databaseUrl.Host
$port = if ($databaseUrl.Port -gt 0) { $databaseUrl.Port } else { 5432 }
$userName = [Uri]::UnescapeDataString($userInfo[0])
$databaseName = $databaseUrl.AbsolutePath.TrimStart('/')
$outputDirectory = Join-Path $ProjectRoot 'backup'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$outputFile = Join-Path $outputDirectory "pharmasmart_${timestamp}.dump"
$pgDump = Find-PostgresTool 'pg_dump'

& $pgDump --format=custom --file=$outputFile --host=$hostName --port=$port --username=$userName --dbname=$databaseName --no-owner --no-privileges
if ($LASTEXITCODE -ne 0) { throw "pg_dump falhou com código $LASTEXITCODE." }
if (-not (Test-Path -LiteralPath $outputFile)) { throw 'O arquivo de backup não foi criado.' }
$size = (Get-Item -LiteralPath $outputFile).Length
if ($size -le 0) { throw 'O arquivo de backup está vazio.' }
Write-Output "Backup criado: $outputFile"
Write-Output "Tamanho: $size bytes"


