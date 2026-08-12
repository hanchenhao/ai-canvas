# BrainVite-AI-Canvas 本地桌面版规划

## 1. 产品定位

BrainVite-AI-Canvas 是本地优先的图片与视频 AI 创作应用。用户安装 Electron
客户端后即可使用无限画布、工作流、故事板和时间线。应用不依赖我们运营的
中心服务器。

本地运行：

- Electron 主进程和桌面壳
- Node.js API 与工作流执行引擎
- SQLite 数据库
- 本地素材、缓存、日志和临时文件
- API Key 的系统钥匙串或本地加密存储
- 任务状态、失败重试和恢复

外部网络只用于用户主动配置的服务：

- MiniMax 图片、语音或文本 API
- Seedance 视频 API（当前默认通过 KIE 适配器）
- 阿里云 OSS（可选）
- 用户显式启用的其他模型供应商
- GitHub 上的 BrainVite-AI-Canvas 更新源（发布版启用）

不再作为主产品范围：

- 公网 SaaS 部署
- 多租户与组织权限
- 独立 Web 管理后台
- Supabase 登录
- Redis、BullMQ 和分布式 Worker
- Fly.io、Cloudflare Pages、Jekyll、AUR、Flatpak 自动发布

## 2. 数据与安全边界

默认数据目录由 Electron 的 `app.getPath("userData")` 决定，不写入安装
目录。数据库、密钥主材料、项目、缩略图和任务状态必须在应用升级后保留。

默认素材策略：

1. 本地文件系统是默认值，断网仍能浏览、编辑和导出已有项目。
2. OSS 是可选的同步/素材后端，不是应用启动依赖。
3. API 返回的远程图片和视频要下载或复制到受控存储，不能只保存短期 URL。
4. 临时文件按保留期清理，项目引用的原始素材不得被误删。

密钥策略：

- macOS Keychain、Windows Credential Manager、Linux Secret Service 优先。
- 无系统钥匙串时使用 `SECRETS_MASTER_KEY` 加密的本地数据库。
- 渲染进程不能读取所有明文密钥。
- 密钥不能进入 `VITE_*`、日志、截图、崩溃报告或 GitHub Actions。

## 3. 去 NodeTool 外链规则

“移除所有 NodeTool 外链”指从用户可见和运行时路径移除上游品牌链接，不能
删除依法需要保留的许可证与版权说明。

### 必须移除或替换

- Electron 菜单、关于页、错误页、帮助页中的 `nodetool.ai`、论坛和上游
  GitHub 链接
- 自动更新源、问题反馈地址、下载地址和文档地址
- 前端分析域名及默认遥测
- MCP bundle 的上游主页与仓库字段
- OpenRouter 的上游 Referer
- 示例中会被应用直接加载的上游远程素材
- 安装包 `appId`、`productName`、协议名、桌面条目和更新仓库
- GitHub issue 模板中的上游社区链接

产品官网统一使用 `https://www.brainvite.com`，源码、问题反馈与更新源使用
`https://github.com/hanchenhao/ai-canvas`。没有对应页面时删除入口，不制造
失效链接。

### 暂时保留

- `LICENSE.txt`、版权声明和 README 的上游致谢/来源说明
- `docs/UPSTREAM.md` 中用于同步代码的上游仓库地址
- npm workspace 包的 `@nodetool-ai/*` 名称和内部 import。第一阶段重命名
  它们风险高、收益低，而且不是用户可见外链。
- JSON Schema 的历史 `$id`。修改会影响协议兼容性，单独迁移。
- 纯测试夹具中用于验证“外部链接处理”的虚构 URL；其测试目的必须清楚。

## 4. 交付阶段

### 阶段 A：稳定基线与 CI

- 修复根 `package-lock.json`，保证 Node 22.22.1 下 `npm ci` 成功。
- 每次提交只运行 Web、核心后端和 Electron 的类型检查与关键测试。
- Docker 改为手动工作流，不再随每次提交发布。
- Electron 安装包使用手动触发或 `desktop-v*` 标签构建。
- 首期构建无签名 macOS arm64、Windows x64、Linux x64 包。
- Actions 不引用任何 MiniMax、Seedance、OSS 或登录密钥。

