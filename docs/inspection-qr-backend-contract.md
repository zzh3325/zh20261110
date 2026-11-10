# 固定点位二维码巡检：PC 网页端、WebApp 与后端联调说明

2026-11-04 更新：PC 点位必须预设经纬度，坐标系统一默认 WGS84，不提供配置项。coordinateSystem 缺失/null/空串均默认 WGS84，明确非 WGS84 才提示不一致。详细交付要求见同目录 `inspection-qr-pc-backend-handoff.md`。

2026-11-05 状态更新：最新 Swagger 已提供本说明中的点位与核验接口及巡检快照字段，后端已返回《固定点位二维码巡检-前端流程(1).md》。当前 WebApp 已按该文档适配，最新核对报告见 `inspection-qr-swagger-alignment-20261105.md`；本说明保留初始设计供追溯，具体接口以后端最新文档及 Swagger 为准。

适用项目：`daqiao_h5_20260909_codex`。本次只实现 WebApp 和本说明，未修改、部署后端或数据库。

初始设计时（2026-11-03）Swagger 尚无点位与核验接口；该状态已在 2026-11-05 更新，不能继续据此认定后端未实现。现有巡检保存、更新、照片接口沿用，新增点位及核验接口按最新 Swagger 联调。

## 1. 实施范围与流程

- **PC 网页端负责管理**：固定点位新增/编辑/启停/删除、二维码生成/预览/下载/打印/重置。PC 管理端源码不在本项目，由 PC 前端人员按本说明实现；WebApp 不提供这些管理页面或接口调用。
- **WebApp 负责现场操作**：扫码登录返回、核验确认、新建记录关联点位、现场拍照/相册上传、巡检记录筛选和详情展示，已接入本项目。
- **后端负责数据和规则**：点位存储、随机标识和凭证生成、权限、匹配核验、过期/停用/旧码失效、提交幂等、巡检关联及查询返回，尚需后端人员实现。
- 新建记录取消浏览器定位及手动坐标打卡；PC 管理员配置预设经纬度，系统固定 WGS84，无需选择坐标系。WebApp 只读展示，缺少/无效经纬度不能核验或提交；坐标来源标注 POINT_PRESET，不能冒充实时定位。编辑历史记录保留原坐标和已知坐标系，不强制重扫。
- 本期无任务派发、路线、漏检和超期统计，也不将旧代码中编辑记录的 `id` 当作巡检任务 ID。
- HTTP 场景使用外部扫码工具打开链接，不调用网页实时摄像头扫码。照片保留“现场拍照/相册选择”。需在实际巡检手机和网络测试。
- 可以从新增巡检页预选应巡检点位，选择存于当前浏览器，绑定用户名并保留两小时；同一账号同一浏览器扫码后传给后端比对。若换浏览器、换账号、上下文过期，核验页明确显示“临时巡检”，不可声称已与任务匹配。未来若要跨浏览器强制任务匹配，后端需增加按用户查询待办任务上下文。
- 扫码入口：`http://服务器IP:8135/#/pages/inspection/check-in?code=<随机标识>`。链接仅含不透明标识，不含用户 Token、核验凭证和可篡改的点位名称。手机需能访问服务器网络；二维码下载时禁止 localhost/127.0.0.1。
- 扫码 -> 未登录则登录后返回 -> 后端核验 -> 人员确认只读点位 -> 填写结论、说明和照片 -> 保存记录 -> 上传关联照片 -> 成功提示、800ms 后返回列表。

## 2. 统一约定

所有接口使用项目现有认证头。下面的 JSON 为前端 http 解包后的 `data`；可用项目标准 `{code:200,message:"成功",data:...}` 包装。成功业务码继续为 0/200。所有 int64 ID 必须按字符串输出，避免 JS 精度丢失。时间使用带时区 ISO8601，核验时间和到期时间由服务器产生。

普通巡检人员可读取点位、核验和新增巡检；点位新增/修改/删除/二维码读取或重置仅管理员可用。必须由后端权限控制；隐藏前端入口不等于权限校验。

`InspectionPoint`：

```json
{
  "id":"101",
  "code":"XJ001",
  "name":"主坝坝顶巡检点",
  "area":"主坝",
  "location":"主坝坝顶巡检标识牌处",
  "enabled":true,
  "latitude":28.669289,
  "longitude":102.193071,
  "coordinateSystem":"WGS84"
}
```

示例用于解释字段，不在前端预置或自动插入数据库。`enabled` 必须为 JSON 布尔值。启用点位必须配置有效经纬度，WGS84 为固定默认值，coordinateSystem 可不传不返回；停用的迁移点位可暂缺坐标，但不可核验、首次生成二维码或提交新巡检。预设坐标不代表人员现场定位。

## 3. 点位接口

本节写入类、二维码读取/重置接口由 **PC 管理端** 调用。WebApp 仅调用 GET 点位列表（可选预选用途）和第 4 节的 POST 核验接口。

