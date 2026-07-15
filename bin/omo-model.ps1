$ErrorActionPreference = 'Stop'

$OhMyConfigCandidates = @(
  (Join-Path $env:USERPROFILE '.config\opencode\oh-my-openagent.jsonc'),
  (Join-Path $env:USERPROFILE '.config\opencode\oh-my-openagent.json'),
  (Join-Path $env:USERPROFILE '.config\opencode\oh-my-opencode.jsonc'),
  (Join-Path $env:USERPROFILE '.config\opencode\oh-my-opencode.json')
)
$BaseConfigCandidates = @(
  (Join-Path $env:USERPROFILE '.config\opencode\opencode.jsonc'),
  (Join-Path $env:USERPROFILE '.config\opencode\opencode.json')
)
$BackupDir = Join-Path $env:USERPROFILE '.config\opencode\profile-backups'

# Profile numbers are assigned automatically as 0..N-1 in list order.
# Do not hardcode sparse Ids: add/remove entries and renumbering is automatic.
$Profiles = @(
  # TSNUI group
  [ordered]@{
    Name = 'TSNUI GPT-5.5 xhigh'
    Model = 'ai.tsnui.com/gpt-5.5'
    ModelName = 'GPT-5.5 (TSNUI)'
    Variant = 'xhigh'
    ReasoningEffort = 'xhigh'
    ProviderConcurrency = 'ai.tsnui.com'
    ModelConcurrency = 'ai.tsnui.com/gpt-5.5'
  },
  [ordered]@{
    Name = 'TSNUI GPT-5.6 Sol Medium'
    Model = 'ai.tsnui.com/gpt-5.6-sol'
    ModelName = 'GPT-5.6 Sol (TSNUI)'
    Variant = 'medium'
    ReasoningEffort = 'medium'
    ProviderConcurrency = 'ai.tsnui.com'
    ModelConcurrency = 'ai.tsnui.com/gpt-5.6-sol'
  },
  [ordered]@{
    Name = 'TSNUI GPT-5.6 Sol High'
    Model = 'ai.tsnui.com/gpt-5.6-sol'
    ModelName = 'GPT-5.6 Sol (TSNUI)'
    Variant = 'high'
    ReasoningEffort = 'high'
    ProviderConcurrency = 'ai.tsnui.com'
    ModelConcurrency = 'ai.tsnui.com/gpt-5.6-sol'
  },
  [ordered]@{
    Name = 'TSNUI GPT-5.6 Sol XHigh'
    Model = 'ai.tsnui.com/gpt-5.6-sol'
    ModelName = 'GPT-5.6 Sol (TSNUI)'
    Variant = 'xhigh'
    ReasoningEffort = 'xhigh'
    ProviderConcurrency = 'ai.tsnui.com'
    ModelConcurrency = 'ai.tsnui.com/gpt-5.6-sol'
  },
  [ordered]@{
    Name = 'TSNUI GPT-5.6 Sol Max'
    Model = 'ai.tsnui.com/gpt-5.6-sol'
    ModelName = 'GPT-5.6 Sol (TSNUI)'
    Variant = 'max'
    ReasoningEffort = 'max'
    ProviderConcurrency = 'ai.tsnui.com'
    ModelConcurrency = 'ai.tsnui.com/gpt-5.6-sol'
  },
  # PQAPI group
  [ordered]@{
    Name = 'GPT-5.6 Terra Max (PQAPI)'
    Model = 'www.pqapi.space/gpt-5.6-terra'
    ProviderName = 'PQAPI'
    ModelName = 'GPT-5.6 Terra Max (PQAPI)'
    Variant = 'max'
    ReasoningEffort = 'max'
    ProviderConcurrency = 'www.pqapi.space'
    ModelConcurrency = 'www.pqapi.space/gpt-5.6-terra'
  },
  [ordered]@{
    Name = 'GPT-5.6 Sol Max (PQAPI)'
    Model = 'www.pqapi.space/gpt-5.6-sol'
    ProviderName = 'PQAPI'
    ModelName = 'GPT-5.6 Sol Max (PQAPI)'
    Variant = 'max'
    ReasoningEffort = 'max'
    ProviderConcurrency = 'www.pqapi.space'
    ModelConcurrency = 'www.pqapi.space/gpt-5.6-sol'
  },
  [ordered]@{
    Name = 'GPT-5.5 XHigh (PQAPI)'
    Model = 'www.pqapi.space/gpt-5.5'
    ProviderName = 'PQAPI'
    ModelName = 'GPT-5.5 XHigh (PQAPI)'
    Variant = 'xhigh'
    ReasoningEffort = 'xhigh'
    ProviderConcurrency = 'www.pqapi.space'
    ModelConcurrency = 'www.pqapi.space/gpt-5.5'
  },
  [ordered]@{
    Name = 'GPT-5.6 Terra Max (PQAPI(sub2api))'
    Model = 'pqapi:sub2api/gpt-5.6-terra'
    ProviderName = 'PQAPI(sub2api)'
    ModelName = 'GPT-5.6 Terra Max (PQAPI)'
    Variant = 'max'
    ReasoningEffort = 'max'
    ProviderConcurrency = 'pqapi:sub2api'
    ModelConcurrency = 'pqapi:sub2api/gpt-5.6-terra'
  },
  [ordered]@{
    Name = 'GPT-5.6 Sol Max (PQAPI(sub2api))'
    Model = 'pqapi:sub2api/gpt-5.6-sol'
    ProviderName = 'PQAPI(sub2api)'
    ModelName = 'GPT-5.6 Sol Max (PQAPI)'
    Variant = 'max'
    ReasoningEffort = 'max'
    ProviderConcurrency = 'pqapi:sub2api'
    ModelConcurrency = 'pqapi:sub2api/gpt-5.6-sol'
  },
  [ordered]@{
    Name = 'GPT-5.5 XHigh (PQAPI(sub2api))'
    Model = 'pqapi:sub2api/gpt-5.5'
    ProviderName = 'PQAPI(sub2api)'
    ModelName = 'GPT-5.5 XHigh (PQAPI)'
    Variant = 'xhigh'
    ReasoningEffort = 'xhigh'
    ProviderConcurrency = 'pqapi:sub2api'
    ModelConcurrency = 'pqapi:sub2api/gpt-5.5'
  },
  # Other routes
  [ordered]@{
    Name = 'Claude Free'
    Model = 'claude-free/claude-free'
    ProviderName = 'opus-free'
    ModelName = 'opus-free'
    Variant = 'max'
    ReasoningEffort = $null
    ProviderConcurrency = 'claude-free'
    ModelConcurrency = 'claude-free/claude-free'
  },
  [ordered]@{
    Name = 'Free ChatGPT'
    Model = 'gpt-free/gpt-5.6-sol'
    ProviderName = 'Free ChatGPT'
    ModelName = 'GPT-5.6 Sol Max (Free ChatGPT)'
    Variant = 'max'
    ReasoningEffort = 'max'
    ProviderConcurrency = 'gpt-free'
    ModelConcurrency = 'gpt-free/gpt-5.6-sol'
  },
  [ordered]@{
    Name = 'Grok 4.5 High'
    Model = 'grok:oracle:sub2api/grok-4.5'
    ProviderName = 'Grok (Sub2API)'
    ModelName = 'Grok 4.5'
    Variant = 'high'
    ReasoningEffort = 'high'
    ProviderConcurrency = 'grok:oracle:sub2api'
    ModelConcurrency = 'grok:oracle:sub2api/grok-4.5'
  }
)

