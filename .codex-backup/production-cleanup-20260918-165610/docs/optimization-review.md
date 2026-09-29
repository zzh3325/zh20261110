# 系统优化与接口复核

本次按在线 Swagger 重新检查，并使用测试账号执行只读联调。以下结果替代此前“全部适配完成”的笼统结论。

## 已修复

- HTTP 原始文本先保留超出 JavaScript 安全整数范围的 int64，再解析 JSON，避免测点 ID 舍入导致详情请求错误。
- HTTP 200 中的业务失败、401 失效和文件上传使用一致的结果校验；失效清理本地账号状态。获取公钥、登录、注册不携带旧 Token。
- 登录资料接口返回 401/403 时不再通过兜底逻辑进入首页；演示模式清理真实 Token。
- 气象与监测分页从 0 开始。监测按真实 resultData JSON 解析工程值；保留空值与 0 的差别，按采集时间排序。多指标记录不任意选取指标。
- 首页删除真实模式下默认水位、默认天气、固定安全结论和固定告警等级；失败统计显示 --，展示气象采集时间，避免把历史记录当实时值。
- 测点 state 字段没有在线状态字典依据，不再推断所有测点在线。首页显示测点台账数。
- 注册返回登录页使用 onShow 回填用户名；登录和注册避免重复提交。
- 巡检使用实际必填信息；提供新增记录入口，编辑走 PUT update；WebApp 多张照片用同一个 multipart 请求提交，重复 photos 字段，业务失败保留草稿。
- 告警处理接口仅支持标记“已处理”，移除不会被后端保存的处理意见输入。
- 视频识别 ERROR 等不可播放状态；增加 HLS 播放组件并释放播放资源，不把 WebRTC 信令地址直接交给 video。

## 本次只读联调

| 接口 | 结果 |
|---|---|
| GET /public-key、POST /login | 可取得公钥与 Token |
| GET /userInfo | 业务码 1003、超级管理员；无资料对象 |
| GET /get/reservoirs/1 | 正常；多项库容、水位字段为空 |
| GET /get/qimmos/meteo/data?page=0&size=1 | 正常；记录时间需以 collectTime 为准 |
| GET /get/sensor-points | 29 个测点 |
| GET /get/sensor-points/{实际ID}/data?page=0&size=1 | 正常；resultData 为 JSON 字符串 |
| GET /get/sensor-points/data?page=0&size=1 | **HTTP 400**；Swagger 有此路径，后端需排查，不作为批量最新值接口 |
| GET /get/alert | 返回 2 条告警 |
| GET /get/inspections | 空记录 |
| GET /api/streams、GET /api/streams/1/live | 返回成功，但视频源状态 **ERROR** |

## 验证范围与剩余约束

- 自动扫描 API 文件中的直接路径/HTTP 方法；动态巡检地址及 public-key 另按 Swagger 核对。
- 已用模拟响应验证 int64、鉴权、工程值、上传业务失败、多照片同请求与失效清理。
- 未对真实后端执行注册、告警处理、巡检新增/更新，避免产生测试业务记录；这些写入接口仍需要测试环境端到端验证。
- HLS 组件构建通过不等于现场直播通过。后端视频源 ERROR、浏览器跨域与正式网络环境需恢复后联调。
- 目前只有巡检记录实体；没有独立任务计划、巡检点实体或服务端范围打卡校验。没有声称完成巡检任务调度。
- 本次没有新增 GNSS、全站仪等尚未实现的独立页面；监测多指标选择仍需后续 UI 开发。
- 保留用户项目的 manifest 和环境配置。生产域名与 HTTPS/CORS 仍按实际部署确认。

## 可重复执行

- npm run type-check
- npm run build:h5
- node scripts/run-regression.cjs
- PowerShell: ./scripts/audit-api.ps1
- PowerShell: ./scripts/smoke-api.ps1 -Username <测试账号> -Password (Read-Host -AsSecureString)
