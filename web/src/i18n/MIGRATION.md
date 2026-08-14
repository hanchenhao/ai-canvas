# i18n 迁移指南

本文件说明如何把 NodeTool Web 中硬编码的英文文案迁移到 i18n 翻译体系。中文翻译是首要目标(`zh-CN`),英文为源语言(`en`,回退语言)。

## 何时迁移

任何 PR 修改了用户可见的英文字符串(按钮、菜单、对话框、工具提示、错误消息)时,**在同一个 PR 中**把它迁移到 i18n。新增用户可见字符串时,必须同时提交 `en` 与 `zh-CN` 两份翻译。

## 架构概览

```
web/src/
├── i18n/
│   ├── index.ts                # i18next 实例,加载 22 个 namespace × 2 种语言
│   ├── I18nProvider.tsx        # 挂在根 Provider 栈,监听 SettingsStore.language
│   ├── I18nProvider.test.tsx
│   └── __tests__/
│       ├── localeParity.test.ts          # en vs zh-CN key 对等 + 同值守卫
│       ├── identical-allowlist.json      # 允许 en==zh 的 key 清单(模型名/单位等)
│       └── extractNodeStrings.test.ts
├── locales/
│   ├── en/<22 个 namespace>.json     # 英文源
│   └── zh-CN/<22 个 namespace>.json  # 中文翻译
├── hooks/useTranslatedNodeMetadata.ts  # 节点元数据翻译 hook
├── components/menus/LanguageSelector.tsx
└── utils/translateError.ts            # 错误码翻译
```

**Namespace 划分**:

| Namespace | 用途 | 维护方式 |
|-----------|------|----------|
| `common`        | 通用按钮、菜单、顶栏、侧栏、对话框、键盘快捷键、颜色选择器、PDF 查看器 | 手工维护 |
| `settings`      | 设置页(侧栏分类、条目、段标题、页标题、文件夹、Google Workspace、浏览器扩展、MCP、诊断面板) | 手工维护 |
| `nodes`         | 节点库(title / description / properties.*) | 英文源由 `npm run extract:nodes` 自动生成;中文翻译手工填 |
| `errors`        | 用户可见错误消息 | 手工维护,码用 `ApiErrorCode`(`@nodetool-ai/protocol/api-schemas`)|
| `canvas`        | 画布编辑器(右键菜单、节点体、节点菜单、节点编辑器、Inspector、执行树、合成器、Trace 面板) | 手工维护 |
| `timeline`      | 时间线编辑器(视频剪辑工具栏、轨道、片段、字幕) | 手工维护 |
| `sketch`        | 草图/图像编辑器(图层、画笔、工具设置) | 手工维护 |
| `storyboard`    | 故事板/分镜(镜头、场景、队列) | 手工维护 |
| `workspace`     | 工作区(版本历史、分享对话框、仪表盘、文本预览) | 手工维护 |
| `properties`    | 属性编辑器(图像/音频/视频/文本列表、字体、拖拽区、尺寸预设) | 手工维护 |
| `assets`        | 资产面板(素材库、上传、筛选) | 手工维护 |
| `collections`   | 向量库 / RAG 集合 | 手工维护 |
| `applications`  | 应用构建器(mini-app 文档、puck widgets) | 手工维护 |
| `chat`          | 聊天 / 助手快速入门 | 手工维护 |
| `jobs`          | 任务面板(运行队列、历史) | 手工维护 |
| `costs`         | 费用仪表盘 | 手工维护 |
| `models`        | 模型管理页 | 手工维护 |
| `workers`       | Worker 管理 | 手工维护 |
| `packages`      | 包管理器 | 手工维护 |
| `model3d`       | 3D 模型查看器 | 手工维护 |
| `huggingface`   | HuggingFace 集成 | 手工维护 |
| `tutorials`     | 教程页 | 手工维护 |

**当前覆盖**:全部 22 个 UI namespace 的 en/zh key 完全对等(`localeParity.test.ts` 守卫)。节点库 `nodes.json` 中文翻译覆盖度 100%(2923 个节点 / 30987 个 leaf key);UI 文案覆盖了设置页、顶栏、左侧栏、删除对话框、悬浮工具栏、工作流列表、Inspector、节点搜索/库/信息面板、Chain 编辑器、画布右键菜单、Timeline / Sketch / Storyboard 三个专业编辑器、版本历史、资产面板、属性编辑器、诊断面板、颜色选择器、PDF 查看器、键盘快捷键帮助、portal/dashboard、provider-onboarding 对话框、audio/video 录制器等,以及全部组件级 `title=` / `placeholder=` / `aria-label=` / `tooltip=` 属性文案。`identical-allowlist.json` 锁定了仍 en==zh 的合法 key(模型名、单位、占位符),后续误译会被守卫测试拦截。

