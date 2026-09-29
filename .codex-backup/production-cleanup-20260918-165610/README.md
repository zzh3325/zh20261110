# 大桥水库安全标准化信息平台 WebApp

基于 uni-app、Vue 3、TypeScript、Pinia 和 Vite 的移动端 WebApp，同时保留微信小程序构建能力。

## 功能模块

- 首页：水库概览、气象、告警和巡检摘要
- 综合监测：测点列表、实时数据、趋势、视频监控
- 预警信息：当前预警、历史记录、详情及处理
- 巡检任务：任务列表、详情、定位打卡、拍照、草稿、提交
- 个人管理：用户信息、权限、消息与退出登录

## 启动

```bash
npm install
npm run dev:h5
```

HBuilderX 可直接打开项目目录，或使用“运行到浏览器”。

## 环境配置

开发接口默认指向 `http://10.20.148.252:9191`，配置位于 `.env.development`。

生产部署前必须修改 `.env.production` 中的正式 HTTPS 地址。

## 登录与演示模式

- 真实登录：先调用 `/public-key`，使用 RSA 加密密码，再调用 `/login`。
- 演示模式：只使用内置展示数据，不调用写接口；不会在真实接口失败时自动伪装为演示数据。

## 尚待后端契约确认

详见 `docs/API_CONTRACT_TODO.md`。所有不确定项都隔离在 `src/api`、`src/types` 和 `src/utils/normalize.ts` 中。
