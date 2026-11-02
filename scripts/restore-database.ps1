param(
  [Parameter(Mandatory=$true)][string]$BackupFile,
  [Parameter(Mandatory=$true)][string]$TargetDatabase,
  [switch]$ConfirmRestore,
  [string]$ProjectRoot = ""
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ProjectRoot)) { $ProjectRoot = Split-Path -Parent $PSScriptRoot }
if (-not (Test-Path -LiteralPath $BackupFile)) { throw "Backup não encontrado: $BackupFile" }
if ($TargetDatabase -eq 'pharmasmart') { throw 'Restore no banco principal pharmasmart é proibido por este script.' }
if (-not $ConfirmRestore) { throw 'Operação bloqueada. Informe -ConfirmRestore explicitamente após revisar o banco destino e o arquivo.' }
$envFile = Join-Path $ProjectRoot 'backend\.env'
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
$userName = [Uri]::UnescapeDataString($userInfo[0])
$hostName = $databaseUrl.Host
$port = if ($databaseUrl.Port -gt 0) { $databaseUrl.Port } else { 5432 }
Write-Output "BANCO DESTINO: $TargetDatabase"
Write-Output "ARQUIVO DE BACKUP: $BackupFile"
$pgRestore = Find-PostgresTool 'pg_restore'
& $pgRestore --clean --if-exists --no-owner --no-privileges --host=$hostName --port=$port --username=$userName --dbname=$TargetDatabase $BackupFile
if ($LASTEXITCODE -ne 0) { throw "pg_restore falhou com código $LASTEXITCODE." }
Write-Output 'Restore concluído.'