**仍未迁移的硬编码英文**(2026-08-14 复扫):组件级 `title=` / `placeholder=` / `aria-label=` / `tooltip=` / `label=` 等属性已全部接入 `useTranslation`,此前「keys 已预置、组件未接线」的约 100 文件 / 260+ 字符串 backlog 已清零;同日复扫补上了单行正则漏掉的多行 JSX 句子(WelcomeFlow 欢迎卡片、ModelListIndex 空态、SettingsMenu 设置描述、NamespaceList 无结果提示、CostGuide 计费说明等约 40 处),以及第三轮宽松复扫(`[A-Z][A-Za-z]+` 开头、≥2 词、独立成行)抓出的约 100 处短标签——底部面板页签(PanelBottom VIEW_SPECS 改为 labelKey 模式)、FAL/KIE 定价浮层、agent 面板标题与欢迎语、模型列表侧栏、脚本编辑器工具栏、GettingStarted 清单等,浏览器实测(zh-CN)确认工作室首页、工作区、分镜编辑器全中文渲染且零 missing-key 警告。期间顺带修复了插值串 `chat:composer.pickModelToSend` 的机型号混入英文问题(改为翻译后的 modelKind 插值)。剩余的有意保留项:

- `color_picker/ColorInputs.tsx` 的单字母通道标签(R/G/B/H/S/L/A/C/M/Y/K)与十六进制占位符 `FFFFFF`——国际通用记号。
- `LayoutTest.tsx` 与 `preview/ComponentPreview.tsx`——开发用组件陈列页,不对终端用户暴露。
- 单位与格式示例(`Hz`、`my_workflow_tool` 占位符、`ID`)。
- `throw new Error(...)` 内部不变式与 agent 工具错误串(约 100 处)——不渲染为 UI 文案,面向开发者/模型,保留英文利于 grep 与模型理解。
- `ui_primitives/` 与 `editor_ui/` 内部的默认文案。
- 欢迎流程的示例提示词以外的模式标签(`image` / `video` / `audio` / `agent` 单字 chip)——技术模式名,保留英文。

## 模式

### 1. 在合适的 namespace 加 key

- 通用按钮/菜单/快捷键 → `common.json`
- 设置页相关(含诊断面板) → `settings.json`
- 画布相关(节点体、右键菜单、节点菜单、Inspector、执行树) → `canvas.json`
- 属性编辑器 → `properties.json`
- 资产面板 → `assets.json`
- 节点库 → `nodes.json`(英文源自动生成,中文翻译手工填)
- 错误消息 → `errors.json`

**命名约定**:按部位分组,键用 camelCase,避免重复。

```json
// zh-CN/common.json
{
  "button": { "save": "保存" },
  "menu": { "file": "文件" }
}
```

### 2. 在组件内使用 useTranslation

```tsx
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation(["common", "settings"]);
  return <button>{t("common:button.save")}</button>;
}
```

`useTranslation` 接受 namespace 数组,hook 会预加载这些 namespace。已经通过根 `I18nProvider` 挂载的实例不需要再手动初始化。

**不要直接调 `i18next` 的全局 API**——除非是在 hook 之外(例如 `translateError` 工具函数)。组件里一律走 `useTranslation`,这样语言切换会触发重渲染。

### 3. 节点元数据(节点卡片、Inspector、节点库列表)

不要直接读 `useMetadataStore`,用翻译 hook:

```tsx
import { useTranslatedNodeMetadata } from "../hooks/useTranslatedNodeMetadata";

const meta = useTranslatedNodeMetadata(nodeType);
// meta.title / meta.description 已按当前语言翻译;未翻译则回退到英文原值
// meta.properties[i].title / .description 同样翻译
```

批量场景(节点库列表、搜索结果):

```tsx
import { useAllTranslatedMetadata } from "../hooks/useTranslatedNodeMetadata";

const all = useAllTranslatedMetadata(); // NodeMetadata[],每项都是翻译后的浅拷贝
```

**关键行为(fallback 语义)**:

