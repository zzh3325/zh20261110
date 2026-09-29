# 后端接口契约待确认清单

这些事项不会阻塞页面开发，接口确认后应优先修改 API 与类型适配层。

1. 登录返回 Token 还是 Cookie Session，以及刷新、退出机制。
2. 分页参数与 `records/list/content` 返回格式。
3. 告警等级、状态、巡检状态和设备状态字典。
4. 首页是否提供水库、气象、告警、巡检的聚合接口。
5. 是否提供多测点批量最新值，避免移动端 N+1 请求。
6. 巡检任务、路线、巡检点和巡检记录之间的数据模型。
7. 巡检定位打卡、照片上传、附件查询与删除接口。
8. 视频直播协议、临时地址有效期、录像与问题时段回放格式。
9. 个人资料、头像、修改密码和退出登录接口。
10. 正式域名、HTTPS、CORS、Cookie SameSite 和文件访问策略。

## 建议新增接口

```text
GET    /app/dashboard
GET    /get/monitoring/latest/batch
POST   /admin/inspections/{id}/check-in
POST   /admin/inspections/{id}/attachments
GET    /get/inspections/{id}/attachments
DELETE /admin/inspections/{id}/attachments/{attachmentId}
POST   /admin/inspections/{id}/submit
POST   /logout
PUT    /user/profile
PUT    /user/password
```
