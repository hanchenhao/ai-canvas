# NodeTool 中文化（i18n）设计

**日期**：2026-08-11
**状态**：设计已通过用户评审，待转入实现规划
**范围**：`web/`（前端 Web 应用 + Electron 渲染进程复用的同一份 Web UI）

## 一、目标

让 NodeTool 支持简体中文（zh-CN）和英文（en）两种语言。用户选择语言后，**所有用户可见的界面文案、节点库（节点名称、描述、属性字段）**都切换为对应语言。

非目标（不在本期）：

- 用户自建内容（工作流中的 prompt、用户写的 Code 节点代码、用户上传的资产）
- 开发者控制台日志（开发者面向，保留英文便于排错）
- 示例 App 的具体业务文案（用户可自行翻译其应用内容）
- 中文之外的其他语言（架构留出扩展位，但本期只交付 zh-CN）

## 二、术语表（专用名词译法约束）

通用计算机术语采用业界通行中文译法：File → 文件、Save → 保存、Workflow → 工作流、Node → 节点、Agent → 智能体、Prompt → 提示词、Settings → 设置、Cancel → 取消、Confirm → 确认、Asset → 资产/素材（视语境）、Template → 模板、Property → 属性。

无标准中译的专有名词保留英文：API、MCP、WebSocket、OAuth、GPU、LLM、React、Electron、Anthropic、OpenAI、Claude、Codex、JSON、Markdown、SDK、CSS、HTML。

任何拿不准的术语，第一次出现时在中文后加括号注释英文（例：「工作流（Workflow）」），之后用纯中文。翻译文件中预定义一份术语词典，所有翻译人协作时参照。

## 三、技术选型

### UI 文案

**react-i18next + i18next**。理由：生态成熟、与 React 19 / MUI v7 兼容、支持 namespace 与懒加载、社区文档完备。

### 节点库（310+ 节点的 title/description/属性字段）

**集中翻译表 + 运行时拦截**。理由：

- 节点定义散落在 `packages/*/src/nodes/`，第三方节点包（fal-nodes、replicate-nodes 等）也注册节点。改源码侵入性大，第三方包跟进成本高。
- 集中翻译表（`zh-CN/nodes.json`）一处维护，运行时通过包装 NodeRegistry 访问层来查表回退。
- 翻译缺失时不报错，回退为原始英文值。

## 四、架构

### 目录结构（新增）

```
web/src/
├── i18n/
│   ├── index.ts              # i18next 初始化、namespace 注册
│   ├── I18nProvider.tsx      # React Provider，与 SettingsStore 联动
│   ├── nodeRegistryI18n.ts   # 包装 NodeRegistry，节点字段查翻译表
│   └── extractNodeStrings.ts # 扫描 packages/*/src/nodes/，生成翻译源键
├── locales/
│   ├── en/
│   │   ├── common.json       # 通用按钮、菜单
│   │   ├── settings.json     # 设置页文案
│   │   ├── nodes.json        # 节点库翻译源（英文，自动生成）
│   │   └── errors.json       # 用户可见错误消息
│   └── zh-CN/
│       ├── common.json
│       ├── settings.json
│       ├── nodes.json        # 人工翻译
│       └── errors.json
```

### 状态管理

在 `web/src/stores/SettingsStore.ts` 增加一个字段：

```ts
language: 'auto' | 'en' | 'zh-CN'  // 默认 'auto'
```

复用现有的 `persist` 中间件（`name: 'settings-storage'`），用户的选择写入 localStorage。

### 首次启动语言探测

`I18nProvider` 在初始化时：

1. 读 `SettingsStore.language`
2. 若为 `'auto'`，读 `navigator.language`：命中 `zh-*` → 中文，其他 → 英文
3. 把解析后的实际语言传给 `i18n.changeLanguage`

用户在设置里手动覆盖后，存下的值优先生效，不再走 `navigator.language`。

## 五、翻译键规则

### UI 文案

按模块切 namespace：`common`、`settings`、`errors`。键名按「部位.动作」命名，避免重复。

```json
// zh-CN/common.json
{
  "button": {
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "confirm": "确认"
  },
  "menu": {
    "file": "文件",
    "edit": "编辑",
    "view": "视图",
    "help": "帮助"
  }
}
```

### 节点库

键 = 节点类型.字段路径。源英文通过扫描脚本自动生成到 `en/nodes.json`，中文填到 `zh-CN/nodes.json`。

```json
// zh-CN/nodes.json
{
  "nodetool.text.Concat": {
    "title": "文本拼接",
    "description": "将两段文本拼成一段",
    "props": {
      "a": { "title": "文本 A" },
      "b": { "title": "文本 B" }
    }
  }
}
```

### NodeRegistry 拦截

`nodeRegistryI18n.ts` 包装 NodeRegistry 的访问方法：

