# 固定点位二维码巡检（含预设坐标）实施任务单

更新：2026-11-05，已按后端《固定点位二维码巡检-前端流程(1).md》和当日最新 Swagger 完成 WebApp 适配。默认 WGS84，不配置坐标系。接口最新核对及测试范围见 `inspection-qr-swagger-alignment-20261105.md`。

最新追加规则：巡检必传至少 1 张现场照片，无照片不得完成。WebApp 已实施仅拍照入口、提交前校验及上传后服务器关联确认，列表无照片显示待补。PC/后端统一完成状态的任务见 `inspection-mandatory-photo-handoff.md`；本次未实现水印。

## 一、最终业务分工和交付状态

PC 网页端管理点位、预设坐标、二维码和巡检记录；WebApp 仅负责现场扫码核验、只读点位/坐标展示、填写巡检、拍照上传和记录查看；后端负责持久存储、权限、核验与防重复保存。

已修改项目：`F:\ZZZZH\01uniapp\daqiao\daqiao_h5_20260909_codex`。2026-11-05 已读取服务端 Swagger，点位、核验和巡检快照接口已提供，WebApp 按其对接。PC 项目、后端项目、数据库本次没有修改；本文后续分工内容供对应负责人对照和联调，不再表示后端尚未实现。真实账号、现场扫码与上传仍需联调验收。

现场二维码每个点位一张，长期固定；短期核验凭证与二维码分开管理。PC 修改坐标后，原二维码仍可用，新扫码返回新坐标，历史巡检记录保留原坐标快照。任何预设坐标都不是手机实时 GPS，不能据此计算人员是否到场。

**统一约定：所有新巡检点位的预设经纬度均为 WGS84 十进制度。PC 和 WebApp 不提供坐标系选择或配置，后端使用系统默认值，不要求用户提交 coordinateSystem。**经纬度仍必须填写、校验；缺失坐标系字段不再导致核验失败。坐标来源 POINT_PRESET 继续保留，用来区分预设坐标与实时 GPS。

## 二、WebApp 修改内容（已实现）

### 1. 现场流程和页面

支持两种入口：外部扫码直接打开 WebApp；或者先进入新增巡检页，点击“扫码核验”后仅请求相机，现场拍摄二维码再本地识别并调用同一后端接口。二维码识别的相册入口已移除。后一种不跳出浏览器，保留表单及预选点位，无需新增接口。HTTP 下不依赖网页实时摄像头视频流；浏览器是否严格执行仅拍照需实机验证，不能据此声称已防止二维码复制。

手机外部扫码工具扫描固定二维码 -> 打开 `/pages/inspection/check-in?code=...` -> 未登录先登录再返回 -> POST 核验 -> 展示点位及只读预设坐标 -> 人员确认 -> 填写结论/说明、现场拍照或相册选择 -> 保存记录并关联照片 -> 提示成功、约 800ms 后返回巡检记录。

- 扫码核验页和新建表单显示预设纬度、经度及只读文字“WGS84（系统默认）”，没有坐标系输入项，不调用浏览器定位。
- 获取点位数据时，coordinateSystem 未返回、null、空串均按 WGS84 处理；已有明确的非 WGS84 标识则提示数据与系统约定不一致，避免静默错标。本项目不自动执行坐标转换。
- 经纬度缺失、空白、非数值、纬度超出 -90 至 90、经度超出 -180 至 180 都拒绝核验/新建提交；数据库 DECIMAL 返回数字或十进制字符串均支持。0 是合法数值，不能当缺失。
- 新建提交保留 pointId、checkInProof、checkInTime、checkInMethod，携带点位坐标快照。coordinateSystem 作为内部兼容元数据固定 WGS84，用户不用填写，后端也不能信任用户覆盖。
- 检查部位默认带入点位 location，可补充修改；新建巡检时间自动跟随手机当前时钟并以北京时间显示，重新显示页面时刷新。手动调整后停止刷新，点击“使用当前时间”恢复；只有明确标记手动调整的草稿保留其时间，旧未标记的 00:00 不再覆盖当前值。核验时间仍独立只读。编辑原记录保留原人员和原时间，不自动替换。
- 保存记录后保留返回的记录 ID，已成功照片从待上传队列移除；上传失败停留当前页，可对同一 ID 重试剩余照片，不再调用新增或更新接口。刷新/离开页面后若临时照片失效，可从该记录详情编辑重新选择补传。
- WebApp 不提供点位增删改和二维码生成；只读点位列表用于可选预选，调用 verify 用于核验。
- 编辑、详情兼容历史记录；只展示原始快照，不将未知历史坐标系一律补标 WGS84，不用当前点位新值覆盖旧坐标。

