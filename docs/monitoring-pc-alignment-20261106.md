# 综合监测取值对照（2026-11-06）

参考项目：F:/ZZZZH/01uniapp/daqiao/DaQiaoReservoir-main20261106/DaQiaoReservoir-main。
修改项目：F:/ZZZZH/01uniapp/daqiao/daqiao_h5_20260909_codex。

| 监测项 | WebApp 展示规则及 PC 依据 |
| --- | --- |
| 水平位移、沉降、接缝 | 按 daqiaoRecdata.ts 读取 data1，空值时备用 value，不使用 calc1、yqcz1 或初值差计算；名称统一水平位移量、水位高度、电位器拉开的位移量；单位 mm |
| 水温 | 同一 PC 文件明确保留 (data1 - 46.6) × 5，保留三位小数；不能因其他三类删除计算而一并删除 |
| 渗流压力 | SeepagePressure.vue：水位 mm / 1000，保留四位小数后显示 m；水位高程原值 m；水压原值 kPa |
| 渗流量 | seepageData.ts 的 resultData.流量，单位 m³/s，不额外计算 |
| GNSS | PressureRegulatingWell/index.vue：x / y / z 优先，备用 dx / dy / dz，再备用 deltaX / deltaY / deltaZ、dispX / dispY / dispZ；Equipentdata.vue 标注 mm，不乘 1000；移除 PC 此页未展示的合位移 |
| 环境量 | weather.ts：resultValue 中温度、湿度、气压、风速数据、风向数据、降雨量；单位依 PC 为 ℃、%、hPa、m/s、°、mm，无额外换算 |
| 全站仪（主坝、副坝、近岸坡） | TotalStationData.vue：measresult 的 dx、dy、dz，单位 m，沿用工程归属筛选 |
| 水库、闸坝水情、雨量 | 保留接口字段直读；水位 m、蓄水量 m³、流量 m³/s、降水量 mm，水库历史列表补齐蓄水量单位 |
| 白蚁 | 保留 status 字典 0无蚁、1有蚁、2灭杀中、5已灭杀及历史数据，不增加曲线或运算 |

摘要、曲线、历史列表共用 metricValue，统一取值和换算；保留移动端分页、抽样及图表布局。缺失或无效数值仍显示未提供，不复制 PC 部分代码把缺失数据补成 0 的行为，避免制造观测值。

核对发现：修改前三类变形在 WebApp 已直读 data1，本次补齐 value 备用字段和指标名称；实质新增换算仅为有明确 PC 实现依据的渗压水位。

离线回归命令：node scripts/test-monitoring-values.cjs（需要参考 PC 项目保留上述相对位置），直接对比两端 recdata 结果。另执行 npm run type-check 和 npm run build:h5。未向生产接口写入数据。