- hook 调用 `i18next.t` 取值,并通过对比返回值判断是否命中(详见源码注释)。
- 命中翻译:返回 `zh-CN/nodes.json` 中的值。
- 未命中(节点未翻译、或属性未翻译):返回 store 中原始英文值。**不写 `null`,不写 key 字符串本身**。
- store 原对象永不被修改——hook 返回浅拷贝。

**i18next missing-key quirk**:`i18next` 对未命中的 key 会返回「去掉 namespace 前缀的 key 字符串」(例如 `nodes:nodetool.foo.title` 未命中时返回 `nodetool.foo.title`),而非完整 key。`useTranslatedNodeMetadata` 与 `translateError` 都已处理这个行为——前者对比两种 key 形态判断命中,后者用 `i18n.exists` 做权威判定。新增依赖此行为的代码时务必参考这两个实现。

**当前已接入 `useTranslatedNodeMetadata` 的渲染点**:

- `components/Inspector.tsx`
- `components/node_editor/NodeInfoPanel.tsx`
- `components/chain_editor/ChainNodeCard.tsx`
- `components/chain_editor/ChainNodeProperties.tsx`
- `components/node_menu/NodeInfo.tsx`
- `components/node_menu/NodeItem.tsx`
- `components/node_menu/NodeLibraryRow.tsx`
- `components/node_menu/SearchResultItem.tsx`
- `components/node_menu/FavoritesTiles.tsx`
- `components/node_menu/RecentNodesTiles.tsx`

### 4. 添加新节点翻译

源码加节点或改节点 title/description 后:

```bash
npm run extract:nodes   # 重新生成 web/src/locales/en/nodes.json(幂等,按 node_type 与属性名排序)
```

然后在 `web/src/locales/zh-CN/nodes.json` 补对应翻译。key 结构:

```json
{
  "nodetool.text.Concat": {
    "title": "拼接文本",
    "description": "把多段文本拼成一段",
    "properties": {
      "a": { "title": "文本 A", "description": "第一段文本" },
      "b": { "title": "文本 B", "description": "第二段文本" }
    }
  }
}
```

`properties` 可省略——属性级 key 缺失时 hook 回退到 store 中的英文属性 title/description。

**翻译进度**:`en/nodes.json` 有 2923 个节点、30987 个 leaf key;`zh-CN/nodes.json` 覆盖率 **100%**(key 对等由 `localeParity.test.ts` 守卫)。`scripts/translate-nodes-batch2.mjs` 是辅助翻译脚本(短语替换 + 词典),当 `npm run extract:nodes` 抽出新的英文节点后,跑这个脚本得到首版中文翻译,再人工润色。

`npm run extract:nodes` 幂等可重复运行;输出按 `node_type` 与属性名排序,diff 稳定。源码:`scripts/extract-node-strings.ts`,纯函数 `extractNodeStrings` 在 `web/src/i18n/extractNodeStrings.ts`(带单元测试)。

### 5. 添加新错误码

错误码系统**复用**后端现有的 `ApiErrorCode`(`@nodetool-ai/protocol/api-schemas`),不再单独维护平行枚举。后端通过 `throwApiError(code, message)` 抛出,tRPC error formatter 把码附在 `err.data.apiCode`,前端 `ErrorStore.nodeErrorToDisplayString` 自动调 `translateError` 渲染。

1. 在 `packages/protocol/src/api-schemas/api-error-code.ts` 的 `ApiErrorCode` 枚举里加新码。
2. 在 `web/src/locales/en/errors.json` 与 `web/src/locales/zh-CN/errors.json` 加同 key 翻译(支持 `{{param}}` 插值)。
3. 后端 throw:`throwApiError(ApiErrorCode.YOUR_NEW_CODE, "english fallback message")`。
4. 前端不需要额外代码——任何 tRPC 错误经过 `nodeErrorToDisplayString` 都会自动本地化。

直接调用 `translateError`(用于非 tRPC 错误路径):

```ts
import { translateError } from "../utils/translateError";
import { ApiErrorCode } from "@nodetool-ai/protocol/api-schemas";

const message = translateError(
  ApiErrorCode.WORKFLOW_NOT_FOUND,    // 错误码
  `Workflow ${id} not found`,         // 回退消息(码无翻译时显示)
  { id }                              // 可选插值参数
);
```

**translateError 行为**:

- 码在当前语言 `errors` namespace 命中:返回翻译后的消息(带插值)。
- 码未命中:返回调用方传入的 `fallback` 字符串。**绝不返回 key 字符串本身**——这是 `translateError` 用 `i18n.exists` 而非字符串对比的原因。