### 2. 对接接口和文件

| 文件 | 职责 |
| --- | --- |
| src/api/inspection-points.ts | GET 点位列表、POST 核验，预设坐标读取、WGS84 默认兼容 |
| src/utils/inspection-coordinates.ts | 经纬度解析、范围校验、默认 WGS84、格式化“纬度,经度” |
| src/pages/inspection/check-in.vue | 扫码点位确认和只读坐标展示 |
| src/pages/inspection/execute.vue | 记录填写、只读预设坐标、拍照选择、提交与防重复 |
| src/api/inspection.ts | 保存/更新巡检，传递坐标快照并关联照片 |
| src/utils/inspection-check-in.ts、src/App.vue、登录页 | 扫码入口、登录返回和预选上下文保留 |
| src/pages/inspection/index.vue、detail.vue | 按点位筛选、记录/坐标来源展示 |

### 3. 本地验证与当前边界

运行 `npm run type-check`、`node scripts/test-inspection-qr.cjs`、`npm run build:h5`。脚本为隔离回归，验证默认 WGS84、无坐标系字段、坐标合法性、扫码匹配、登录返回、坐标快照、历史兼容及防重复，不向生产后端写入数据。

本次只修改 WebApp，后端新增接口已出现在最新 Swagger。下文仍作为 PC 端和后端负责人的实施/核对说明，最终按实际服务响应和手机联调验收；不能把隔离回归等同于生产全链路已经验证。

## 三、交给 PC 前端负责人

### 1. 新增菜单和页面

安全巡检模块下新增“巡检点位管理”。列表展示点位编号、名称、所属区域、位置说明、预设纬度、预设经度、启用状态及更新时间；支持名称/编号/区域查询、启停筛选，列表数据必须来自后端。坐标系不作为配置列或编辑字段，可在表单旁用只读说明“预设坐标统一为 WGS84”。

操作项：新增、编辑、启用/停用、二维码预览、下载/打印；管理员特殊操作“重置二维码”需二次确认，并说明旧码失效、需更换现场标牌。关联过巡检记录的点位不允许物理删除，改为停用。

### 2. 新增/编辑表单

| 字段 | JSON 字段 | 要求 |
| --- | --- | --- |
| 点位编号 | code | 必填，唯一；如 XJ001 |
| 点位名称 | name | 必填 |
| 所属区域 | area | 必填 |
| 位置说明 | location | 必填，填写现场可识别描述 |
| 预设纬度 | latitude | 启用时必填，十进制度，-90 至 90 |
| 预设经度 | longitude | 启用时必填，十进制度，-180 至 180 |
| 状态 | enabled | JSON 布尔值 |

经纬度分别输入，禁止经纬度颠倒；不接受投影平面 X/Y 数值直接作为经纬度。建议最多保留 8 位小数。零值本身合法，不能用 `if(!latitude)` 判断是否缺失。坐标取自核实后的点位资料，不自动预填本文示例值。