验收：同一提交只产生 CI；桌面包仅在明确触发时生成；GHCR 仅手动发布。

### 阶段 B：桌面品牌与外链清理

- 产品名统一为 BrainVite-AI-Canvas。
- 更新 `appId`、窗口标题、菜单、托盘、安装包名和协议名。
- 关于、帮助、错误反馈和自动更新指向 BrainVite 官网或本仓库。
- 默认关闭上游分析上报。
- 清理用户可触达的 NodeTool 站点链接。
- 添加扫描测试，阻止用户界面重新引入上游域名。

验收：抓取桌面 UI 和 Web 构建产物，除“开源许可”页面外不出现 NodeTool
外链；普通用户操作不会请求 NodeTool 域名。

### 阶段 C：桌面设置中心

- 将管理后台的模型、密钥与存储功能迁入桌面设置。
- 移除用户管理和管理员鉴权入口。
- 提供 MiniMax、KIE/Seedance、AtlasCloud 的测试与保存。
- 提供本地素材目录选择、OSS 连接测试和读写测试。
- 明确显示密钥存储位置、OSS 状态和本地空间占用。
- 支持导出不含密钥的诊断信息。

验收：首次启动可以在同一设置向导完成模型和存储配置；密钥不回显。

### 阶段 D：核心创作闭环

- 新建项目和无限画布。
- 文本生成图片、图片变体和图片编辑。
- 文本生成视频、图片生成视频和任务进度轮询。
- 结果自动落盘或进入 OSS，并写入项目资产库。
- 画布、故事板和时间线复用同一素材记录。
- 支持取消、重试、重新连接后恢复任务。

验收：使用真实 MiniMax 与 Seedance API 完成从提示词到落盘素材，再拖入
画布和时间线导出的端到端流程。

### 阶段 E：本地任务与可靠性

- 用现有工作流运行记录实现任务中心，不引入 Redis/BullMQ。
- 区分排队、提交、远端处理中、下载、完成、失败和取消。
- 对网络超时、限流和供应商 5xx 使用有上限的退避重试。
- 关闭应用后保存任务；重开后查询远端状态并继续下载。
- 提供失败原因、供应商请求 ID 和安全的诊断日志。
- 清理过期临时文件和孤立上传分片。

验收：在生成中强制退出应用，重新打开后任务不丢失且不会重复扣费提交。

### 阶段 F：安装、升级与数据保障

- macOS arm64、Windows x64、Linux x64 安装包冒烟测试。
- 完成 BrainVite-AI-Canvas GitHub Release 更新地址。
- 有证书前明确标注“未签名测试版”；签名和 Apple 公证作为发布门槛。
- 数据库迁移前自动备份。
- 提供项目导出/导入以及本地数据目录说明。
- 验证升级、降级提示、磁盘不足、断网和 OSS 不可用场景。

验收：干净机器可安装、首次配置、生成、重启恢复、升级并保留数据。

## 5. GitHub Actions 目标

最终只保留：

- `ci.yml`：push/PR，验证 Web、核心后端、Electron 和生产 Web 构建。
- `desktop.yml`：手动或 `desktop-v*` 标签，构建三平台桌面包。
- `docker.yml`：手动构建可选服务镜像。
- `security.yml`：每周生成依赖审计报告，不自动改代码或开 PR。

Actions 的默认权限为 `contents: read`。只有 Docker 发布 job 使用
`packages: write`。桌面 Release 在启用前不使用 `contents: write`。任何第三方
模型密钥都不配置到 Actions。

## 6. 执行顺序

当前最优先顺序：A → B → C → D → E → F。阶段 A 和 B 结束前不扩大功能，
否则每次提交仍会受到上游流水线和品牌路径的干扰。
