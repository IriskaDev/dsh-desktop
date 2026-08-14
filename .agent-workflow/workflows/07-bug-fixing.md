<!-- MODULE: bug-fixing -->
<!-- STATUS: PARTIAL -->
<!-- LAST_ANALYZED: 2026-08-15 -->
<!-- ANALYZER_VERSION: 1.0 -->

# Bug 排查修复流程

> 从问题确认到修复上线的完整 SOP，包含复现、定位根因、修复、回归验证、提交各阶段说明。

---

## 概述

<!-- CONTENT_START: overview -->
本项目为极简插件，调试手段主要是观察 stdout 的 JSONL 事件流（`turn/start` → `delta` → `message` → `turn/end`）与 Node 进程退出码。无日志框架、无错误追踪平台、无 IDE 调试配置。

- 问题分类与优先级：待补充（未建立 Bug 流程）
<!-- CONTENT_END: overview -->

---

## 日志系统

<!-- CONTENT_START: logging -->
| 项目 | 说明 |
|------|------|
| 日志框架 | 无（直接用 `process.stdout.write` 输出 JSONL） |
| 日志级别配置 | 无 |
| 日志文件位置 | 无（stdout，未落盘） |
| 日志查看命令 | 直接观察 stdout：`"..." | dsh --profile desktop` |
<!-- CONTENT_END: logging -->

---

## 调试工具配置

<!-- CONTENT_START: debug_config -->
> 未检测到 `.vscode/launch.json` 或 `.idea/runConfigurations/`。

```json
// 待补充：IDE 调试启动配置
```

**常用排查命令**：
```bash
# 观察 JSONL 事件流
"帮我看看当前目录" | dsh --profile desktop
# 语法校验
node --check src/index.js
```
<!-- CONTENT_END: debug_config -->

---

## 错误追踪平台

<!-- CONTENT_START: error_tracking -->
> 未检测到错误追踪平台集成。

- 错误追踪平台：无（Sentry / Bugsnag 等均未集成）
- 告警配置：无
- 错误分类与处理策略：待补充
- 当前错误出口：`turn/end` 事件的 `reason: "error"` + `error` 字段（JSONL）
<!-- CONTENT_END: error_tracking -->

---

## Bug 修复 SOP

> 以下为标准 Bug 修复流程，按步骤顺序执行。每个步骤标注了**判断条件**和**失败处理**。

<!-- CONTENT_START: fix_workflow -->

### Step 1 · 确认问题与复现

- 从 Bug 单/告警/用户反馈中获取**完整的复现步骤**、错误信息、日志、环境信息
- 在本地/测试环境**稳定复现**问题
- 明确问题的**影响范围**和**优先级**（阻塞/严重/一般）