本项目统一使用 WGS84，不增加坐标系下拉框、系统配置项或用户必填字段。PC 请求中可完全不传 coordinateSystem；后端默认 WGS84。如原前端已经包含该字段，固定传 WGS84 作为兼容元数据即可，不能由管理员任意选择。坐标资料必须为真实 WGS84 经纬度；如增加地图辅助选点，地图输出非 WGS84 时应先在独立转换环节转换并验证，不能仅改标签冒充 WGS84。

允许历史点位先停用保存待补全；未配置完整坐标不能启用、首次生成二维码或完成扫码核验。前端、后端都要校验。

### 3. PC 端接口及请求

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | /admin/inspection-points | 查询点位列表（本期返回数组） |
| POST | /admin/inspection-points | 新增 |
| PUT | /admin/inspection-points/{id} | 编辑、启停，按完整表单提交 |
| DELETE | /admin/inspection-points/{id} | 删除未使用点位 |
| GET | /admin/inspection-points/{id}/qr-code | 读取固定随机标识 |
| POST | /admin/inspection-points/{id}/qr-code/reset | 管理员主动重置 |

新增/编辑请求示例（仅说明格式，实际填现场资料）：

```json
{
  "code":"XJ001",
  "name":"主坝坝顶巡检点",
  "area":"主坝",
  "location":"主坝坝顶巡检标识牌处",
  "latitude":28.669289,
  "longitude":102.193071,
  "enabled":true
}
```

### 4. 二维码生成与打印

PC 系统配置增加“WebApp 对外访问根地址”，例如 `http://固定服务器IP:8135`。它不是 PC 端地址，不得使用 localhost/127.0.0.1。子目录部署保留对应路径。

后端读取随机标识返回 `data: {"code":"长期随机标识"}`，PC 用二维码库将以下完整链接生成二维码：

