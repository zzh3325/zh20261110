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
$rsa.Dispose()
