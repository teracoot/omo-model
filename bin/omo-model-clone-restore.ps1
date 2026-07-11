param(
  [Parameter(Mandatory=$true)][string]$RecipientHome,
  [Parameter(Mandatory=$true)][switch]$AcknowledgeSecrets
)
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'Windows is required' }
if (-not $AcknowledgeSecrets) { throw 'Explicit secret acknowledgement is required' }
if (-not [IO.Path]::IsPathRooted($RecipientHome)) { throw 'Recipient home must be absolute' }

function Assert-SafeChain([string]$Path,[bool]$Leaf) {
  $current = [IO.Path]::GetPathRoot($Path)
  foreach ($part in $Path.Substring($current.Length).Split([IO.Path]::DirectorySeparatorChar,[StringSplitOptions]::RemoveEmptyEntries)) {
    $current = Join-Path $current $part
    if (-not (Test-Path -LiteralPath $current)) { throw "Missing path component" }
    $item = Get-Item -LiteralPath $current -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Reparse path is forbidden' }
  }
  $item = Get-Item -LiteralPath $Path -Force
  if ($Leaf -and $item.PSIsContainer) { throw 'Expected regular file' }
  if (-not $Leaf -and -not $item.PSIsContainer) { throw 'Expected directory' }
  if ($Leaf) {
    $links = @(& fsutil hardlink list $Path 2>$null)
    if ($LASTEXITCODE -ne 0 -or $links.Count -ne 1) { throw 'File must have one hard link' }
  }
}

function Get-Lines([object]$Value) {
  return @($Value | ForEach-Object { "$_".Trim() } | Where-Object { $_.Length -gt 0 })
}

function Test-Field([string[]]$Lines,[string]$Name,[string]$Expected) {
  $prefix = "$Name`:"
  $matches = @($Lines | Where-Object { $_.StartsWith($prefix,[StringComparison]::Ordinal) })
  return $matches.Count -eq 1 -and $matches[0].Substring($prefix.Length).Trim() -ceq $Expected
}

$recipient = (Resolve-Path -LiteralPath $RecipientHome).Path
$config = Join-Path $recipient '.config\opencode'
$launchers = Join-Path $recipient '.local\bin'
$clone = Split-Path -Parent $PSCommandPath
foreach ($root in @($recipient,$config,$launchers,$clone)) { Assert-SafeChain $root $false }
if (Get-Process -Name opencode -ErrorAction SilentlyContinue) { throw 'Close every OpenCode process first' }

