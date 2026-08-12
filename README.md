# BrainVite-AI-Canvas

BrainVite-AI-Canvas 是一款本地优先的 AI 图片与视频创作桌面应用。它把无限
画布、节点工作流、素材管理、故事板和视频时间线放在同一个 Electron 应用中，
并允许用户自行配置模型供应商与存储服务。

官网：[www.brainvite.com](https://www.brainvite.com)

## 产品方向

- 桌面优先：macOS、Windows 与 Linux 本地安装运行。
- 数据本地：项目、SQLite 数据库、缓存与任务状态默认留在用户电脑。
- 自带密钥：API Key 由用户配置，优先通过系统钥匙串保护。
- 模型可配置：重点支持 MiniMax 图片模型与 Seedance 视频模型，同时保留可扩展
  的供应商节点体系。
- 存储可选择：本地素材库为默认选项，阿里云 OSS 是可选的远程素材存储。
- 无中心服务依赖：桌面核心流程不要求 BrainVite 账号、Redis、BullMQ 或公网
  BrainVite 服务。

## 本地开发

要求：

- Node.js 22（以 `.nvmrc` 为准）
- npm 10
- Git
- 对应平台的 Electron 原生模块构建工具

安装依赖并启动桌面开发环境：

```bash
npm ci
npm run build:packages
npm run electron:dev
```

仅启动浏览器开发环境：

```bash
npm run dev
```

常用检查：

```bash
npm run typecheck:web
npm run typecheck:electron
npm run test:web
npm run test:electron
```

## 桌面构建

本地完整构建：

```bash
npm run build:packages
npm run build:web
npm run build:electron
```

GitHub Actions 中的桌面安装包工作流只在手动触发或推送
`desktop-v*` 标签时运行。未配置代码签名证书时，产物属于未签名测试版。

## 配置与安全

- 不要把 MiniMax、Seedance/KIE、OSS 等密钥写入源码、`.env.example`、前端
  `VITE_*` 变量或 GitHub Actions。
- 桌面端应通过设置页写入本地加密密钥存储。
- GitHub Actions 只使用构建所需的最小权限，不需要任何模型供应商密钥。
- 提交前检查 `git diff`，避免日志、调试包、数据库和本地配置进入仓库。

## 开发计划

完整的本地桌面版路线图见
[`docs/superpowers/specs/2026-08-12-ai-canvas-local-desktop-plan.md`](docs/superpowers/specs/2026-08-12-ai-canvas-local-desktop-plan.md)。

## Claude Code 协作

仓库根目录的 `CLAUDE.md` 记录项目约束和常用命令。多人或多个编码代理并行开发
时，请分别使用 Git 分支或 worktree，避免同时修改同一个工作区。

## 开源与上游说明

本项目基于 NodeTool 开源代码进行产品化改造，并保留原项目的版权声明与
AGPL-3.0 许可证。分发修改版或提供网络服务时，请遵守 `LICENSE.txt` 的要求。
上游同步边界记录在 `docs/UPSTREAM.md`，该文件只用于维护与许可证追溯，不是
产品运行时入口。

## 联系方式

- 官网：[www.brainvite.com](https://www.brainvite.com)
- 问题反馈：[GitHub Issues](https://github.com/hanchenhao/ai-canvas/issues)