当前 `errors.json` 覆盖了 `ApiErrorCode` 全部 16 个码(`NOT_FOUND` / `WORKFLOW_NOT_FOUND` / `WORKFLOW_EXECUTION_FAILED` / `ASSET_NOT_FOUND` / `BUDGET_EXCEEDED` 等)。

## 守卫测试

`web/src/i18n/__tests__/localeParity.test.ts` 是后续所有 i18n 改动的硬门控,共 23 个 describe(每 namespace 一组):

1. **同文件对等**——`en/` 下每个 `.json` 必须在 `zh-CN/` 下存在同名文件,反之亦然。
2. **key 集合对等**——每个 namespace 内,en 的每个 key 在 zh-CN 都要存在,反之亦然。
3. **同值守卫**——除 `identical-allowlist.json` 列出的合法项(模型名、单位、占位符)外,zh-CN 的值不得与 en 完全相同(防漏译)。

新增用户可见字符串时,只要在同一 PR 同步更新 en/zh 两份 JSON,这些测试就会保持 green。新引入「合法同值」项(例如新模型名)时,需要把 key 加进 `identical-allowlist.json` 并说明理由。

## 翻译质量约束

专有名词用业界通用译法;拿不准时第一次出现加括号注释英文,例如「工作流(Workflow)」「资产(Asset)」。详见 `feedback_i18n_translation_quality.md` 记忆条目。

## 不要翻译

- 用户自建内容(用户写的 prompt、Code 节点代码、工作流名、文件名)。
- 控制台日志、导出报告(开发者排错用,英文利于 grep)。
- 节点标识符(`node_type` 字符串本身,例如 `nodetool.text.Concat`)。
- API 字段名、数据库列名、模型 ID(如 `fal-ai/flux/schnell`)。

## 切换语言

用户通过设置 → 通用 → 语言下拉选择。三档:`auto`(跟随浏览器)、`en`、`zh-CN`。

- `LanguageSelector` 写 `SettingsStore.settings.language`。
- `I18nProvider` 监听该字段,调 `i18n.changeLanguage`。
- `auto` 解析为浏览器语言(`navigator.language` 以 `zh` 开头则 `zh-CN`,否则 `en`)。
- 语言选择通过 `localStorage["i18n-lang"]` 持久化,刷新页面后被记住。

切换语言不需要刷新页面——`useTranslation` 的组件会自动重渲染。

## 后续工作

i18n 主迁移已完成。后续维护关注:

1. **新增节点流程**:新增节点源码后跑 `npm run extract:nodes` 重新生成 `en/nodes.json`,再跑 `scripts/translate-nodes-batch2.mjs` 得到首版 zh-CN 翻译,最后人工审校。`localeParity.test.ts` 会拦截漏译。
2. **新错误码**:当前 16 个 `ApiErrorCode` 都已有翻译。新增码时记得同步 `errors.json`。
3. **节点描述润色**:`zh-CN/nodes.json` 已 100% key 覆盖,但 `fal.*` / `replicate.*` 中部分长描述因模型名括注保留了英文片段。深度润色需要语义级翻译,优先级低于新功能开发。
4. **新 UI 表面**:任何新增组件都必须用 `useTranslation`,并在同一 PR 内补 en + zh-CN 两份 key。硬编码英文 JSX 文本的快速复扫命令(三条都跑——单行、多行长句、独立成行的短标签):

   ```bash
   cd web/src && grep -rl --include="*.tsx" -E ">[A-Z][a-z]+( [A-Za-z']+){1,6}<" components/ \
     | grep -v __tests__ | grep -v ui_primitives | grep -v editor_ui
   grep -rn --include="*.tsx" -E '^\s{6,}[A-Z][a-z]+( [a-z'\'']+){2,9}[.!?]?\s*$' components/ \
     | grep -v __tests__ | grep -v ui_primitives | grep -v editor_ui
   grep -rn --include="*.tsx" -E "^[[:space:]]{6,}[A-Z][A-Za-z]+( [a-zA-Z'’]+){1,9}[.!?…]?[[:space:]]*$" components/ hooks/ \
     | grep -v __tests__ | grep -v ui_primitives | grep -v editor_ui
   ```

   注意正则覆盖不到的形态:模块级常量里的 `label:`/`title:` 字符串(应改为 labelKey 模式)、插值里混入的英文片段(如 `t(key, { label: "language" })`)、以及 `&quot;` 转义的多行 JSX 句子——浏览器实测(zh-CN 下肉眼过一遍主要表面)仍是最终兜底。
