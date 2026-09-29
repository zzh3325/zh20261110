# 设备台账页面接入说明

## 页面结构

- 顶部设备总览：11 类设备总数、在线、离线、维护、未知和在线率。
- 中部分类选择：点击分类后，仅在下方展示该类设备。
- 下部设备列表：展示名称、状态、编号、站点 ID、安装位置和可展开详情；视频设备可进入视频通道页。
- 搜索只筛选当前已选分类的已加载结果。

## 11 类接口映射

普通设备由 `GET /get/device` 一次获取，并按 `deviceType` 精确分类：

| 页面分类 | deviceType |
| --- | --- |
| 全站仪 | TOTAL_STATION |
| 气象六要素 | WEATHER_6 |
| GNSS | GNSS |
| 裂缝计 | CRACK_METER |
| 分层水温计 | LAYERED_WATER_TEMP |
| 水平监测 | HORIZONTAL_MONITORING |
| 沉降监测 | SETTLEMENT_MONITORING |
| 白蚁监测 | TERMITE |
| 渗流渗压监测 | SEEPAGE_PRESSURE |
| 流量监测 | MEASURING_WEIR |

视频监控使用独立接口 `GET /api/cameras`，不归入普通设备接口。

状态口径：`RUNNING/ONLINE/NORMAL/0` 为在线；`OFFLINE/DISCONNECTED/LOST/ERROR/1/2` 为离线；`MAINTENANCE/MAINTAINING/REPAIR` 为维护；其他或空值为未知。未知不会计入在线数。

## 2026-09-16 只读核验

- `GET /get/device` 返回 135 条，其中上述 10 类共 122 条。
- `GET /api/cameras` 返回 1 条。
- 11 类合计 123 条，与 Web 端设备总览口径一致。
- 其余 13 条水雨情类设备不属于本次指定的 11 类，因此不计入本页总览。