$manifestPath = Join-Path $clone 'manifest.json'
Assert-SafeChain $manifestPath $true
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
$expectedFiles = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($descriptor in $manifest.entries) {
  $relative = $descriptor.archivePath.Substring('omo-model-clone/'.Length).Replace('/',[IO.Path]::DirectorySeparatorChar)
  $payload = [IO.Path]::GetFullPath((Join-Path $clone $relative))
  if (-not $payload.StartsWith($clone + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Payload escaped clone root' }
  Assert-SafeChain $payload $true
  $item = Get-Item -LiteralPath $payload
  if ($item.Length -ne $descriptor.bytes) { throw 'Payload byte count mismatch' }
  if ((Get-FileHash -LiteralPath $payload -Algorithm SHA256).Hash.ToLowerInvariant() -ne $descriptor.sha256) { throw 'Payload hash mismatch' }
  [void]$expectedFiles.Add($payload)
}
foreach ($file in Get-ChildItem -LiteralPath $clone -File -Recurse) {
  if ($file.FullName -ne $manifestPath -and -not $expectedFiles.Contains($file.FullName)) { throw 'Unexpected extracted payload' }
}
& node (Join-Path $clone 'validate-clone.mjs') $clone *> $null
if ($LASTEXITCODE -ne 0) { throw 'Clone validation failed' }

$backupParent = Join-Path $recipient '.omo-model-clone-backups'
if (Test-Path -LiteralPath $backupParent) { Assert-SafeChain $backupParent $false }
else { New-Item -ItemType Directory -Path $backupParent | Out-Null; Assert-SafeChain $backupParent $false }
$backup = Join-Path $backupParent (Get-Date -Format 'yyyyMMdd-HHmmss-fff')
New-Item -ItemType Directory -Path $backup | Out-Null
Assert-SafeChain $backup $false
$map = Join-Path $backup 'backup-map.tsv'
$saved = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)

function Save-Destination([string]$Destination) {
  if (-not $saved.Add($Destination)) { return }
  if (Test-Path -LiteralPath $Destination) {
    Assert-SafeChain $Destination $true
    $copy = Join-Path $backup (([guid]::NewGuid().ToString()) + '-' + [IO.Path]::GetFileName($Destination))
    Copy-Item -LiteralPath $Destination -Destination $copy
    "$Destination`t$copy" | Add-Content -LiteralPath $map
  } else { "$Destination`tNEW_FILE" | Add-Content -LiteralPath $map }
}

function Copy-Atomic([string]$Source,[string]$Destination) {
  $temp = "$Destination.$([guid]::NewGuid()).tmp"
  Copy-Item -LiteralPath $Source -Destination $temp
  Move-Item -LiteralPath $temp -Destination $Destination -Force
}

function Invoke-Rollback {
  if (-not (Test-Path -LiteralPath $map)) { return }
  foreach ($row in @(Get-Content -LiteralPath $map)) {
    $destination,$source = $row -split "`t",2
    if ($source -eq 'NEW_FILE') { if (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Force } }
    else { Copy-Item -LiteralPath $source -Destination $destination -Force }
  }
}

$oldHome = $env:HOME
$oldProfile = $env:USERPROFILE
try {
  $families = @(
    @('opencode.jsonc','opencode.json'),
    @('oh-my-openagent.jsonc','oh-my-openagent.json','oh-my-opencode.jsonc','oh-my-opencode.json'),
    @('tui.jsonc','tui.json'), @('dcp.jsonc','dcp.json'))
  foreach ($family in $families) {
    $sourceName = @($family | Where-Object { Test-Path -LiteralPath (Join-Path $clone "config\$_") }) | Select-Object -First 1
    foreach ($peer in $family) { $destination=Join-Path $config $peer; if (Test-Path -LiteralPath $destination) { Save-Destination $destination } }
    if ($sourceName) {
      $active = Join-Path $config $sourceName
      Save-Destination $active
      Copy-Atomic (Join-Path $clone "config\$sourceName") $active
    }
    foreach ($peer in $family | Where-Object { $_ -ne $sourceName }) { $path=Join-Path $config $peer; if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force } }
  }
  foreach ($name in @('omo-model.ps1','omo-model.cmd')) {
    $destination=Join-Path $launchers $name; Save-Destination $destination
    Copy-Atomic (Join-Path $clone "launchers\$name") $destination
  }
  $env:HOME = $recipient
  $env:USERPROFILE = $recipient
  & opencode debug config *> $null; if ($LASTEXITCODE -ne 0) { throw 'Config validation failed' }
  $modelLines = Get-Lines (& opencode models 2>&1); if ($LASTEXITCODE -ne 0) { throw 'Route validation failed' }
  foreach ($route in $manifest.metadata.expectedRoutes) { if ($modelLines -cnotcontains $route) { throw 'Missing expected route' } }
  foreach ($name in $manifest.metadata.agentNames) {
    & opencode debug agent $name *> $null
    if ($LASTEXITCODE -ne 0) { throw 'Agent validation failed' }
  }
  if ($null -ne $manifest.metadata.current) {
    $currentLines = Get-Lines (& (Join-Path $launchers 'omo-model.ps1') --current 2>&1)
    if (-not (Test-Field $currentLines 'model' $manifest.metadata.current.model)) { throw 'Current route validation failed' }
    if ($null -ne $manifest.metadata.current.variant -and -not (Test-Field $currentLines 'variant' $manifest.metadata.current.variant)) { throw 'Current route validation failed' }
    if ($null -ne $manifest.metadata.current.profile -and -not (Test-Field $currentLines 'profile' $manifest.metadata.current.profile)) { throw 'Current route validation failed' }
    if ($LASTEXITCODE -ne 0) { throw 'Current route validation failed' }
  }
} catch { Invoke-Rollback; throw }
finally { $env:HOME=$oldHome; $env:USERPROFILE=$oldProfile }
Write-Warning "Restore complete. Keep backup at $backup, restart OpenCode, and adjust or disable machine-specific IDA MCP paths."
