# WebApp 数据接入扩展（2026-09-14）

## 本次改动
保留 uni-app + Vue 3 + TypeScript + Pinia 和五个底部导航，未改动登录/注册布局、项目 manifest 和用户最新的水库详情页面。

| 页面 | 增加内容 |
| --- | --- |
| 首页 | 设备运行/离线/维护/未知统计、最近三条巡检记录、设备/气象/档案/位置入口；单接口失败不阻断其他模块 |
| 综合监测 | 独立多源分类、服务器筛选和分页、设备台账、全站仪期次与测点、GNSS 位移、气象、采集通道、白蚁日志、人工监测、资产位置；传感器多指标切换 |
| 视频（二级页面） | 摄像头关联视频流、按流和起止时间查询录像、问题时段与回放状态 |
| 预警信息 | 按后端支持参数查询告警、阈值、告警方式、推送规则、推送记录；保留中文告警等级 |
| 巡检任务 | 在已加载记录中按项目/人员/位置/结论筛选，真实记录详情、问题说明、坐标、照片预览、编辑入口 |
| 个人管理 | 查询 /userInfo，档案列表和 /get/files/{id} 详情、文件访问地址复制；不虚构部门信息和具体权限 |

## 数据查询目录
- 设备台账：`GET /get/device`；无后端分页参数；筛选：无，支持本地关键词筛选。
- 全站仪测点：`GET /get/qimmos/total-station/points`；page 从 0 开始，每页 20 条；筛选：projectId、pointType、name。
- 全站仪期次：`GET /get/qimmos/total-station/periods`；page 从 0 开始，每页 20 条；筛选：projectId、startPeriod、endPeriod、startTime、endTime。
- 全站仪数据：`GET /get/qimmos/total-station/data`；page 从 0 开始，每页 20 条；筛选：pointId、projectId、periodNum、startPeriod、endPeriod、dataType、startTime、endTime。
- GNSS 观测：`GET /get/ims/gnss/data`；page 从 0 开始，每页 20 条；筛选：projectId、stationId、startTime、endTime。
- GNSS 位移：`GET /get/ims/gnss/displacement`；page 从 0 开始，每页 20 条；筛选：projectId、stationId（必填）、startTime、endTime。
- 气象观测：`GET /get/qimmos/meteo/data`；page 从 0 开始，每页 20 条；筛选：qimiotId、address、startTime、endTime。
- 采集通道：`GET /get/daqiao/recdata`；page 从 0 开始，每页 20 条；筛选：devid、cdbh、startTime、endTime。
- 白蚁监测：`GET /get/monitor-points`；无后端分页参数；筛选：offline、status。
- 白蚁日志：`GET /get/monitor-points/{id}/logs`；page 从 0 开始，每页 20 条；筛选：id（必填）、year。
- 人工监测：`GET /get/manual-data`；无后端分页参数；筛选：无，支持本地关键词筛选。
- 资产位置：`GET /get/asset-locations`；无后端分页参数；筛选：category、zone、deviceId、monitoringLocation、projectId。
- 摄像头台账：`GET /api/cameras`；无后端分页参数；筛选：status、enabled。
- 录像查询：`GET /api/recordings`；无后端分页参数；筛选：streamId（必填）、startTime（必填）、endTime（必填）。
- 问题时段：`GET /api/incidents`；无后端分页参数；筛选：streamId。
- 告警条件查询：`GET /get/alert/search`；无后端分页参数；筛选：deviceName、handlingStatus、deviceNumber、alertLevel、responsiblePerson、deviceType。
- 告警阈值：`GET /get/alert/thresholds/search`；无后端分页参数；筛选：content、type、location。
- 推送规则：`GET /get/alert/push-rules/search`；无后端分页参数；筛选：projectName、recipient、pushMethod、pushLevel、status。
- 推送记录：`GET /get/alert/push-records/search`；无后端分页参数；筛选：projectName、monitoringPoint、sendStatus、contactInfo、recipient。
- 告警方式：`GET /get/alert/methods/search`；无后端分页参数；筛选：name、alertType。
- 档案资料：`GET /get/files`；无后端分页参数；筛选：无，支持本地关键词筛选。

关联调用：
- 摄像头台账 → GET /api/streams?deviceId=摄像头主键；直播保留 GET /api/streams/{id}/live。
- 全站仪测点 → 使用 pointId 业务字段查询历史，不把本地 id 混作 pointId。
- GNSS 记录 → stationId、projectId 查询位移；白蚁设备 → id 查询日志。
- 问题回放 → GET /api/incidents/{id}/playback，仅 available=true 播放 playbackUrl。
- 录像仅 status=AVAILABLE 时使用 httpMp4Url；不调用视频启动/停止、裁剪或其他写接口。
- 档案详情 → GET /get/files/{id}，复制经 HTTP(S) 协议校验的文件地址；暂不承诺鉴权下载。

## 适配规则
- 参数按 Swagger 白名单发送，空参数不发送。分页接口使用 page=0/size=20；非分页接口不伪造分页参数。
- GNSS 位移必须填写 stationId，白蚁日志必须填写设备 id，录像必须填写 streamId/startTime/endTime，校验起止顺序。
- 大整数 ID 保持字符串；空值显示未提供，0 和 false 不丢失；不猜测缺失单位。
- 支持数组、content/records/list 分页对象和单对象返回；未知总数按是否满页决定下一页。
- 列表本地关键词筛选明确标注作用范围；后端枚举参数使用选择器。
- 展示页不显示 password/token/RTSP 等敏感字段，不把嵌套对象直接显示成 [object Object]。
- 新只读数据源在演示模式下不会请求真实后端。
- 账号角色不等于操作权限；已有巡检编辑、告警处理仍由后端授权。

## 只读联调结果
2026-09-14 对原接口及新增查询接口进行只读抽查：
- 设备台账成功返回 122 条；白蚁设备 29 条；资产位置 26 条；告警阈值 12 条。
- 全站仪测点/期次、GNSS 数据、气象、采集通道、摄像头、告警条件查询均返回成功。
- 巡检、人工监测、档案、问题时段、推送规则/记录、告警方式返回空列表，页面提供空状态。
- /get/qimmos/total-station/data?page=0&size=1 返回 HTTP 400；补充真实 pointId=2/projectId=1 后返回 HTTP 200、code=200。前端要求填写测点和项目，测点台账关联入口自动传入业务 pointId，不发送空条件请求。
- 旧 /get/sensor-points/data?page=0&size=1 同样返回 400；测点明细仍使用 /get/sensor-points/{id}/data。
- /api/streams/1/live HTTP 200，但业务 status=ERROR，不应视为可播放。
- /userInfo 返回 code=1003、message=超级管理员、data=null，仅可确认角色，不能填造个人资料。
- GNSS 位移（stationId=67600/projectId=2824）、白蚁设备日志（id=102344）均返回 HTTP 200、code=200；真实视频流近 24 小时录像查询 HTTP 200、空列表。无档案/问题时段记录时，详情/回放无法以真实数据验证。

## 验证与边界
- 已增加模拟回归：分页和单对象解包、必填参数、时间顺序、未知参数过滤、int64 路径和查询、零值、状态字典、敏感字段过滤、资源地址协议检查。
- 原登录/RSA、业务错误处理、照片上传、会话失效回归保留。
- 未提交注册、告警处理、巡检或设备管理请求，未改变后端业务数据。
- 尚未完成真机/浏览器全流程验收；视频跨域、文件鉴权和后端 400 等问题不属于前端构建通过即可证明已解决的事项。
