# WebApp 与 Swagger 接口适配检查

> 后续复查发现大整数精度、工程值、多照片提交等遗漏。请以 [最新优化复核](optimization-review.md) 为准；下文是先前阶段的检查记录，不代表全部功能已端到端验证。

检查日期：2026-09-11  
Swagger：`http://10.20.148.252:9191/v3/api-docs`

## 已适配的 WebApp 接口

| 模块 | 前端用途 | Swagger 接口 | 适配结果 |
|---|---|---|---|
| 认证 | 公钥 | `GET /public-key` | 支持 `data.publicKey`，转换标准 PEM |
| 认证 | 登录 | `POST /login` | `LoginUser` JSON；随机 3 字符加盐后 RSA 加密 |
| 认证 | 注册 | `POST /register` | 严格使用 `username/password/realname` |
| 认证 | 用户身份 | `GET /userInfo` | 兼容角色业务码 `1001/1002/1003` |
| 水库 | 详情 | `GET /get/reservoirs/{id}` | 已映射 `reservoirName`、水位、管理单位等字段 |
| 水库 | 搜索 | `GET /get/reservoirs/search` | 查询参数与 Swagger 一致 |
| 监测 | 测点列表/详情/数据 | `/get/sensor-points...` | 已映射测点编码、类型、状态和时间 |
| 监测 | 全站仪/气象/GNSS/采集数据 | `/get/qimmos...`、`/get/ims...`、`/get/daqiao...` | 路径与分页参数已对齐；必填参数已在类型中标识 |
| 预警 | 列表/详情/处理 | `/get/alert...`、`POST /admin/alerts/{id}/handle` | 已映射告警等级、状态、说明；处理接口不再发送虚构请求体 |
| 巡检 | 列表/详情/增删改、照片 | `/admin/inspections...` | 已统一使用新版安全巡检管理接口；记录按 `SafetyInspection` JSON 提交，照片先以 multipart 字段 `file` 上传，再将返回路径写入 `photoPaths`；支持详情、更新和删除 |
| 视频 | 摄像头/流/直播 | `/api/cameras`、`/api/streams`、`/api/streams/{id}/live` | 已映射名称和状态；直播优先选择 HLS/fMP4/FLV 地址 |

## 首页处理

- 气象首页数据改用无必填设备参数的分页接口，而不是缺少 `qimiotId/address` 的 latest 接口。
- 水库、气象、测点、预警、巡检独立加载；一个接口失败不会使整个首页空白。
- 首页当前由多个 Swagger 接口组合。Swagger 暂无专用首页聚合接口。

## 后端现状与限制

- `/get/inspections` 返回空内容时，页面显示明确的空状态。
- `/api/cameras` 当前实际返回单对象，前端已兼容对象和数组。
- 视频流当前状态为 `ERROR`，后端提示无法连接 ZLMediaKit；这属于视频服务环境问题。
- Swagger 包含大量后台管理 CRUD、模型、档案、系统日志等接口，当前移动 WebApp 没有对应页面，因此未发起这些接口；本检查覆盖的是 WebApp 已实现功能所使用的全部接口。
