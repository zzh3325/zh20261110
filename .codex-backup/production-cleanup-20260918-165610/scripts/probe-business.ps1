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

function Read-List([string]$path) {
 $res=Invoke-RestMethod ($apiBase+$path) -Headers $headers -WebSession $apiSession -TimeoutSec 20
 $data=if($res.PSObject.Properties.Name -contains 'data'){$res.data}else{$res}
 if($data.PSObject.Properties.Name -contains 'content'){$data=$data.content}
 return ,@($data)
}
foreach($type in @('TOTAL_STATION','HORIZONTAL_MONITORING','SETTLEMENT_MONITORING','CRACK_METER','LAYERED_WATER_TEMP','SEEPAGE_PRESSURE','MEASURING_WEIR','GNSS','WEATHER_6','TERMITE')){
 try {
  $list=Read-List "/get/device/type/$type"
  $samples=@($list | Select-Object -First 2 | Select-Object id,deviceNumber,stationId,deviceName,deviceType,monitoringLocation,monitoring_location,ext)
  @{type=$type;count=$list.Count;samples=$samples}|ConvertTo-Json -Depth 8 -Compress
 }catch{@{type=$type;error=$_.Exception.Message}|ConvertTo-Json -Compress}
}
foreach($path in @('/get/qimmos/total-station/points?page=0&size=2','/get/sensor-points','/get/sqdb/stations?sttp=ZZ','/get/sqdb/stations?sttp=RR','/get/sqdb/stations?sttp=PP','/get/sqdb/was?page=0&size=1','/get/sqdb/rsvr?page=0&size=1','/get/sqdb/pptn?page=0&size=1','/get/ims/gnss/displacement?stationId=67600&page=0&size=1')){
 try{$list=Read-List $path;@{path=$path;count=$list.Count;sample=@($list|Select-Object -First 1)}|ConvertTo-Json -Depth 8 -Compress}catch{@{path=$path;error=$_.Exception.Message}|ConvertTo-Json -Compress}
}
foreach($type in @('HORIZONTAL_MONITORING','SETTLEMENT_MONITORING','CRACK_METER','LAYERED_WATER_TEMP','SEEPAGE_PRESSURE','MEASURING_WEIR','GNSS','WEATHER_6','TERMITE')){
 try {
  $devices=Read-List "/get/device/type/$type"; $device=$devices[0]; $ext=if($device.ext){$device.ext|ConvertFrom-Json}else{@{}}
  $path=switch($type){
   'SEEPAGE_PRESSURE' {"/get/sensor-points/$($device.stationId)/data"}
   'MEASURING_WEIR' {"/get/sensor-points/$($device.stationId)/data"}
   'GNSS' {"/get/ims/gnss/displacement?stationId=$($device.stationId)&projectId=$($ext.projectId)"}
   'WEATHER_6' {"/get/qimmos/meteo/data?qimiotId=$($ext.qimiot_id)&address=$($ext.address)"}
   'TERMITE' {"/get/monitor-points/$($device.stationId)/logs?year=2026"}
   default {"/get/daqiao/recdata?devid=$($device.stationId)&cdbh=$([Uri]::EscapeDataString($device.monitoringLocation))"}
  }
  $path += $(if($path.Contains('?')){'&'}else{'?'})+'page=0&size=1'
  $data=Read-List $path
  @{verifiedType=$type;path=$path;count=$data.Count;fields=@($data[0].PSObject.Properties.Name)}|ConvertTo-Json -Compress
 }catch{@{verifiedType=$type;error=$_.Exception.Message}|ConvertTo-Json -Compress}
}
$points=Read-List '/get/qimmos/total-station/points?page=0&size=200'
@{pointOwners=@($points|Group-Object ownerProject|Select-Object Name,Count)}|ConvertTo-Json -Depth 5 -Compress
$rsa.Dispose()
