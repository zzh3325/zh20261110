param([Parameter(Mandatory)][string]$Username, [Parameter(Mandatory)][securestring]$Password)
$ErrorActionPreference = 'Stop'
$apiBase = 'http://10.20.148.252:9191'
$key = Invoke-RestMethod "$apiBase/public-key" -SessionVariable apiSession -TimeoutSec 20
$keyText = if ($key.data -is [string]) { $key.data } else { $key.data.publicKey }
$rsa = [System.Security.Cryptography.RSA]::Create()
if ($keyText -notmatch 'BEGIN') { $keyText = "-----BEGIN PUBLIC KEY-----`n$keyText`n-----END PUBLIC KEY-----" }
$rsa.ImportFromPem($keyText)
$credential = [System.Net.NetworkCredential]::new('', $Password)
$bytes = [Text.Encoding]::UTF8.GetBytes(([guid]::NewGuid().ToString('N').Substring(0,3)) + $credential.Password)
$encrypted = $rsa.Encrypt($bytes, [System.Security.Cryptography.RSAEncryptionPadding]::Pkcs1)
[Array]::Clear($bytes, 0, $bytes.Length)
$login = Invoke-RestMethod "$apiBase/login" -WebSession $apiSession -Method Post -ContentType 'application/json' -Body (@{username=$Username;password=[Convert]::ToBase64String($encrypted)} | ConvertTo-Json) -TimeoutSec 20
$token = [string]$login.message
if ($token.Split('.').Count -ne 3) { throw "登录失败：业务码 $($login.code)" }
$headers = @{Authorization="Bearer $token";token=$token}
$pointResponse = Invoke-RestMethod "$apiBase/get/sensor-points" -Headers $headers -WebSession $apiSession -TimeoutSec 20
$pointId = [string]$pointResponse.data[0].id
$paths = @("/get/sensor-points/$pointId/data?page=0&size=1",'/get/reservoirs/1','/get/qimmos/meteo/data?page=0&size=1','/get/sensor-points','/get/sensor-points/data?page=0&size=1','/get/alert','/get/inspections','/api/streams','/api/streams/1/live','/userInfo')
$paths += @('/get/device','/get/qimmos/total-station/points?page=0&size=1','/get/qimmos/total-station/periods?page=0&size=1','/get/qimmos/total-station/data?page=0&size=1','/get/ims/gnss/data?page=0&size=1','/get/daqiao/recdata?page=0&size=1','/get/monitor-points','/get/manual-data','/get/asset-locations','/api/cameras','/api/incidents','/get/alert/search','/get/alert/thresholds/search','/get/alert/push-rules/search','/get/alert/push-records/search','/get/alert/methods/search','/get/files')
foreach ($path in $paths) {
  try {
    $r = Invoke-WebRequest ($apiBase+$path) -Headers $headers -WebSession $apiSession -TimeoutSec 20
    $body = $r.Content | ConvertFrom-Json
    $data = if ($body.PSObject.Properties.Name -contains 'data') { $body.data } else { $body }
    if ($data.PSObject.Properties.Name -contains 'content') { $data = $data.content }
    $first = @($data)[0]
    [pscustomobject]@{path=$path;http=$r.StatusCode;code=$body.code;count=@($data).Count;fields=@($first.PSObject.Properties.Name)} | ConvertTo-Json -Compress
    if ($path -like '/get/sensor-points/*/data?*') { $first | ConvertTo-Json -Depth 6 -Compress }
    if ($path -like '/api/streams/*/live') { "streamStatus=$($body.status)" }
  } catch { [pscustomobject]@{path=$path;error=$_.Exception.Message} | ConvertTo-Json -Compress }
}
foreach ($samplePath in @('/get/ims/gnss/data?page=0&size=1','/get/monitor-points','/get/qimmos/total-station/points?page=0&size=1')) {
  try {
    $sample = Invoke-RestMethod ($apiBase+$samplePath) -Headers $headers -WebSession $apiSession -TimeoutSec 20
    $sampleData = if ($sample.PSObject.Properties.Name -contains 'data') { $sample.data } else { $sample }
    if ($sampleData.PSObject.Properties.Name -contains 'content') { $sampleData=$sampleData.content }
    $first = @($sampleData)[0]
    if ($samplePath -like '*monitor-points*' -and $null -eq $first.id) { throw "未获取设备 id，顶层字段：$($sample.PSObject.Properties.Name -join ',')；数据字段：$($sampleData.PSObject.Properties.Name -join ',')" }
    $related = if ($samplePath -like '*gnss*') { "/get/ims/gnss/displacement?stationId=$($first.stationId)&projectId=$($first.projectId)&page=0&size=1" } elseif ($samplePath -like '*monitor-points*') { "/get/monitor-points/$($first.id)/logs?page=0&size=1" } else { "/get/qimmos/total-station/data?pointId=$($first.pointId)&projectId=$($first.projectId)&page=0&size=1" }
    $r = Invoke-WebRequest ($apiBase+$related) -Headers $headers -WebSession $apiSession -TimeoutSec 20
    $body = $r.Content | ConvertFrom-Json
    [pscustomobject]@{related=$related;http=$r.StatusCode;code=$body.code} | ConvertTo-Json -Compress
  } catch { [pscustomobject]@{related=$related;error=$_.Exception.Message} | ConvertTo-Json -Compress }
}
$streamList = Invoke-RestMethod "$apiBase/api/streams" -Headers $headers -WebSession $apiSession -TimeoutSec 20
if (@($streamList).Count -gt 0) {
  $start = [Uri]::EscapeDataString([DateTimeOffset]::Now.AddDays(-1).ToString('o'))
  $end = [Uri]::EscapeDataString([DateTimeOffset]::Now.ToString('o'))
  $recordingPath = "/api/recordings?streamId=$(@($streamList)[0].id)&startTime=$start&endTime=$end"
  try { $r=Invoke-WebRequest ($apiBase+$recordingPath) -Headers $headers -WebSession $apiSession -TimeoutSec 20; [pscustomobject]@{related='/api/recordings (actual stream, last 24h)';http=$r.StatusCode;count=@($r.Content | ConvertFrom-Json).Count} | ConvertTo-Json -Compress } catch { [pscustomobject]@{related='/api/recordings';error=$_.Exception.Message} | ConvertTo-Json -Compress }
}
$rsa.Dispose()