**判断**：
- 能稳定复现 → 继续 Step 2
- 无法复现 → 补充环境信息后重试；确认是偶发问题后记录现象，标注为待观察
- 问题为**线上紧急故障**（P0/Hotfix）→ 跳转至 [Hotfix 流程](#hotfix-流程)

---

### Step 2 · 确认/切换分支

根据 Bug 严重程度选择基础分支（参考 [分支提交规范](../workflows/11-branch-commit.md)）：

<!-- CONTENT_START: branch_for_fix -->
> 未建立分支命名规范（当前仅 `main`）。参考 [分支提交规范](../workflows/11-branch-commit.md)。

| 场景 | 基础分支 | 分支命名示例 |
|------|---------|------------|
| 普通 Bug 修复 | `main` | `fix/<issue-id>-<desc>` |
| 紧急 Hotfix | `main` | `hotfix/<desc>` |

```bash
git checkout main
git pull
git checkout -b fix/<issue-id>-<简短描述>
```
<!-- CONTENT_END: branch_for_fix -->

---

### Step 3 · 定位根因

利用以下手段定位问题根因：

1. **查看日志**：按日志系统配置查看错误日志，定位异常堆栈
2. **IDE 调试**：在可疑代码处打断点，单步跟踪数据流
3. **代码审查**：review 相关模块的最近提交历史（`git log`/`git blame`）
4. **二分法**：通过 `git bisect` 定位引入问题的提交

**根因记录**（填写到 Bug 单）：
- 问题文件 / 函数 / 行号
- 触发条件
- 影响范围（是否有其他相似代码存在同样问题）

---

### Step 4 · 编写修复代码

针对根因修复，注意：

- 修复范围聚焦，**不夹带无关改动**
- 如发现同类问题，一并修复并在 Bug 单中注明
- 记录本次变更类型（仅修改内容 / 有文件增删），决定后续编译模式
- 遵守编码规范（参考 [规则限制](../workflows/02-rules-constraints.md)）

---

### Step 5 · 本机快速编译（验证修复）

根据变更类型选择编译模式（详见 [编译流程](../workflows/04-build-process.md)）：

<!-- CONTENT_START: build_cmd_for_fix -->
> 零 build 项目，无编译步骤（参考 [编译流程](../workflows/04-build-process.md)）。

| 变更类型 | 编译模式 | 命令 |
|---------|---------|------|
| 仅修改文件内容 | 不适用 | 无构建（可 `node --check` 语法校验） |
| 新增/删除文件 | 不适用 | 无构建 |
| 产物异常/缓存污染 | 不适用 | 无构建缓存 |
<!-- CONTENT_END: build_cmd_for_fix -->

**判断**：
- 编译通过 → 继续 Step 6
- 编译失败 → 修复编译错误后重新执行 Step 5

---

### Step 6 · 添加回归测试用例

- **必须**为本次修复的 Bug 添加对应的回归测试用例，防止问题再次引入
- 测试用例应覆盖触发该 Bug 的边界条件
- 测试文件存放位置和命名规范参考 [测试流程](../workflows/05-testing-process.md)

---

### Step 7 · 运行单元测试

<!-- CONTENT_START: unit_test_cmd -->
```bash
# 待补充：运行与本次修复相关的单元测试（本项目暂无测试）
```
<!-- CONTENT_END: unit_test_cmd -->

**判断**：
- 全部通过（含新增回归用例）→ 继续 Step 8
- 有失败 → 修复后重新执行 Step 5 → Step 7

---

### Step 8 · 运行全量测试

<!-- CONTENT_START: full_test_cmd -->
```bash
# 待补充：运行全量测试套件（本项目暂无测试）
```
<!-- CONTENT_END: full_test_cmd -->

**判断**：
- 全部通过 → 继续 Step 9
- 有失败（非本次改动引入）→ 记录已有失败用例，评估是否阻塞提交
- 有失败（本次改动引入）→ 必须修复后重新执行 Step 5 → Step 8

---

### Step 9 · 全平台编译

<!-- CONTENT_START: full_platform_build_cmd -->
```bash
# 待补充：当前宿主平台支持的全平台编译命令（零 build，Electron 打包后补充）
```
<!-- CONTENT_END: full_platform_build_cmd -->

**判断**：
- 所有平台编译通过 → 继续 Step 10
- 某平台编译失败 → 修复后重新执行 Step 9，确认全部通过后再继续

---

### Step 10 · 更新相关文档

如果本次修复涉及以下情况，需同步更新文档：

- 修复了接口/行为 Bug，导致接口语义变化 → 更新 `.agent-workflow/modules/` 下对应模块文档
- 修复了构建/部署相关问题 → 更新 [编译流程](../workflows/04-build-process.md) 或 [发布流程](../workflows/06-release-process.md)
- 发现了已知问题/限制 → 在对应模块的 `备注` 中记录

**模块索引同步（必须执行）**：凡是更新了 `modules/<module-name>.md` 的，**必须**同步更新 `.agent-workflow/modules/index.md` 对应行：
- 若为新增模块：在索引表追加一行，填写 `模块ID / 模块名称 / 职责概述 / 状态 / 关键词 / 文件链接`
- 若为更新模块：同步修改对应行的「职责概述」「关键词」「状态」字段

> ⚠️ **硬性约束**：禁止在未更新 `modules/index.md` 的情况下完成本步骤，否则索引与实际内容将产生偏差，影响 Agent 按需加载模块信息的准确性。

---

### Step 11 · Git 提交

<!-- CONTENT_START: git_commit_cmd -->
> 本项目已实测使用 Conventional Commits（`fix:`）。

```bash
git add <变更文件>
git commit -m "fix(<scope>): <描述修复内容>

关联 Bug 单: #<issue-id>
根因: <简要描述>"
git push origin <当前分支>
```
<!-- CONTENT_END: git_commit_cmd -->

**提交前检查清单**：
- [ ] 编译通过（增量或全量）
- [ ] 单元测试全部通过（含新增回归用例）
- [ ] 全量测试通过（或已知失败均为存量问题）
- [ ] 全平台编译通过
- [ ] 已关联 Bug 单号
- [ ] 无调试代码、无临时注释

---

### Step 12 · 提交 PR

参考 [PR 提交规范](../workflows/12-pull-request.md) 创建 PR。

**PR 描述必须包含**：
- 问题描述（Bug 现象）
- 根因分析
- 修复方案
- 验证方式（如何验证 Bug 已修复）
- 关联 Bug 单据

<!-- CONTENT_END: fix_workflow -->

---

## Hotfix 流程

> 适用于**线上紧急故障**，需要绕过常规开发流程快速上线修复。

<!-- CONTENT_START: hotfix_workflow -->
> 项目早期，生产分支即 `main`。

**与普通 Bug 修复的区别**：
- 基于 `main` 创建 `hotfix/*` 分支
- 修复合并后需同步回开发分支（如有）
- 可酌情简化测试范围，但回归测试用例必须补充

```bash
git checkout main
git pull
git checkout -b hotfix/<简短描述>
```
<!-- CONTENT_END: hotfix_workflow -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
- `src/index.js` — 事件流输出（可观测面）
- 无日志框架 / 调试 / 错误追踪配置
<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->
<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查文件: .vscode/launch.json, .idea/runConfigurations/
  - 检查文件: log4j.properties, log4j2.xml, logback.xml, logging.conf, logging.yaml
  - 检查文件: .sentryclirc, sentry.properties
  - 检查配置: package.json(依赖中的 winston/pino/bunyan/log4js/sentry)
  - 检查配置: requirements.txt/Pipfile(logging/sentry-sdk 依赖)
  - 检查配置: go.mod(zap/logrus/sentry-go 依赖)
  - 检查目录: logs/, log/
  - 检查文件: .gdbinit, .lldbinit
  - 检查文件: docker-compose.yml(日志相关配置)
  - 提取信息: 日志框架, 日志级别配置, 日志文件路径, 日志查看命令
  - 提取信息: 调试启动配置（IDE launch.json）, 常用调试命令
  - 提取信息: 错误追踪平台配置, 监控告警配置
  - 提取信息: 单元测试命令（引用自 05-testing-process）
  - 提取信息: 全量测试命令（引用自 05-testing-process）
  - 提取信息: 本机增量/全量/重置编译命令（引用自 04-build-process）
  - 提取信息: 全平台编译命令（引用自 04-build-process）
  - 提取信息: 分支命名规范（fix/* / hotfix/*，引用自 11-branch-commit）
  - 提取信息: 生产分支名称（用于 hotfix 基础分支，引用自 06-release-process）
-->
