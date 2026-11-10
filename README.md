# XX水库安全标准化信息平台 WebApp

基于 uni-app、Vue 3、TypeScript、Pinia 和 Vite 的移动端 WebApp，同时保留微信小程序构建能力。

## 功能模块

- 首页：水库概览、气象、告警和巡检摘要
- 综合监测：测点列表、实时数据、趋势、视频监控
- 预警信息：当前预警、历史记录、详情及处理
- 巡检记录：记录列表、详情、定位打卡、拍照、草稿、提交
- 个人管理：用户信息、权限、消息与退出登录

## 启动

```bash
npm install
npm run dev:h5
```

HBuilderX 可直接打开项目目录，或使用“运行到浏览器”。

## 环境配置

开发接口默认指向 `http://10.20.148.252:XXXX`，配置位于 `.env.development`。

生产部署前必须修改 `.env.production` 中的正式 HTTPS 地址。H5 的现场位置打卡依赖浏览器定位能力，业务站点本身也必须通过 HTTPS 访问（仅 localhost 调试可例外），普通 `http://IP:端口` 会被浏览器禁止定位。

## 登录

- 真实登录：先调用 `/public-key`，使用 RSA 加密密码，再调用 `/login`。

## 尚待后端契约确认

详见 `docs/API_CONTRACT_TODO.md`。所有不确定项都隔离在 `src/api`、`src/types` 和 `src/utils/normalize.ts` 中。
