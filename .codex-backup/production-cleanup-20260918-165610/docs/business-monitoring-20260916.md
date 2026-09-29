# 综合监测业务分类接入复核（2026-09-16）
## 本次范围
- 保留五个底部导航、登录注册及水库信息布局。
- 综合监测改为 Web 对应的 13 项一级业务分类、17 个叶子分类，设备管理独立入口。
- 新增业务查询页，设备自动关联、全站仪测站/测点选择、北京时间日期选择、7/15/30/90天快捷范围、白蚁年份查询、每页50条、当前页指标趋势、同范围列表、接口错误与空状态。
- 通用高级数据查询仍保留，供台账核查；不是日常业务分类的替代。
- 本轮只操作前端文件，未更新设备、测点归属、告警或巡检等后端业务数据。

## 以本轮 Swagger 和抽样响应纠正旧 Web
| 场景 | 本轮正确关联 |
| --- | --- |
| 全站仪设备 | GET /get/device/type/TOTAL_STATION |
| 测点 | GET /get/qimmos/total-station/points?projectId=设备.stationId&ownerProject=当前工程&page=…&size=50；请求和响应均严格匹配 ownerProject（兼容读取 owner_project）=主坝/副坝/近岸坡 |
| 全站仪数据 | GET /get/qimmos/total-station/data，pointId=测点.pointId，projectId=设备.stationId，dataType=measresult；校验点位所属项目/工程 |
| 四类采集通道 | GET /get/daqiao/recdata，devid=stationId，cdbh=monitoringLocation，兼容 monitoring_location/ext；冲突或缺通道时阻止查询 |
| 渗压与流量 | GET /get/sensor-points/{设备.stationId}/data；绝不使用设备台账 id |
| GNSS | GET /get/ims/gnss/displacement，stationId=台账.stationId，projectId=ext.projectId；读取 dx/dy/dz/displacement，不使用 monDate.gpstotal |
| 气象 | GET /get/qimmos/meteo/data，qimiotId=ext.qimiot_id/qimiotId，address=ext.address；不使用设备 stationId，不固定写死 4/01 |
| 水文站 | GET /get/sqdb/stations?sttp=ZZ/RR/PP |
| 闸坝/库水情/雨量 | GET /get/sqdb/was、/rsvr、/pptn；stcd 从所选站点传入，保留大小写和前导零 |
| 白蚁 | GET /get/monitor-points/{设备.stationId}/logs?year=…；不是台账 id，也不是把 monitoringLocation 当 number |
| 视频 | 沿用已有 cameras→streams→live 及录像/问题回放，不改为 Web 的模板路径 |
| 岸坡钢筋应力 | 最新 DeviceDTO 枚举无 STRESS_DETECTOR，也未确认对应应力协议；保留明确待确认状态，不向竖直位移接口发请求 |

## 数据处理
- data1 为 recdata 主指标，水温按旧 Web 规则 (data1−46.6)×5 且仅在水温分类执行一次，保留3位小数和原始 data1。
- 渗流 resultData、气象 resultValue 分指标解析；无效 JSON、空字段→null/未提供；数值0、布尔false不丢失。
- 渗压尚无可靠单位字典，保留原值，不照搬旧 Web 的水位除1000逻辑。
- GNSS 位移接口当前差值示例为 -0.0005 等，Swagger 未明确单位；不照搬旧 Web 的 mm 标签或自动乘1000。
- SQDB 蓄水量 W 的单位未明确，显示原值；不会误标 m³ 或擅自缩放。
- 全站仪/采集位移及水温等已标注单位沿用 Web 展示口径，设备标定与公式适用范围仍需业务验收。
- 时间查询显式使用 +08:00；最新 Swagger 特别声明 GNSS 为东八区墙钟语义，Z 也按本地钟点解释。此前分析中关于统一按UTC推导的风险提示须以此新协议为准。
- 日期和年份查询使用同一组已应用参数驱动图表和表格，修改未提交条件不影响正在查看的结果。
- 每页50条，按总数或满页判断下一页；趋势只代表当前页并明确标记，不宣称前200/400条就是完整历史。
- 页面切换设备/测点及卸载时隔离旧响应，避免慢请求覆盖新选择。
- ext 仅用于映射，不在业务页面展示密钥、设备地址扩展原文等信息。

## 只读抽样结果
成功读取：TOTAL_STATION 4台，HORIZONTAL_MONITORING 14台，SETTLEMENT_MONITORING 14台，CRACK_METER 20台，LAYERED_WATER_TEMP 3台，SEEPAGE_PRESSURE 28台，MEASURING_WEIR 1台，GNSS 8台，WEATHER_6 1台，TERMITE 29台。
抽查9种非全站仪设备的关联观测请求均返回记录；雨量和库水情接口有记录，闸坝水情接口返回空列表。
关键纠正：
- 渗流示例：台账 id=96，stationId=1281661110109339648；后者才是传感器主键。
- 气象示例：stationId=5，但 ext 指定 qimiot_id=4,address=01。
- 白蚁示例：台账 id=68，stationId=102347；monitoringLocation是设备地址，ext.pointNumber为4。
- 读取到110个全站仪测点，当前开发数据库 ownerProject 全为空。前端不会擅自归入任一工程；正式数据库写入“主坝 / 副坝 / 近岸坡”后，测站数量、测点列表和数据查询会自动按该字段匹配。
抽样只证明这些请求及关联字段可用，不代表所有设备在所有时间范围都有数据。

## 验证
新增回归覆盖：分类数量、全站仪业务主键/所属工程校验、渗流与白蚁ID不混用、气象ext映射、采集通道冲突、SQDB路径、水温零值、空JSON、原始GNSS位移和北京时间日期。
沿用原请求/鉴权/大整数/上传回归。类型检查、构建另执行；不启动开发服务器。尚未完成真实手机全流程及视频/文件访问验收。

## 后续需补充的数据条件
1. 全站仪 ownerProject 工程归属。
2. 岸坡应力正确接口、设备类型与单位。
3. 渗压、GNSS、蓄水量等单位及水温标定规则。
4. 闸坝水情实际观测数据。