function Initialize-ProfileIds {
  for ($i = 0; $i -lt $Profiles.Count; $i++) {
    $Profiles[$i].Id = $i
  }
}

Initialize-ProfileIds

function Show-Usage {
  @'
omo-model - switch OpenCode and OhMy model routing profiles

Usage:
  omo-model --list           Show current route and numbered profiles
  omo-model -l               Same as --list
  omo-model --current        Show merged OpenCode and OhMy routing state
  omo-model -c               Same as --current
  omo-model --routes         Show configured OpenCode provider/model routes
  omo-model --use <number>   Switch OpenCode and OhMy routing to profile number
  omo-model -u <number>      Same as --use
  omo-model --help           Show help

Examples:
  omo-model --list
  omo-model --use 0
  omo-model -u 1

Note: profile numbers are always 0..N-1 in list order (auto-renumbered when profiles change).
Note: switching while OpenCode is running is supported. Existing processes and sessions keep their loaded routing; start a new OpenCode process to use the selected profile.
'@
}

function Read-JsonFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing file: $Path"
  }
  $raw = [System.IO.File]::ReadAllText($Path, [System.Text.UTF8Encoding]::new($false))
  return $raw | ConvertFrom-Json
}

function Resolve-BaseConfigPath {
  foreach ($path in $BaseConfigCandidates) {
    if (Test-Path -LiteralPath $path) {
      return $path
    }
  }

  throw "Missing OpenCode config. Checked: $($BaseConfigCandidates -join ', ')"
}

