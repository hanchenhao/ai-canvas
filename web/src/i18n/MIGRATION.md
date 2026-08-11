# i18n 迁移指南

本文件说明如何把 NodeTool Web 中硬编码的英文文案迁移到 i18n 翻译体系。中文翻译是首要目标（`zh-CN`），英文为源语言（`en`，回退语言）。

## 何时迁移

任何 PR 修改了用户可见的英文字符串（按钮、菜单、对话框、工具提示、错误消息）时，**在同一个 PR 中**把它迁移到 i18n。新增用户可见字符串时，必须同时提交 `en` 与 `zh-CN` 两份翻译。

## 架构概览

```
web/src/
├── i18n/
│   ├── index.ts                # i18next 实例，加载 4 个 namespace × 2 种语言
│   ├── I18nProvider.tsx        # 挂在根 Provider 栈，监听 SettingsStore.language
│   └── I18nProvider.test.tsx
├── locales/
│   ├── en/{common,settings,nodes,errors}.json   # 英文源
│   └── zh-CN/{common,settings,nodes,errors}.json # 中文翻译
├── hooks/useTranslatedNodeMetadata.ts  # 节点元数据翻译 hook
├── components/menus/LanguageSelector.tsx
└── utils/translateError.ts            # 错误码翻译
```

**Namespace 划分**：

| Namespace | 用途 | 维护方式 |
|-----------|------|----------|
| `common`  | 通用按钮、菜单、语言选择器等跨页面文案 | 手工维护 |
| `settings`| 设置页（侧栏分类、条目、段标题、页标题） | 手工维护 |
| `nodes`   | 节点库（title / description / properties.* ） | 英文源由 `npm run extract:nodes` 自动生成；中文翻译手工填 |
| `errors`  | 用户可见错误消息 | 手工维护，码在 `USER_FACING_ERROR_CODES` |

## 模式

### 1. 在合适的 namespace 加 key

- 通用按钮/菜单 → `common.json`
- 设置页相关 → `settings.json`
- 节点库 → `nodes.json`（英文源自动生成，中文翻译手工填）
- 错误消息 → `errors.json`

**命名约定**：按部位分组，键用 camelCase，避免重复。

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

`useTranslation` 接受 namespace 数组，hook 会预加载这些 namespace。已经通过根 `I18nProvider` 挂载的实例不需要再手动初始化。

**不要直接调 `i18next` 的全局 API**——除非是在 hook 之外（例如 `translateError` 工具函数）。组件里一律走 `useTranslation`，这样语言切换会触发重渲染。

### 3. 节点元数据（节点卡片、Inspector、节点库列表）

不要直接读 `useMetadataStore`，用翻译 hook：

```tsx
import { useTranslatedNodeMetadata } from "../hooks/useTranslatedNodeMetadata";

const meta = useTranslatedNodeMetadata(nodeType);
// meta.title / meta.description 已按当前语言翻译；未翻译则回退到英文原值
// meta.properties[i].title / .description 同样翻译
```

批量场景（节点库列表、搜索结果）：

```tsx
import { useAllTranslatedMetadata } from "../hooks/useTranslatedNodeMetadata";

const all = useAllTranslatedMetadata(); // NodeMetadata[]，每项都是翻译后的浅拷贝
```

**关键行为（fallback 语义）**：

- hook 调用 `i18next.t` 取值，并通过对比返回值判断是否命中（详见源码注释）。
- 命中翻译：返回 `zh-CN/nodes.json` 中的值。
- 未命中（节点未翻译、或属性未翻译）：返回 store 中原始英文值。**不写 `null`，不写 key 字符串本身**。
- store 原对象永不被修改——hook 返回浅拷贝。

**i18next missing-key quirk**：`i18next` 对未命中的 key 会返回「去掉 namespace 前缀的 key 字符串」（例如 `nodes:nodetool.foo.title` 未命中时返回 `nodetool.foo.title`），而非完整 key。`useTranslatedNodeMetadata` 与 `translateError` 都已处理这个行为——前者对比两种 key 形态判断命中，后者用 `i18n.exists` 做权威判定。新增依赖此行为的代码时务必参考这两个实现。

