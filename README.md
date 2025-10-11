# 论文投稿系统前端

使用 Vite + React + Mantine 构建的论文投稿系统前端，覆盖作者、专家与编辑三种角色的核心业务流程，提供多语言标题录入、文件上传、通知管理、审稿与支付管理等功能。

## 快速开始

```bash
npm install
VITE_API_BASE_URL=http://localhost:3000 npm run dev
```

- `npm run build` 构建生产包
- `npm run preview` 本地预览生产构建
- `npm test` 运行 Vitest + Testing Library 单元测试

> 所有接口均通过 `VITE_API_BASE_URL` 前缀访问，可在 `.env.local` 中配置。

## 主要特性

- **认证授权**：登录后基于角色的受保护路由，Axios 拦截器统一附带 JWT 并处理 401/403。
- **Mantine UI**：AppShell 布局、暗色模式、响应式导航、数据表格、时间线等组件快速实现业务界面。
- **React Query**：统一的数据拉取、缓存与轮询；通知未读数定时更新。
- **表单校验**：Mantine Form + Zod 实现论文提交、个人信息、审稿意见、支付与排期等表单的前端校验，支持后端字段错误回填。
- **文件上传**：论文及修改稿使用 `FileInput + Axios` 上传，展示实时进度。
- **多语言支持**：标题、摘要、关键词支持中英文输入，界面默认中文，可扩展 i18n。
- **单元测试**：覆盖登录流程、受保护路由守卫、论文表单校验核心逻辑。

## 目录结构

```
├─ public/            # 静态资源与 favicon
├─ src/
│  ├─ api/            # Axios 实例与端点映射
│  ├─ components/     # 布局与可复用组件
│  ├─ features/       # 模块化业务逻辑（auth, papers 等）
│  ├─ hooks/          # 自定义 Hooks（预留）
│  ├─ pages/          # 按角色划分的页面
│  ├─ routes/         # 路由配置与守卫
│  ├─ stores/         # 内存态存储（JWT 等）
│  ├─ styles/         # 全局样式
│  └─ utils/          # 工具方法与 i18n
└─ tests/             # Vitest + Testing Library 测试
```

## 角色演示（示例账号，可替换为后端实际数据）

| 角色   | 账号邮箱              | 密码      |
|--------|-----------------------|-----------|
| 作者   | author@example.com    | password |
| 专家   | expert@example.com    | password |
| 编辑   | editor@example.com    | password |

## 注意事项

- 401/403 会自动注销并跳转登录页；若后端提供刷新令牌，可在 `AuthProvider` 中扩展刷新逻辑。
- 文件上传大小默认限制为 20MB，仅接受 PDF/DOC/DOCX，可在 `paperSchema` 中调整。
- React Router v6.22 仍会在测试环境提示 v7 兼容预警，可忽略；运行测试时 Mantine Popover 会触发 `act` 警告，不影响结果。
- 请确保后端实现参考 `BackgroundREADME.md` 所描述的接口协议。
