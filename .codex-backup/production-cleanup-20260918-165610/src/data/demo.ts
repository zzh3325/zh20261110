import type { AlertItem, Inspection, Measurement, MonitorPoint, Reservoir } from '@/types/domain'

export const demoReservoir: Reservoir = {
  id: 1,
  name: '大桥水库',
  address: '四川省凉山彝族自治州冕宁县',
  level: '大型水库',
  totalCapacity: 65800,
  normalWaterLevel: 2020,
  floodLimitWaterLevel: 2018.5,
  longitude: 102.193071,
  latitude: 28.669289,
  manager: '水库运行管理中心'
}

export const demoPoints: MonitorPoint[] = [
  { id: 1, name: '主坝渗压 P01', code: 'P01', type: '渗压', location: '主坝 0+050', latestValue: 128.4, unit: 'kPa', status: 'normal', lastTime: '2026-09-09 15:28:00' },
  { id: 2, name: '库水位 W01', code: 'W01', type: '水位', location: '进水塔', latestValue: 2017.82, unit: 'm', status: 'warning', lastTime: '2026-09-09 15:30:00' },
  { id: 3, name: '右岸边坡 GNSS-03', code: 'GNSS-03', type: '位移', location: '右岸边坡', latestValue: 2.6, unit: 'mm', status: 'normal', lastTime: '2026-09-09 15:26:00' },
  { id: 4, name: '气象站 M01', code: 'M01', type: '气象', location: '坝顶', latestValue: 18.6, unit: '℃', status: 'normal', lastTime: '2026-09-09 15:30:00' },
  { id: 5, name: '白蚁监测 BY-06', code: 'BY-06', type: '白蚁', location: '左坝肩', latestValue: '在线', unit: '', status: 'normal', lastTime: '2026-09-09 15:20:00' }
]

export const demoMeasurements: Measurement[] = [
  2017.28, 2017.31, 2017.36, 2017.42, 2017.51, 2017.58, 2017.63, 2017.71, 2017.76, 2017.82
].map((value, index) => ({ id: index + 1, time: `09-${String(index + 1).padStart(2, '0')}`, value, unit: 'm' }))

export const demoAlerts: AlertItem[] = [
  { id: 101, level: 2, title: '库区水位接近汛限', deviceName: '库水位 W01', location: '进水塔', metricName: '水位', value: 2017.82, threshold: 2017.5, alertTime: '2026-09-09 15:30:00', status: 'PENDING', content: '水位已进入橙色预警区间，请核查上游来水情况。' },
  { id: 102, level: 3, title: '渗流量单次增幅偏大', deviceName: '量水堰 Q02', location: '廊道出口', metricName: '渗流量', value: 2.18, threshold: 2.0, alertTime: '2026-09-09 11:16:00', status: 'PROCESSING', content: '最近一小时增幅超过黄色阈值。' },
  { id: 103, level: 4, title: '气象站通信中断', deviceName: '气象站 M02', location: '右岸道路', metricName: '在线状态', value: '离线', threshold: '--', alertTime: '2026-09-08 23:08:00', status: 'RESOLVED', content: '设备恢复后已自动关闭。' }
]

export const demoInspections: Inspection[] = [
  { id: 201, title: '主坝日常巡检', location: '主坝及坝顶', assigneeName: '巡检一组', plannedTime: '2026-09-09 16:00', status: 'PENDING', description: '检查坝面裂缝、排水孔和附属设施。' },
  { id: 202, title: '输水洞专项巡检', location: '输水洞进口', assigneeName: '巡检二组', plannedTime: '2026-09-10 09:00', status: 'PENDING', description: '检查闸门启闭设备与洞口边坡。' },
  { id: 203, title: '右岸边坡复核巡检', location: 'GNSS-03 周边', assigneeName: '巡检一组', plannedTime: '2026-09-08 14:00', status: 'COMPLETED', result: '未发现裂缝扩展，建议保持加密观测。' }
]