```js
`${webappBaseUrl.replace(/\/$/, '')}/#/pages/inspection/check-in?code=${encodeURIComponent(code)}`
```

二维码不嵌入名称、坐标、账号 Token 或短期凭证。预览/下载/打印不调用重置接口，不更换随机标识。点位牌包含点位名称、编号、区域和二维码；必要时附预设坐标。IP、端口和 WebApp 路径保持稳定，否则旧标牌可能无法访问。

### 5. PC 巡检记录展示

在现有列表增加点位名称/编号、打卡方式、核验时间，并支持按 pointId 筛选。详情增加点位名称/编号/区域、预设纬度/经度、坐标来源、核验时间、结论、说明和照片。新点位坐标可显示只读“WGS84”，无需提供选择操作。

来源 `POINT_PRESET` 显示“PC 点位预设，非实时定位”；无来源的旧记录显示“历史坐标”，不可批量标记成实时 GPS 或新二维码记录。详情取记录自身的快照，不联查当前点位坐标覆盖旧记录。

## 四、交给后端负责人

### 1. 新增/扩展数据结构

以下为逻辑字段，不直接规定现有项目 ORM、物理表名或迁移 SQL。

**点位表**：id、code（唯一）、name、area、location、latitude、longitude、enabled、长期 qr_token、qr_version、point_data_version、created_at、updated_at。coordinate_system 可保留为内部兼容列且新点位默认 WGS84，也可以由 DTO 输出固定常量，不是管理员配置项。

- latitude/longitude 建议用可容纳 8 位小数的 DECIMAL，例如 DECIMAL(11,8)，并做上述范围校验；新启用点位禁止空值。
- 服务层对新增点位默认 WGS84；若保留 coordinate_system 列，数据库默认值设为 WGS84，但仍在服务层兼容缺失/null/空串。不能要求 PC 显式传入字段才保存成功；明确传入非 WGS84 时应拒绝并提示数据约定不一致，不自动转换或覆盖数值。旧历史记录的未知坐标系不批量改写。
- qr_token 使用安全随机数，至少 128 bit；持久保存原值或可恢复加密值，便于重复读取同一个标识。仅保存不可恢复哈希却没有原文来源，会无法再次打印原链接。
- qr_token 初次创建后长期有效；读取、编辑、坐标调整、部署、重启和定时任务均不自动轮换。并发首次生成只能持久化一个值。
- point_data_version 用于点位档案（尤其坐标）变更；qr_version 仅用于管理员作废/重置旧码。两者分开，不因改坐标要求重新打印。

**核验凭证表或 Redis**：凭证标识/哈希、用户ID、pointId、expectedPointId、qr_version、point_data_version、点位与坐标快照、checkInTime、expiresAt、已关联 recordId。

**现有巡检表新增可空字段**：point_id、point_code、point_name、point_area、point_latitude、point_longitude、coordinate_system、coordinate_source、check_in_method、check_in_time。保留已有 coordinate 字段和照片结构。历史列允许空，不伪造历史核验记录。

### 2. 实现点位接口及权限

实现上面 PC 端表格中的接口，响应使用现有 `{code,message,data}`；成功码 0/200；ID 返回字符串以避免 int64 精度损失，enabled 返回布尔值。点位列表可供授权巡检人员读取；新增、编辑、删除、二维码读取/重置仅管理员可用。

启用/首次生成二维码/扫码核验三处均检查完整合法经纬度。坐标值缺少、空串、非有限值、超范围时明确拒绝；不能把 null/空串默认为 0。coordinateSystem 不要求传入，缺失/null/空串默认 WGS84；明确非 WGS84 才返回不一致错误。

返回点位对象必须包含 id/code/name/area/location/enabled/latitude/longitude。可额外返回 coordinateSystem:"WGS84"，该字段不是成功响应必需条件，WebApp 不返回也可核验。后端 DECIMAL 序列化为数字或合法十进制字符串，WebApp 均可读取。

### 3. 新增 POST /admin/inspection-points/verify

请求：`{"code":"长期随机标识","expectedPointId":"101"}`。expectedPointId 可选，有值必须匹配；无值是临时巡检。后续若强制指定任务，按服务端任务上下文判断，不能让客户端删掉 expectedPointId 绕过。

后端检查二维码存在、未作废、点位启用、人员权限、坐标完整合法和应巡检点位。通过后返回：

```json
{
  "code":200,
  "message":"核验通过",
  "data":{
    "point":{
      "id":"101","code":"XJ001","name":"主坝坝顶巡检点",
      "area":"主坝","location":"主坝坝顶巡检标识牌处","enabled":true,
      "latitude":28.669289,"longitude":102.193071
    },
    "checkInProof":"短期核验凭证",
    "checkInTime":"2026-11-04T09:00:00+08:00",
    "expiresAt":"2026-11-04T09:30:00+08:00"
  }
}
```

凭证建议 30 分钟有效，绑定当前用户、点位、预期点位、两个版本和坐标快照。明确区分：**二维码永久性入口、凭证短期有效**。

上述响应故意未包含 coordinateSystem，WebApp 会默认 WGS84；后端也可返回该固定字段，但不能增加“缺少坐标系配置”的失败条件。

### 4. 修改现有 POST /admin/inspections/save

保留原业务字段，新增如下字段。WebApp 已提交：

```json
{
  "inspectionItem":"主坝坝顶巡检",
  "checkPosition":"主坝坝顶巡检标识牌处",
  "inspectionType":"日常巡检",
  "inspectionTime":"2026-11-04T09:00:00+08:00",
  "result":"正常","inspector":"当前人员","issueDescription":"","photoPaths":[],
  "pointId":"101","expectedPointId":"101","checkInMethod":"QR_CODE",
  "checkInProof":"短期核验凭证","checkInTime":"2026-11-04T09:00:00+08:00",
  "pointLatitude":28.669289,"pointLongitude":102.193071,
  "coordinateSystem":"WGS84","coordinateSource":"POINT_PRESET",
  "coordinate":"28.669289,102.193071"
}
```

处理顺序：

1. 从登录上下文确定实际人员，检查凭证的用户、点位、expectedPointId、有效期、二维码版本、点位档案版本及启用状态。
2. 从凭证及服务端点位档案取得权威快照。客户端发送的坐标、来源、名称和核验时间仅供一致性比较，不能直接信任或当作现场 GPS。
3. 若扫码后 PC 调整了坐标等档案，档案版本变更，拒绝未提交旧凭证并提示重新扫码；原二维码仍有效。
4. 原子保存记录并消费凭证，以凭证关联记录做幂等约束。同用户同凭证重试返回原记录；并发只能新增一次；失败事务不能消耗凭证。
5. 将点位/坐标快照写入记录。coordinateSource 固定 POINT_PRESET，coordinateSystem 固定 WGS84（可内部存储或响应常量，不是配置项）；coordinate 字符串统一“纬度,经度”，不能反过来；例如 `28.669289,102.193071`。
6. 返回记录 ID（例如 data:{id:"201"}），便于后续上传照片。不向列表/详情暴露 checkInProof。

### 5. 现有更新、照片和查询接口

- PUT `/admin/inspections/update`：正常编辑结果/说明/已有照片等业务字段；pointId、点位快照、坐标快照、coordinateSource、核验时间禁止普通编辑更改。历史无坐标记录可继续编辑，不强制补二维码或坐标。不要因前端未传快照字段将其清空。
- POST `/admin/inspections/{id}/photos`：继续每请求一张、multipart 字段 file；记录保存后上传，不修改点位快照。
- GET `/admin/inspections` 和 GET `/admin/inspections/{id}`：返回新增快照字段及原有字段。示例：pointLatitude、pointLongitude、coordinateSystem、coordinateSource、coordinate、pointCode、pointName、pointArea、checkInMethod、checkInTime。
- 点位坐标或名称修改后，只影响后续新巡检；查询旧记录应取旧快照，不动态用当前点位值覆盖。

### 6. 错误提示与 Swagger

错误要区分：点位不匹配、点位已停用、二维码已作废、未配置预设坐标、坐标系无效、凭证过期、档案已变化需重扫、权限不足。采用现有业务错误格式返回可展示的中文 message。所有新接口和字段更新进 Swagger。

上面的“坐标系无效”仅指明确传入或存储非 WGS84 数据；缺少坐标系字段不报错、不要求管理员配置。Swagger 将点位新增/编辑/核验响应中的 coordinateSystem 标记为可选且默认 WGS84；经纬度仍按启用规则校验。

## 五、联调和验收顺序

1. 后端完成数据库扩展、接口与 Swagger；PC 前端完成点位管理及二维码打印，WebApp 已按本文接口对接。
2. PC 使用真实 WGS84 坐标配置 A/B 两点，只填写经纬度，不出现坐标系必选项；创建/编辑请求省略 coordinateSystem 也保存成功。各生成一次二维码后保存打印。
3. 手机扫码 A，核验响应省略 coordinateSystem 仍成功，WebApp 显示预设坐标和只读“WGS84（系统默认）”；缺失/非法经纬度仍失败，不能代入示例值。明确返回非 WGS84 时提示数据约定不一致。
4. 预选 A 扫 B 必须失败；无预选时明确按临时巡检。当前预选依赖同账号同浏览器，如需跨浏览器强制任务匹配必须由后端保存任务上下文。
5. 拍照提交后，PC/WebApp 详情应显示同一坐标快照和来源；连续点击、网络重试不产生重复记录。
6. PC 改 A 坐标，原二维码不变；新扫码显示新值，旧巡检仍显示旧快照；未提交旧凭证提示重扫。
7. 重启/升级后二维码标识不变；停用时拒绝打卡，重新启用后旧码可用；只有明确重置才作废旧码。
8. 历史无点位/无坐标记录可查看编辑；照片失败可补传，不能新增重复记录。

本方案不使用手机 GPS，也不计算人员与点位的距离；预设坐标用于点位档案和记录关联。静态二维码被转发后仍可使用，不能仅凭静态码认定严格到场。