| 方法 | 路径 | 请求/返回 |
| --- | --- | --- |
| GET | `/admin/inspection-points` | 返回 InspectionPoint 数组；可见点位由后端按角色过滤 |
| POST | `/admin/inspection-points` | 请求 code/name/area/location/enabled/latitude/longitude；WGS84 默认无需传；返回点位 |
| PUT | `/admin/inspection-points/{id}` | 请求点位配置及 latitude/longitude；WGS84 默认无需传；更新不改变二维码，不静默清空坐标 |
| DELETE | `/admin/inspection-points/{id}` | 未关联记录才允许删除；否则 409，提示改为停用 |
| GET | `/admin/inspection-points/{id}/qr-code` | 返回 `{ "code":"服务器生成的随机标识" }`；无标识时可在后端幂等生成 |
| POST | `/admin/inspection-points/{id}/qr-code/reset` | 返回新 `{code}`；旧二维码和对应未消费凭证应失效 |

code 为人可读编号且唯一；二维码随机标识为另一字段，使用安全随机数，至少 128 bit，不使用自增 ID 或点位编号直接替代。停用点位应立即无法核验，历史记录继续显示。点位重命名不应改变历史快照。

点位标识长期有效，无日常过期时间；读取、编辑、升级、重启均不可轮换。二维码恢复/再打印需取得同一标识，不可每次随机创建。只有管理员明确重置才作废旧码；坐标修改不换二维码，但应使基于旧档案版本签发的未提交凭证失效。

## 4. 扫码核验接口（必须实现）

`POST /admin/inspection-points/verify`

```json
{ "code":"二维码中的随机标识", "expectedPointId":"101" }
```

`expectedPointId` 可选：有值按指定点位匹配；无值为临时巡检。普通巡检人员不能通过服务端已分配任务的变更绕过校验；本期无任务时不伪称存在任务约束。

成功返回：

```json
{
  "point":{"id":"101","code":"XJ001","name":"主坝坝顶巡检点","area":"主坝","location":"主坝坝顶巡检标识牌处","enabled":true,"latitude":28.669289,"longitude":102.193071,"coordinateSystem":"WGS84"},
  "checkInProof":"短期有效的不透明凭证",
  "checkInTime":"2026-11-03T09:00:00+08:00",
  "expiresAt":"2026-11-03T09:30:00+08:00"
}
```

推荐有效期 30 分钟，实际由后端配置。凭证绑定登录用户、pointId、expectedPointId、二维码版本和核验时间。二维码失效/点位停用/用户无权访问均失败。不匹配返回可直接展示的中文业务 message，如“点位不匹配：应巡检主坝坝顶，当前扫码点位为副坝，请扫描正确点位二维码”。前端补充比对只是容错，后端仍必须核验。

## 5. 扩展现有巡检接口

沿用 `POST /admin/inspections/save`，新增二维码记录请求：

```json
{
  "inspectionItem":"主坝坝顶巡检",
  "checkPosition":"主坝坝顶巡检标识牌处",
  "coordinate":"28.669289,102.193071",
  "pointLatitude":28.669289,
  "pointLongitude":102.193071,
  "coordinateSystem":"WGS84",
  "coordinateSource":"POINT_PRESET",
  "inspectionType":"日常巡检",
  "inspectionTime":"2026-11-03T09:00:00+08:00",
  "result":"正常",
  "inspector":"当前账号显示名",
  "issueDescription":"",
  "photoPaths":[],
  "pointId":"101",
  "expectedPointId":"101",
  "checkInMethod":"QR_CODE",
  "checkInTime":"2026-11-03T09:00:00+08:00",
  "checkInProof":"verify 返回的凭证"
}
```

二维码新记录必须有预设坐标，`coordinate` 顺序固定为“纬度,经度”；结构字段 pointLatitude/pointLongitude/coordinateSystem 与之对应。后端从核验凭证关联点位档案取得权威快照，不信任客户端传值。历史记录允许原坐标为空。

后端保存事务必须：

1. 从登录上下文确定巡检人员，不能信任传入 inspector 作为权限依据。
2. 校验凭证有效期、用户、点位、expectedPointId、二维码版本、启用状态。前端点位名称和 checkPosition 可用于展示，权威位置和点位快照必须由后端档案获取。
3. 原子消费凭证并保存记录。对同用户同凭证重试返回**原记录**，不能再次 insert；并发请求也只能产生一条。若事务失败则不能提前消费凭证。照片上传重试与该消费事务分开。
4. 响应必须包含保存后的记录 ID（例如 `{id:"201"}` 或完整记录），便于下一步上传照片。

照片接口保持 `POST /admin/inspections/{id}/photos`，multipart 字段 `file`，每请求一张，权限校验继续由后端执行。前端识别“记录保存成功但照片失败”，锁定新增入口并提示进入该条详情编辑补传，不会为补照片再建一条记录。

