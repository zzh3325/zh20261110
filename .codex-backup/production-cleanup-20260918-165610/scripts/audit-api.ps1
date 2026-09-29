$ErrorActionPreference = 'Stop'
$apiBase = 'http://10.20.148.252:9191'
$doc = Invoke-RestMethod "$apiBase/v3/api-docs" -TimeoutSec 20
$checks = @()
Get-ChildItem "$PSScriptRoot/../src/api" -Filter '*.ts' | ForEach-Object {
  $source = Get-Content -Raw -LiteralPath $_.FullName
  foreach ($match in [regex]::Matches($source, '(?s)http\.(get|post|put|delete)(?:<[^;]*?>)?\(\s*[''"`]+(/[^''"`\s]+)')) {
    $method = $match.Groups[1].Value
    $route = ($match.Groups[2].Value -replace '\$\{[^}]+\}', '{id}').Split('?')[0]
    $found = @($doc.paths.PSObject.Properties | Where-Object {
      ($_.Name -replace '\{[^}]+\}', '{id}') -eq $route -and $_.Value.$method
    })
    $checks += [pscustomobject]@{ file = $_.Name; method = $method; path = $route; exists = ($found.Count -gt 0) }
  }
}
$checks | ConvertTo-Json -Depth 4
foreach ($path in @('/admin/inspections/save','/admin/inspections/update','/get/sensor-points/{id}/data','/get/qimmos/meteo/data','/api/streams/{id}/live')) {
  [pscustomobject]@{path=$path; definition=$doc.paths.$path} | ConvertTo-Json -Depth 15 -Compress
}
if ($checks.exists -contains $false) { throw '存在不匹配的接口路径或方法' }
