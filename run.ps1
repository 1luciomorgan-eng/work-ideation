param([Parameter(ValueFromRemainingArguments=$true)][string[]]$TaskArgs)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$secretPath = Join-Path $PSScriptRoot '.local/secrets.clixml'
if (Test-Path -LiteralPath $secretPath) {
  $secrets = Import-Clixml -LiteralPath $secretPath
  foreach ($name in $secrets.Keys) {
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secrets[$name])
    try { [Environment]::SetEnvironmentVariable($name, [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr), 'Process') }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  }
}
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) { $nodePath = $node.Source }
else { $nodePath = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' }
if (!$TaskArgs -or $TaskArgs[0] -eq 'start') { & $nodePath src/server.mjs }
elseif ($TaskArgs[0] -eq 'publish') { & $nodePath src/publish.mjs }
else { & $nodePath src/cli.mjs @TaskArgs }
exit $LASTEXITCODE