更新沿用 `PUT /admin/inspections/update`。普通编辑只允许业务字段和已有照片列表变更；pointId、checkInMethod、checkInTime 不可任意修改。历史记录不要求伪造新核验凭证。`checkInProof` 不得在查询接口返回，也不写入浏览器持久草稿。

## 6. 列表、详情返回字段与数据迁移

`GET /admin/inspections` 和 `GET /admin/inspections/{id}` 保留原字段并返回：

```json
{
  "pointId":"101",
  "pointCode":"XJ001",
  "pointName":"主坝坝顶巡检点",
  "pointArea":"主坝",
  "checkInMethod":"QR_CODE",
  "checkInTime":"2026-11-03T09:00:00+08:00",
  "coordinate":"28.669289,102.193071",
  "pointLatitude":28.669289,
  "pointLongitude":102.193071,
  "coordinateSystem":"WGS84",
  "coordinateSource":"POINT_PRESET"
}
```

pointCode/Name/Area 建议记录历史快照。新增列均允许历史为空；不要将历史坐标记录批量标为二维码记录。前端已实现基于返回数据的点位筛选和详情展示。

推荐数据结构：inspection_point 点位表（id、code 唯一、name、area、location、enabled、预设纬度/经度/坐标系、point_data_version、qr_version、持久随机标识或可恢复加密存储、时间戳）；点位核验凭证表或 Redis（用户、点位、预期点位、两个版本、到期时间、消费后关联 recordId）；safety_inspection 扩展点位与坐标快照、coordinate_source、check_in_method、check_in_time。具体迁移 SQL 由后端按实际数据库表名、类型和版本生成，不在未知库上直接执行示例 SQL。

## 7. 上线顺序及验收

先部署后端和数据库扩展、更新 Swagger，随后由 PC 管理端配置点位并生成二维码，再联调部署 WebApp。仅部署 WebApp 到旧后端时，新建二维码巡检会被阻止，点位服务返回 404/405 时展示“固定点位服务暂不可用”；旧记录查询编辑可继续。独立 PC 管理系统源码不在此项目，本次没有修改独立 PC 系统。

### PC 前端实施要求（交给 PC 网页端负责人）

1. 在安全巡检模块下新增“巡检点位管理”菜单，管理员维护点位编号、名称、区域、位置说明、启用状态及必填预设纬度、经度；坐标系固定 WGS84，不提供选择或配置。点位管理权限仍由后端执行。
2. 操作栏提供编辑、启停、二维码预览、下载/打印及重置。已有巡检关联的点位不能直接删除，应改为停用；重置前明确提示旧码失效并需更换现场标牌。
3. 系统配置维护“WebApp 对外访问根地址”，例如 `http://服务器IP:8135`，不能使用 PC 管理端地址、localhost 或 127.0.0.1。子目录部署须保留 WebApp 的子目录路径。
4. 调用后端二维码标识接口后拼接 `${webappBaseUrl}/#/pages/inspection/check-in?code=${encodeURIComponent(code)}`。只将随机标识放入链接；在 PC 端用二维码库生成图片，不在 WebApp 中生成管理二维码。
5. 下载/打印点位牌时包含点位编号、名称、区域和二维码，方便现场一一对应粘贴。IP、端口或根路径变更后重新生成打印；二维码标识只在重置时更换。
6. PC 巡检记录列表展示点位、人员、结论、打卡方式和核验时间，支持按点位筛选；详情显示点位编号/名称/区域、核验信息、说明和照片。字段取第 6 节查询返回。
7. 联调流程：PC 配置点位 -> 生成打印 -> 手机扫码打开 WebApp -> 登录与后端核验 -> 填写拍照提交 -> PC 查看关联记录。PC 无需实现移动端现场扫码页面。

验收清单：

- 手机通过实际网络能打开二维码 IP 地址；图片下载后扫描可读取完整 URL。
- 无登录扫码 -> 登录 -> 返回原二维码 -> 后端核验；登录过期后仍能回到扫码入口。
- 扫 A 点关联 A 点；预选 A 扫 B 拒绝；无预选明确显示临时巡检。
- 停用、重置旧码、伪造标识、过期凭证、其他用户凭证、篡改 pointId 全部拒绝。
- 只选应巡检点位、没有扫码凭证时不能提交；编辑历史记录保留原坐标。
- Android/iPhone 实际拍照、相册选择、预览、上传关联；HTTP 下不依赖 getUserMedia。
- 连续点击/网络重试同凭证只建一条记录；部分照片上传失败明确提示且不再新增。
- 点位重命名/停用后历史记录仍能展示；管理员与普通人员权限分别验证。
- 固定静态二维码不等于强到场证明，转发二维码依然可被使用；本期验收范围为点位码核验。

本地回归：`node scripts/test-inspection-qr.cjs`；`npm run type-check`；`npm run build:h5`。回归中的服务响应是隔离测试，不代表真实后端已实现。