- 取节点 `title` / `description` 时，先查 `t('nodes:<type>.title')`，命中就用翻译值，否则返回原始英文值。
- 属性面板读 prop 的 `title` / `description` 时同样查表回退。

缺失翻译不报错、不记 warning（避免控制台噪音），但通过单独的脚本可以列出未翻译键。

## 六、语言切换 UX

### 设置页入口

设置页 → 通用 Tab（`TAB_GENERAL = 0`）新增「语言 / Language」下拉：

- 跟随系统（默认）
- 简体中文
- English

切换后即时生效，不需要刷新页面（`i18n.changeLanguage` 触发 React 重渲染）。

### MUI 主题

不需要改。中英文都是 LTR，4 档字号体系（`TYPOGRAPHY`）够用，中文比英文略紧凑。

本期不涉及 MUI `DatePicker` / `DataGrid` 等本地化组件的 locale 接入。当前代码审计中未在前端关键路径发现这些组件；如后续迁移过程中发现某组件硬编码了英文（如日历周起始日），单独在对应文件接入 `LocalizationProvider`，不作为本期的统一任务。

## 七、实现路径

按以下阶段推进，每阶段独立验证后再进入下一阶段。

### 阶段 1：基础设施

- 装 `i18next` + `react-i18next` 到 `web/package.json`
- 写 `i18n/index.ts`、`I18nProvider.tsx`
- `SettingsStore` 加 `language` 字段
- 在 `web/src/index.tsx` 挂载 `I18nProvider`

**验证**：单元测试 `I18nProvider` 切换语言后 React 组件文案变化。

### 阶段 2：语言切换 UI

- 设置页通用 Tab 加语言下拉（本期唯一入口）

**验证**：浏览器中切换语言，立即生效。

### 阶段 3：UI 文案迁移

- 批量改造 `web/src/components/` 下的硬编码字符串 → `t('namespace:key')`
- 优先迁移核心路径：顶栏、左侧栏、设置页、节点属性面板、对话框
- 其他文案渐进迁移，未迁移的英文先保留（不阻塞功能）

**验证**：typecheck/lint/test 全绿；浏览器中走查核心路径中英文切换。

### 阶段 4：节点翻译流水线

- 写 `extractNodeStrings.ts` 扫描脚本，扫所有 `packages/*/src/nodes/*.ts`，提取 `static title`、`static description`、`@prop({ title, description })`
- 生成 `en/nodes.json`（英文源）
- 人工翻译填 `zh-CN/nodes.json`
- 写 `nodeRegistryI18n.ts`，包装 NodeRegistry 访问层
- 在节点创建处接入（具体接入点在实现规划阶段定位）

**验证**：扫描脚本输出快照测试，确保节点类型稳定；浏览器中切换语言后节点面板和属性面板文案变化。

### 阶段 5：错误消息翻译

- 在 `packages/protocol/` 增加用户可见错误的错误码枚举
- 前端按错误码查 `errors.json`，未命中则展示原始错误消息

**验证**：构造几种典型错误场景，验证中英文切换。

## 八、测试策略

- **单元测试**（Vitest）：
  - `I18nProvider` 切换语言后组件文案变化
  - NodeRegistry 拦截层命中/缺失翻译的行为
  - `extractNodeStrings` 扫描结果稳定（快照测试）
- **集成测试**：
  - 设置页改语言 → 整页文案变化
  - 节点面板改语言后中英文切换
- **视觉验证**：按 `CLAUDE.md` 要求，UI 改动必须在浏览器中走查核心路径和回归点
- **类型检查与 lint**：每阶段交付前跑 `npm run typecheck && npm run lint && npm run test`

## 九、风险与权衡

| 风险 | 说明 | 缓解 |
|---|---|---|
| 节点版本与翻译表脱节 | 节点包升级后字段变了，翻译表键过时 | 扫描脚本对比 `en/nodes.json`（自动生成）与 `zh-CN/nodes.json`，列出未翻译或多余键 |
| 翻译工作量大 | 310 节点 × ~10 字段 = ~3000 字符串 | 阶段化推进，UI 先于节点；节点翻译可脚本辅助抽英文，人工只负责中文 |
| 翻译质量不一致 | 多人协作时术语漂移 | 术语词典（本文 §二）+ 翻译文件 PR 评审 |
| 第三方节点无翻译 | 第三方包注册的节点缺中文 | 自动回退英文，不阻塞功能；后续可由社区补译 |
| MUI 内置组件文案 | 某些 MUI 组件（如 `DatePicker`）内置英文文案 | 本期不统一接入 `LocalizationProvider`；迁移过程中如发现具体组件硬编码英文，单独处理 |

## 十、不在本期范围

- 上述「非目标」中列出的内容
- 中文以外的其他语言（架构层面留出扩展位）
- 中文输入法、中文文本截断、CJK 排版优化（若实际使用中发现问题再处理）
- 节点用户文档、README、教程内容
