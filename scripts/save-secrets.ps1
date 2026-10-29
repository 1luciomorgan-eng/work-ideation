$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$config = [Console]::In.ReadToEnd() | ConvertFrom-Json
$encrypted = @{}
foreach ($property in $config.PSObject.Properties) {
  $encrypted[$property.Name] = ConvertTo-SecureString $property.Value -AsPlainText -Force
}
New-Item -ItemType Directory -Force -Path (Join-Path $taskRoot '.local') | Out-Null
$encrypted | Export-Clixml -LiteralPath (Join-Path $taskRoot '.local/secrets.clixml')
Write-Output 'Credentials encrypted for the current Windows user. No values logged.'
