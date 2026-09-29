// 根据 2026-09-14 Swagger GET 参数整理；不向只读接口发送未声明的筛选字段。
export interface SourceFilter { key:string; label:string; required:boolean; kind:string; options?:string[] }
export interface DataSource { key:string; title:string; path:string; paged:boolean; filters:SourceFilter[] }
export const dataSources: DataSource[] = [
  {
    "key": "devices",
    "title": "设备台账",
    "path": "/get/device",
    "paged": false,
    "filters": []
  },
  {
    "key": "totalPoints",
    "title": "全站仪测点",
    "path": "/get/qimmos/total-station/points",
    "paged": true,
    "filters": [
      {
        "key": "projectId",
        "label": "项目 ID",
        "required": false,
        "kind": "integer"
      },
      {
        "key": "pointType",
        "label": "测点类型码",
        "required": false,
        "kind": "integer"
      },
      {
        "key": "name",
        "label": "名称",
        "required": false,
        "kind": "string"
      }
    ]
  },
  {
    "key": "periods",
    "title": "全站仪期次",
    "path": "/get/qimmos/total-station/periods",
    "paged": true,
    "filters": [
      {
        "key": "projectId",
        "label": "项目 ID",
        "required": false,
        "kind": "integer"
      },
      {
        "key": "startPeriod",
        "label": "起始期次",
        "required": false,
        "kind": "integer"
      },
      {
        "key": "endPeriod",
        "label": "结束期次",
        "required": false,
        "kind": "integer"
      },
      {
        "key": "startTime",
        "label": "开始时间（ISO-8601）",
        "required": false,
        "kind": "date"
      },
      {
        "key": "endTime",
        "label": "结束时间（ISO-8601）",
        "required": false,
        "kind": "date"
      }
    ]
  },
  {
    "key": "totalData",
    "title": "全站仪数据",
    "path": "/get/qimmos/total-station/data",
    "paged": true,
    "filters": [
      {
        "key": "pointId",
        "label": "测点 ID",
        "required": false,
        "kind": "integer"
      },
      {
        "key": "projectId",
        "label": "项目 ID",
        "required": false,
        "kind": "integer"
      },
      {
        "key": "periodNum",
        "label": "期次",
        "required": false,
        "kind": "integer"
      },
      {
        "key": "startPeriod",
        "label": "起始期次",
        "required": false,
        "kind": "integer"
      },
      {
        "key": "endPeriod",
        "label": "结束期次",
        "required": false,
        "kind": "integer"
      },
      {
        "key": "dataType",
        "label": "数据类型",
        "required": false,
        "kind": "string"
      },
      {
        "key": "startTime",
        "label": "开始时间（ISO-8601）",
        "required": false,
        "kind": "date"
      },
      {
        "key": "endTime",
        "label": "结束时间（ISO-8601）",
        "required": false,
        "kind": "date"
      }
    ]
  },
  {
    "key": "gnss",
    "title": "GNSS 观测",
    "path": "/get/ims/gnss/data",
    "paged": true,
    "filters": [
      {
        "key": "projectId",
        "label": "项目 ID",
        "required": false,
        "kind": "integer"
      },
      {
        "key": "stationId",
        "label": "站点 ID",
        "required": false,
        "kind": "integer"
      },
      {
        "key": "startTime",
        "label": "开始时间（ISO-8601）",
        "required": false,
        "kind": "date"
      },
      {
        "key": "endTime",
        "label": "结束时间（ISO-8601）",
        "required": false,
        "kind": "date"
      }
    ]
  },
  {
    "key": "displacement",
    "title": "GNSS 位移",
    "path": "/get/ims/gnss/displacement",
    "paged": true,
    "filters": [
      {
        "key": "projectId",
        "label": "项目 ID",
        "required": false,
        "kind": "integer"
      },
      {
        "key": "stationId",
        "label": "站点 ID",
        "required": true,
        "kind": "integer"
      },
      {
        "key": "startTime",
        "label": "开始时间（ISO-8601）",
        "required": false,
        "kind": "date"
      },
      {
        "key": "endTime",
        "label": "结束时间（ISO-8601）",
        "required": false,
        "kind": "date"
      }
    ]
  },
  {
    "key": "meteo",
    "title": "气象观测",
    "path": "/get/qimmos/meteo/data",
    "paged": true,
    "filters": [
      {
        "key": "qimiotId",
        "label": "气象设备 ID",
        "required": false,
        "kind": "integer"
      },
      {
        "key": "address",
        "label": "设备地址",
        "required": false,
        "kind": "string"
      },
      {
        "key": "startTime",
        "label": "开始时间（ISO-8601）",
        "required": false,
        "kind": "date"
      },
      {
        "key": "endTime",
        "label": "结束时间（ISO-8601）",
        "required": false,
        "kind": "date"
      }
    ]
  },
  {
    "key": "acquisition",
    "title": "采集通道",
    "path": "/get/daqiao/recdata",
    "paged": true,
    "filters": [
      {
        "key": "devid",
        "label": "采集设备 ID",
        "required": false,
        "kind": "integer"
      },
      {
        "key": "cdbh",
        "label": "通道编号",
        "required": false,
        "kind": "string"
      },
      {
        "key": "startTime",
        "label": "开始时间（ISO-8601）",
        "required": false,
        "kind": "date"
      },
      {
        "key": "endTime",
        "label": "结束时间（ISO-8601）",
        "required": false,
        "kind": "date"
      }
    ]
  },
  {
    "key": "termite",
    "title": "白蚁监测",
    "path": "/get/monitor-points",
    "paged": false,
    "filters": [
      {
        "key": "offline",
        "label": "在线状态码（0在线/1离线/2失联）",
        "required": false,
        "kind": "integer"
      },
      {
        "key": "status",
        "label": "状态",
        "required": false,
        "kind": "integer"
      }
    ]
  },
  {
    "key": "termiteLogs",
    "title": "白蚁日志",
    "path": "/get/monitor-points/{id}/logs",
    "paged": true,
    "filters": [
      {
        "key": "id",
        "label": "设备主键 ID",
        "required": true,
        "kind": "integer"
      },
      {
        "key": "year",
        "label": "年份",
        "required": false,
        "kind": "integer"
      }
    ]
  },
  {
    "key": "manual",
    "title": "人工监测",
    "path": "/get/manual-data",
    "paged": false,
    "filters": []
  },
  {
    "key": "locations",
    "title": "资产位置",
    "path": "/get/asset-locations",
    "paged": false,
    "filters": [
      {
        "key": "category",
        "label": "类别",
        "required": false,
        "kind": "string",
        "options": [
          "TERMITE",
          "TOTAL_STATION",
          "TOTAL_STATION_POINT",
          "WEATHER_6",
          "SEEPAGE_PRESSURE",
          "MEASURING_WEIR",
          "VIDEO_CAMERA",
          "GNSS",
          "CRACK_METER",
          "LAYERED_WATER_TEMP",
          "HORIZONTAL_MONITORING",
          "SETTLEMENT_MONITORING"
        ]
      },
      {
        "key": "zone",
        "label": "坝段",
        "required": false,
        "kind": "string",
        "options": [
          "MAIN_DAM",
          "AUX_DAM"
        ]
      },
      {
        "key": "deviceId",
        "label": "设备业务 ID",
        "required": false,
        "kind": "string"
      },
      {
        "key": "monitoringLocation",
        "label": "监测点位",
        "required": false,
        "kind": "string"
      },
      {
        "key": "projectId",
        "label": "项目 ID",
        "required": false,
        "kind": "integer"
      }
    ]
  },
  {
    "key": "cameras",
    "title": "摄像头台账",
    "path": "/api/cameras",
    "paged": false,
    "filters": [
      {
        "key": "status",
        "label": "状态",
        "required": false,
        "kind": "string",
        "options": [
          "UNKNOWN",
          "ONLINE",
          "OFFLINE",
          "DISABLED"
        ]
      },
      {
        "key": "enabled",
        "label": "是否启用",
        "required": false,
        "kind": "boolean",
        "options": [
          "true",
          "false"
        ]
      }
    ]
  },
  {
    "key": "recordings",
    "title": "录像查询",
    "path": "/api/recordings",
    "paged": false,
    "filters": [
      {
        "key": "streamId",
        "label": "视频流 ID",
        "required": true,
        "kind": "integer"
      },
      {
        "key": "startTime",
        "label": "开始时间（ISO-8601）",
        "required": true,
        "kind": "date"
      },
      {
        "key": "endTime",
        "label": "结束时间（ISO-8601）",
        "required": true,
        "kind": "date"
      }
    ]
  },
  {
    "key": "incidents",
    "title": "问题时段",
    "path": "/api/incidents",
    "paged": false,
    "filters": [
      {
        "key": "streamId",
        "label": "视频流 ID",
        "required": false,
        "kind": "integer"
      }
    ]
  },
  {
    "key": "alerts",
    "title": "告警条件查询",
    "path": "/get/alert/search",
    "paged": false,
    "filters": [
      {
        "key": "deviceName",
        "label": "设备名称",
        "required": false,
        "kind": "string"
      },
      {
        "key": "handlingStatus",
        "label": "处理状态",
        "required": false,
        "kind": "string"
      },
      {
        "key": "deviceNumber",
        "label": "设备编号",
        "required": false,
        "kind": "string"
      },
      {
        "key": "alertLevel",
        "label": "告警等级",
        "required": false,
        "kind": "string"
      },
      {
        "key": "responsiblePerson",
        "label": "责任人",
        "required": false,
        "kind": "string"
      },
      {
        "key": "deviceType",
        "label": "设备类型",
        "required": false,
        "kind": "string",
        "options": [
          "TOTAL_STATION",
          "TOTAL_STATION_POINT",
          "WEATHER_6",
          "TERMITE",
          "SEEPAGE_PRESSURE",
          "MEASURING_WEIR",
          "GNSS",
          "CRACK_METER",
          "LAYERED_WATER_TEMP",
          "HORIZONTAL_MONITORING",
          "SETTLEMENT_MONITORING"
        ]
      }
    ]
  },
  {
    "key": "thresholds",
    "title": "告警阈值",
    "path": "/get/alert/thresholds/search",
    "paged": false,
    "filters": [
      {
        "key": "content",
        "label": "监测内容",
        "required": false,
        "kind": "string"
      },
      {
        "key": "type",
        "label": "监测类型",
        "required": false,
        "kind": "string"
      },
      {
        "key": "location",
        "label": "位置",
        "required": false,
        "kind": "string"
      }
    ]
  },
  {
    "key": "pushRules",
    "title": "推送规则",
    "path": "/get/alert/push-rules/search",
    "paged": false,
    "filters": [
      {
        "key": "projectName",
        "label": "项目名称",
        "required": false,
        "kind": "string"
      },
      {
        "key": "recipient",
        "label": "接收人",
        "required": false,
        "kind": "string"
      },
      {
        "key": "pushMethod",
        "label": "推送方式",
        "required": false,
        "kind": "string"
      },
      {
        "key": "pushLevel",
        "label": "推送等级",
        "required": false,
        "kind": "string"
      },
      {
        "key": "status",
        "label": "状态",
        "required": false,
        "kind": "string"
      }
    ]
  },
  {
    "key": "pushRecords",
    "title": "推送记录",
    "path": "/get/alert/push-records/search",
    "paged": false,
    "filters": [
      {
        "key": "projectName",
        "label": "项目名称",
        "required": false,
        "kind": "string"
      },
      {
        "key": "monitoringPoint",
        "label": "监测点",
        "required": false,
        "kind": "string"
      },
      {
        "key": "sendStatus",
        "label": "发送状态",
        "required": false,
        "kind": "string"
      },
      {
        "key": "contactInfo",
        "label": "联系方式",
        "required": false,
        "kind": "string"
      },
      {
        "key": "recipient",
        "label": "接收人",
        "required": false,
        "kind": "string"
      }
    ]
  },
  {
    "key": "methods",
    "title": "告警方式",
    "path": "/get/alert/methods/search",
    "paged": false,
    "filters": [
      {
        "key": "name",
        "label": "名称",
        "required": false,
        "kind": "string"
      },
      {
        "key": "alertType",
        "label": "告警类型",
        "required": false,
        "kind": "string"
      }
    ]
  },
  {
    "key": "files",
    "title": "档案资料",
    "path": "/get/files",
    "paged": false,
    "filters": []
  }
]
export function openDataSource(source:string, query:Record<string,unknown>={}) {
 if(source==='devices') {
  const search=Object.entries(query).filter(([,v])=>v!==null&&v!==undefined&&v!=='').map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(String(v))).join('&')
  uni.navigateTo({url:'/pages/device/index'+(search?'?'+search:'')})
  return
 }
 const search = Object.entries({source,...query}).filter(([,v])=>v!==null&&v!==undefined&&v!=='').map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(String(v))).join('&')
 uni.navigateTo({url:'/pages/data/index?'+search})
}
// Swagger 标记为可选，但现场验证无条件查询返回 400；限制为按真实测点查询。
for (const filter of dataSources.find(s=>s.key==='totalData')!.filters) {
  if (filter.key==='pointId'||filter.key==='projectId') filter.required=true
}