function Resolve-OhMyConfigPath {
  foreach ($path in $OhMyConfigCandidates) {
    if (Test-Path -LiteralPath $path) {
      return $path
    }
  }

  throw "Missing OhMy config. Checked: $($OhMyConfigCandidates -join ', ')"
}

function Write-JsonNoBom([string]$Path, $Value) {
  $json = $Value | ConvertTo-Json -Depth 100
  [System.IO.File]::WriteAllText($Path, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
}

function Set-JsonProperty([object]$Object, [string]$Name, $Value) {
  if ($Object.PSObject.Properties.Name -contains $Name) {
    $Object.$Name = $Value
  } else {
    $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
  }
}

function New-ConfigBackup([string]$Path, [string]$Label) {
  if (-not (Test-Path -LiteralPath $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
  }

  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
  $extension = if ([System.IO.Path]::GetExtension($Path) -eq '.jsonc') { 'jsonc' } else { 'json' }
  $backupPath = Join-Path $BackupDir ("$Label.$stamp.bak.$extension")
  $counter = 1
  while (Test-Path -LiteralPath $backupPath) {
    $backupPath = Join-Path $BackupDir ("$Label.$stamp.$counter.bak.$extension")
    $counter++
  }

  Copy-Item -LiteralPath $Path -Destination $backupPath
  return $backupPath
}

function Write-OpenCodeHotSwapWarning {
  $processes = @(Get-Process -Name 'opencode' -ErrorAction SilentlyContinue)
  if ($processes.Count -eq 0) { return }

  $processIds = @($processes | ForEach-Object { $_.Id } | Sort-Object -Unique)
  $pidLabel = if ($processIds.Count -eq 1) { 'PID' } else { 'PIDs' }
  Write-Warning "OpenCode is running ($pidLabel`: $($processIds -join ', ')). The switch will continue. Existing processes and sessions keep their loaded routing; start a new OpenCode process to use the selected profile."
}

function Get-ProfileIdForModel([string]$Model, [string]$Variant, [string]$Effort) {
  Initialize-ProfileIds
  foreach ($profile in $Profiles) {
    $profileEffort = if ($null -eq $profile.ReasoningEffort) { '<unset>' } else { [string]$profile.ReasoningEffort }
    if ($profile.Model -eq $Model -and $profile.Variant -eq $Variant -and $profileEffort -eq $Effort) {
      return [int]$profile.Id
    }
  }
  return $null
}

function Get-ProfileById([int]$Id) {
  Initialize-ProfileIds
  if ($Id -lt 0 -or $Id -ge $Profiles.Count) {
    return $null
  }
  return $Profiles[$Id]
}

function Get-RoutingSummary([object]$Base, [object]$Config) {
  $agents = if ($Config.PSObject.Properties.Name -contains 'agents' -and $null -ne $Config.agents) { @($Config.agents.PSObject.Properties) } else { @() }
  $categories = if ($Config.PSObject.Properties.Name -contains 'categories' -and $null -ne $Config.categories) { @($Config.categories.PSObject.Properties) } else { @() }
  $baseAgents = if ($Base.PSObject.Properties.Name -contains 'agent' -and $null -ne $Base.agent) { @($Base.agent.PSObject.Properties) } else { @() }
  $models = [System.Collections.Generic.List[string]]::new()
  $variants = [System.Collections.Generic.List[string]]::new()
  $efforts = [System.Collections.Generic.List[string]]::new()

  foreach ($name in @('model', 'small_model')) {
    $value = if ($Base.PSObject.Properties.Name -contains $name -and -not [string]::IsNullOrWhiteSpace([string]$Base.$name)) { [string]$Base.$name } else { '<unset>' }
    $models.Add($value)
  }
  foreach ($prop in $baseAgents) {
    if ($null -eq $prop.Value) { continue }
    $propertyNames = @($prop.Value.PSObject.Properties.Name)
    $hasRoutingOverride = ($propertyNames -contains 'model') -or ($propertyNames -contains 'variant') -or ($propertyNames -contains 'reasoningEffort')
    if (-not $hasRoutingOverride) { continue }
    if ($propertyNames -contains 'model' -and -not [string]::IsNullOrWhiteSpace([string]$prop.Value.model)) {
      $models.Add([string]$prop.Value.model)
    }
    $variant = if ($propertyNames -contains 'variant' -and -not [string]::IsNullOrWhiteSpace([string]$prop.Value.variant)) { [string]$prop.Value.variant } else { '<unset>' }
    $effort = if ($propertyNames -contains 'reasoningEffort' -and -not [string]::IsNullOrWhiteSpace([string]$prop.Value.reasoningEffort)) { [string]$prop.Value.reasoningEffort } else { '<unset>' }
    $variants.Add($variant)
    $efforts.Add($effort)
  }
  foreach ($prop in @($agents + $categories)) {
    if ($null -eq $prop.Value) { continue }
    $propertyNames = @($prop.Value.PSObject.Properties.Name)
    $model = if ($propertyNames -contains 'model' -and -not [string]::IsNullOrWhiteSpace([string]$prop.Value.model)) { [string]$prop.Value.model } else { '<unset>' }
    $variant = if ($propertyNames -contains 'variant' -and -not [string]::IsNullOrWhiteSpace([string]$prop.Value.variant)) { [string]$prop.Value.variant } else { '<unset>' }
    $effort = if ($propertyNames -contains 'reasoningEffort' -and -not [string]::IsNullOrWhiteSpace([string]$prop.Value.reasoningEffort)) { [string]$prop.Value.reasoningEffort } else { '<unset>' }
    $models.Add($model)
    $variants.Add($variant)
    $efforts.Add($effort)
  }

  $allModels = @($models | Sort-Object -Unique)
  $allVariants = @($variants | Sort-Object -Unique)
  $allEfforts = @($efforts | Sort-Object -Unique)
  $primaryModel = if ($allModels.Count -eq 1) { $allModels[0] } elseif ($allModels.Count -eq 0) { '<unset>' } else { '<mixed>' }
  $primaryVariant = if ($allVariants.Count -eq 1) { $allVariants[0] } elseif ($allVariants.Count -eq 0) { '<unset>' } else { '<mixed>' }
  $primaryEffort = if ($allEfforts.Count -eq 1) { $allEfforts[0] } elseif ($allEfforts.Count -eq 0) { '<unset>' } else { '<mixed>' }

  return [pscustomobject][ordered]@{
    AgentCount = $agents.Count
    CategoryCount = $categories.Count
    Model = $primaryModel
    Variant = $primaryVariant
    Effort = $primaryEffort
  }
}

function Get-CurrentSummary {
  $baseConfigPath = Resolve-BaseConfigPath
  $configPath = Resolve-OhMyConfigPath
  $routing = Get-RoutingSummary (Read-JsonFile $baseConfigPath) (Read-JsonFile $configPath)
  return [pscustomobject][ordered]@{
    ConfigPath = $configPath
    BaseConfigPath = $baseConfigPath
    AgentCount = $routing.AgentCount
    CategoryCount = $routing.CategoryCount
    Model = $routing.Model
    Variant = $routing.Variant
    Effort = $routing.Effort
    ProfileId = Get-ProfileIdForModel $routing.Model $routing.Variant $routing.Effort
  }
}

function Show-Current {
  $summary = Get-CurrentSummary
  Write-Output "Current routing state:"
  $profile = if ($null -ne $summary.ProfileId) { Get-ProfileById ([int]$summary.ProfileId) } else { $null }
  if ($null -ne $profile) {
    Write-Output ("  [{0}] {1}" -f $profile.Id, $profile.Name)
  } else {
    Write-Output "  [custom/mixed]"
  }
  Write-Output ("  model:   {0}" -f $summary.Model)
  Write-Output ("  variant: {0}" -f $summary.Variant)
  Write-Output ("  effort:  {0}" -f $summary.Effort)
  Write-Output ("  agents:  {0}" -f $summary.AgentCount)
  Write-Output ("  categories: {0}" -f $summary.CategoryCount)
}

function Show-List {
  Initialize-ProfileIds
  Show-Current
  $summary = Get-CurrentSummary
  Write-Output ''
  Write-Output 'Available profiles:'
  foreach ($p in $Profiles) {
    $currentMarker = ''
    if ($null -ne $summary.ProfileId -and [int]$summary.ProfileId -eq [int]$p.Id) { $currentMarker = '  (current)' }
    Write-Output ("  [{0}] {1}{2}" -f $p.Id, $p.Name, $currentMarker)
    Write-Output ("      model:   {0}" -f $p.Model)
    Write-Output ("      variant: {0}" -f $p.Variant)
  }
}

function Show-Routes {
  $base = Read-JsonFile (Resolve-BaseConfigPath)
  $routes = @(
    foreach ($provider in $base.provider.PSObject.Properties) {
      foreach ($model in $provider.Value.models.PSObject.Properties) {
        "$($provider.Name)/$($model.Name)"
      }
    }
  )
  $routes | Sort-Object
}


function Test-OmoPlugin([object]$Value) {
  return $Value -eq 'oh-my-opencode' -or $Value -eq 'oh-my-openagent'
}

function Test-HasOmoPlugin([object]$Config) {
  if (-not ($Config.PSObject.Properties.Name -contains 'plugin') -or $null -eq $Config.plugin) {
    return $false
  }

  foreach ($item in @($Config.plugin)) {
    if (Test-OmoPlugin $item) { return $true }
  }

  return $false
}

function Test-RemoveAllBaseOmo([string]$BaseConfigPath) {
  $jsonPath = Join-Path $env:USERPROFILE '.config\opencode\opencode.json'
  $jsoncPath = Join-Path $env:USERPROFILE '.config\opencode\opencode.jsonc'
  if ($BaseConfigPath -ne $jsonPath -or -not (Test-Path -LiteralPath $jsoncPath)) {
    return $false
  }

  return Test-HasOmoPlugin (Read-JsonFile $jsoncPath)
}

function Clear-DuplicateOmoPlugins([object]$BaseConfig, [bool]$RemoveAllOmo) {
  if (-not ($BaseConfig.PSObject.Properties.Name -contains 'plugin') -or $null -eq $BaseConfig.plugin) {
    return $false
  }

  $plugins = @($BaseConfig.plugin)
  $hasOpenAgent = $plugins -contains 'oh-my-openagent'
  $keptOmo = $false
  $changed = $false
  $next = [System.Collections.Generic.List[object]]::new()

  foreach ($item in $plugins) {
    if (-not (Test-OmoPlugin $item)) {
      $next.Add($item)
      continue
    }

    if ($RemoveAllOmo -or $keptOmo -or ($hasOpenAgent -and $item -ne 'oh-my-openagent')) {
      $changed = $true
      continue
    }

    $next.Add($item)
    $keptOmo = $true
  }

  if ($changed) {
    $BaseConfig.plugin = @($next.ToArray())
  }

  return $changed
}
function Switch-Profile([int]$Id) {
  $profile = Get-ProfileById $Id
  if ($null -eq $profile) {
    throw "Invalid profile number: $Id. Run 'omo-model --list' to see valid numbers (0..$($Profiles.Count - 1))."
  }
  Write-OpenCodeHotSwapWarning
  $baseConfigPath = Resolve-BaseConfigPath
  $configPath = Resolve-OhMyConfigPath
  $cfg = Read-JsonFile $configPath
  $base = Read-JsonFile $baseConfigPath

  if ($profile.DisableOhMyPlugin) {
    $baseCleanupChanged = Clear-DuplicateOmoPlugins $base (Test-RemoveAllBaseOmo $baseConfigPath)
    $backupPath = $null
    if ($baseCleanupChanged) {
      $backupPath = New-ConfigBackup $baseConfigPath 'opencode.disable-ohmy-plugin'
      Write-JsonNoBom $baseConfigPath $base
    }
    Write-Output ("Applied profile [{0}] {1}" -f $profile.Id, $profile.Name)
    if ($baseCleanupChanged) {
      Write-Output '  cleaned duplicate OMO plugin entries from opencode config'
      Write-Output ("Backup: {0}" -f $backupPath)
    } else {
      Write-Output '  no duplicate OMO plugin entries found in opencode config'
    }
    Write-Output 'Start a new OpenCode session so OpenCode reloads plugins.'
    return
  }

  $providerId = $profile.Model.Split('/')[0]
  $modelId = ($profile.Model -split '/', 2)[1]
  if (-not $base.provider.$providerId) {
    throw "Target provider '$providerId' is not configured in opencode config: $baseConfigPath"
  }
  if (-not $base.provider.$providerId.models.$modelId) {
    throw "Target model '$($profile.Model)' is not configured in opencode config: $baseConfigPath"
  }
  if ($profile.Contains('ProviderName')) {
    if ($profile.ProviderName -isnot [string]) {
      throw "Invalid provider display name for profile '$($profile.Name)'"
    }
    Set-JsonProperty $base.provider.$providerId 'name' $profile.ProviderName
  }
  Set-JsonProperty $base.provider.$providerId.models.$modelId 'name' $profile.ModelName
  if (-not ($cfg.PSObject.Properties.Name -contains 'agents') -or $null -eq $cfg.agents) {
    throw "OhMy config has no 'agents' object: $configPath"
  }
  if (-not ($cfg.PSObject.Properties.Name -contains 'categories') -or $null -eq $cfg.categories) {
    throw "OhMy config has no 'categories' object: $configPath"
  }
  if (-not ($cfg.PSObject.Properties.Name -contains 'background_task') -or $null -eq $cfg.background_task) {
    $cfg | Add-Member -NotePropertyName background_task -NotePropertyValue ([pscustomobject]@{})
  }
  if (-not ($cfg.background_task.PSObject.Properties.Name -contains 'providerConcurrency') -or $null -eq $cfg.background_task.providerConcurrency) {
    $cfg.background_task | Add-Member -NotePropertyName providerConcurrency -NotePropertyValue ([pscustomobject]@{})
  }
  if (-not ($cfg.background_task.PSObject.Properties.Name -contains 'modelConcurrency') -or $null -eq $cfg.background_task.modelConcurrency) {
    $cfg.background_task | Add-Member -NotePropertyName modelConcurrency -NotePropertyValue ([pscustomobject]@{})
  }

  Set-JsonProperty $base 'model' $profile.Model
  Set-JsonProperty $base 'small_model' $profile.Model
  if ($base.PSObject.Properties.Name -contains 'agent' -and $null -ne $base.agent) {
    foreach ($prop in $base.agent.PSObject.Properties) {
      if ($null -eq $prop.Value) { continue }
      $propertyNames = @($prop.Value.PSObject.Properties.Name)
      $hasModel = ($propertyNames -contains 'model') -and -not [string]::IsNullOrWhiteSpace([string]$prop.Value.model)
      $hasRoutingOverride = $hasModel -or ($propertyNames -contains 'variant') -or ($propertyNames -contains 'reasoningEffort')
      if (-not $hasRoutingOverride) { continue }
      if ($hasModel) { Set-JsonProperty $prop.Value 'model' $profile.Model }
      Set-JsonProperty $prop.Value 'variant' $profile.Variant
      if ($null -eq $profile.ReasoningEffort) {
        if ($prop.Value.PSObject.Properties.Name -contains 'reasoningEffort') {
          $prop.Value.PSObject.Properties.Remove('reasoningEffort')
        }
      } else {
        Set-JsonProperty $prop.Value 'reasoningEffort' $profile.ReasoningEffort
      }
    }
  }

  foreach ($prop in $cfg.agents.PSObject.Properties) {
    $prop.Value.model = $profile.Model
    $prop.Value.variant = $profile.Variant
    if ($null -eq $profile.ReasoningEffort) {
      if ($prop.Value.PSObject.Properties.Name -contains 'reasoningEffort') {
        $prop.Value.PSObject.Properties.Remove('reasoningEffort')
      }
    } else {
      if ($prop.Value.PSObject.Properties.Name -contains 'reasoningEffort') {
        $prop.Value.reasoningEffort = $profile.ReasoningEffort
      } else {
        $prop.Value | Add-Member -NotePropertyName reasoningEffort -NotePropertyValue $profile.ReasoningEffort
      }
    }
  }

  foreach ($prop in $cfg.categories.PSObject.Properties) {
    $prop.Value.model = $profile.Model
    $prop.Value.variant = $profile.Variant
    if ($null -eq $profile.ReasoningEffort) {
      if ($prop.Value.PSObject.Properties.Name -contains 'reasoningEffort') {
        $prop.Value.PSObject.Properties.Remove('reasoningEffort')
      }
    } else {
      if ($prop.Value.PSObject.Properties.Name -contains 'reasoningEffort') {
        $prop.Value.reasoningEffort = $profile.ReasoningEffort
      } else {
        $prop.Value | Add-Member -NotePropertyName reasoningEffort -NotePropertyValue $profile.ReasoningEffort
      }
    }
  }

  $providerConcurrency = [ordered]@{}
  $providerConcurrency[$profile.ProviderConcurrency] = 5
  $modelConcurrency = [ordered]@{}
  $modelConcurrency[$profile.ModelConcurrency] = 5
  $cfg.background_task.providerConcurrency = [pscustomobject]$providerConcurrency
  $cfg.background_task.modelConcurrency = [pscustomobject]$modelConcurrency

  $routing = Get-RoutingSummary $base $cfg
  $expectedEffort = if ($null -eq $profile.ReasoningEffort) { '<unset>' } else { [string]$profile.ReasoningEffort }
  if ($routing.Model -ne $profile.Model -or $routing.Variant -ne $profile.Variant -or $routing.Effort -ne $expectedEffort) {
    throw "Routing verification failed for profile '$($profile.Name)'"
  }
  if ($profile.Contains('ProviderName') -and $base.provider.$providerId.name -ne $profile.ProviderName) {
    throw "Provider display-name verification failed for profile '$($profile.Name)'"
  }
  if ($base.provider.$providerId.models.$modelId.name -ne $profile.ModelName) {
    throw "Model display-name verification failed for profile '$($profile.Name)'"
  }

  $baseBackupPath = New-ConfigBackup $baseConfigPath 'opencode'
  $ohMyBackupPath = New-ConfigBackup $configPath 'oh-my-openagent'
  $baseOriginal = [System.IO.File]::ReadAllBytes($baseConfigPath)
  $ohMyOriginal = [System.IO.File]::ReadAllBytes($configPath)
  try {
    Write-JsonNoBom $baseConfigPath $base
    Write-JsonNoBom $configPath $cfg
  } catch {
    $writeError = $_
    [System.IO.File]::WriteAllBytes($baseConfigPath, $baseOriginal)
    [System.IO.File]::WriteAllBytes($configPath, $ohMyOriginal)
    throw $writeError
  }

  Write-Output ("Switched OpenCode and OhMy routing to [{0}] {1}" -f $profile.Id, $profile.Name)
  Write-Output ("  model:   {0}" -f $profile.Model)
  Write-Output ("  variant: {0}" -f $profile.Variant)
  Write-Output ("OpenCode backup: {0}" -f $baseBackupPath)
  Write-Output ("OhMy backup: {0}" -f $ohMyBackupPath)
  Write-Output 'Existing OpenCode processes and sessions keep their loaded routing. Start a new OpenCode process to use this profile.'
}

if ($args.Count -eq 0) {
  Show-Usage
  exit 0
}

switch -Regex ($args[0]) {
  '^(--help|-h)$' { Show-Usage; exit 0 }
  '^(--list|-l)$' { Show-List; exit 0 }
  '^(--current|-c)$' { Show-Current; exit 0 }
  '^--routes$' { Show-Routes; exit 0 }
  '^(--use|-u)$' {
    if ($args.Count -lt 2) { throw 'Missing profile number after --use/-u' }
    $index = 0
    if (-not [int]::TryParse($args[1], [ref]$index)) {
      throw "Profile number must be an integer: $($args[1])"
    }
    Switch-Profile $index
    exit 0
  }
  default {
    throw "Unknown argument: $($args[0]). Run 'omo-model --help'."
  }
}