**当前迁移覆盖范围**：`useTranslatedNodeMetadata` 已接入以下渲染点（Task 10）：

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

源码加节点或改节点 title/description 后：

```bash
npm run extract:nodes   # 重新生成 web/src/locales/en/nodes.json（幂等，按 node_type 与属性名排序）
```

然后在 `web/src/locales/zh-CN/nodes.json` 补对应翻译。key 结构：

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

**翻译进度**：`en/nodes.json` 当前有 2900+ 节点条目；`zh-CN/nodes.json` 已翻译 **20 个种子节点**（`nodetool.constant.*`、`nodetool.text.*`、`nodetool.image.*` 等高频节点）。剩余约 2900 个节点的中文翻译是内容工作，按 PR 增量补充——见下方「后续工作」。

`npm run extract:nodes` 幂等可重复运行；输出按 `node_type` 与属性名排序，diff 稳定。源码：`scripts/extract-node-strings.ts`。

### 5. 添加新错误码

1. 在 `packages/protocol/src/errors.ts` 的 `USER_FACING_ERROR_CODES` 加码（同时会自动推导 `UserFacingErrorCode` 类型）。
2. 在 `web/src/locales/en/errors.json` 与 `web/src/locales/zh-CN/errors.json` 加同 key 翻译（支持 `{{param}}` 插值）。
3. 后端 throw 时携带错误码（后续工程，见下方「后续工作」）。
4. 前端调用点用 `translateError`：

```ts
import { translateError } from "../utils/translateError";

const message = translateError(
  "node_invocation_error",           // 错误码
  `Node '${nodeType}' failed`,       // 回退消息（码无翻译时显示）
  { nodeType }                       // 可选插值参数
);
```

**translateError 行为**：

- 码在当前语言 `errors` namespace 命中：返回翻译后的消息（带插值）。
- 码未命中（码不在 `USER_FACING_ERROR_CODES`，或当前语言缺翻译）：返回调用方传入的 `fallback` 字符串。**绝不返回 key 字符串本身**——这是 `translateError` 用 `i18n.exists` 而非字符串对比的原因。

当前支持的 10 个错误码见 `packages/protocol/src/errors.ts`。

## 翻译质量约束

专有名词用业界通用译法；拿不准时第一次出现加括号注释英文，例如「工作流（Workflow）」「资产（Asset）」。详见 `feedback_i18n_translation_quality.md` 记忆条目。

## 不要翻译

- 用户自建内容（用户写的 prompt、Code 节点代码、工作流名、文件名）。
- 控制台日志（开发者排错用，英文利于 grep）。
- 节点标识符（`node_type` 字符串本身，例如 `nodetool.text.Concat`）。
- API 字段名、数据库列名。

## 切换语言

用户通过设置 → 通用 → 语言下拉选择。三档：`auto`（跟随浏览器）、`en`、`zh-CN`。

- `LanguageSelector` 写 `SettingsStore.settings.language`。
- `I18nProvider` 监听该字段，调 `i18n.changeLanguage`。
- `auto` 解析为浏览器语言（`navigator.language` 以 `zh` 开头则 `zh-CN`，否则 `en`）。
- 语言选择通过 `localStorage["i18n-lang"]` 持久化，刷新页面后被记住。

切换语言不需要刷新页面——`useTranslation` 的组件会自动重渲染。

## 后续工作（不在 12-task 计划内）

以下迁移按本指南持续推进，可在多个 PR 中分批完成：

1. **剩余 SettingsMenu 文案**：通用 Tab 之外的设置项标签、描述、`LabeledSwitch` 的 `label`/`description` prop。
2. **对话框、上下文菜单、工具提示**：各 `Dialog`、右键菜单、`Tooltip` 内容。
3. **剩余节点翻译**：`zh-CN/nodes.json` 从 20 个种子节点扩到 2900+——纯内容工作。
4. **后端错误码接入**：后端 throw 时使用 `USER_FACING_ERROR_CODES` 中的码（替换或补充原始错误消息），前端用 `translateError` 渲染。
