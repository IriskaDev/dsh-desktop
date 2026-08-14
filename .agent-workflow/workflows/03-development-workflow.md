<!-- MODULE: development-workflow -->
<!-- STATUS: PARTIAL -->
<!-- LAST_ANALYZED: 2026-08-15 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 开发流程

> 从需求到 PR 提交的完整日常开发 SOP，包含分支确认、代码修改、编译验证、测试、文档更新、提交等各阶段说明。

---

## 概述

<!-- CONTENT_START: overview -->
本项目的「开发」= 改 DSH surface 插件（`src/*.js` + `cordis.patch.yml`）并通过真实 profile 流式跑通。当前无 build / test 步骤（零 build 纯 ESM），后续 Electron 外壳落地后需补充构建与测试。

- **前置条件**：Node v26.2.0 + DSH rc.6 + 已 link 的 `~/.dsh/profiles/desktop`
<!-- CONTENT_END: overview -->

---

## 环境搭建

<!-- CONTENT_START: environment_setup -->
- **系统要求**：Windows / macOS / Linux（Node 环境）；当前开发机为 Windows
- **运行时**：Node.js `v26.2.0`（nvm 管理）、pnpm `11.21.0`、DSH `rc.6`
- **环境变量**：
  - `DSH_HOME` → `C:\Users\IriskaDev\.dsh`（Windows）
  - `DEEPSEEK_API_KEY` → 存于 `~/.dsh/.credentials.yaml`（沙箱 env 中无，跑真实流式需真实 DSH_HOME）
- **无容器化开发环境**（未检测到 Dockerfile / devcontainer）
<!-- CONTENT_END: environment_setup -->

---

## 依赖安装

<!-- CONTENT_START: dependency_install -->
```bash
# 本项目零依赖，无需 npm/pnpm install
# 插件通过 profile link 方式安装：
dsh plugin --profile desktop add link:D:\workbench\projects\dsh-desktop
```
<!-- CONTENT_END: dependency_install -->

---

## 本地运行

<!-- CONTENT_START: local_run -->
```bash
# 端到端跑一次（stdin 传入首轮用户输入）：
"帮我看看当前目录" | dsh --profile desktop
```

**访问地址**：无（CLI 进程，stdout 输出 JSONL）
<!-- CONTENT_END: local_run -->

---

## 日常开发 SOP

> 以下为标准开发流程，按步骤顺序执行。每个步骤标注了**判断条件**和**失败处理**。

<!-- CONTENT_START: daily_workflow -->

### Step 1 · 确认当前分支

```bash
git branch        # 查看当前分支
git status        # 确认工作区是否干净
```

**判断**：
- 当前分支符合本次开发任务 → 继续 Step 2
- 当前分支不符合 → 执行 Step 2（切换/创建分支）
- 工作区有未提交的改动 → 先 `git stash` 暂存，或确认是否属于当前任务

---

### Step 2 · 确认/切换分支

<!-- CONTENT_START: dev_branch_cmd -->
> ⚠️ **待实现** - 请根据项目分支策略填写，或参考 [分支提交规范](../workflows/11-branch-commit.md)。

**分支命名规范**：待补充（当前仅 `main` 分支；建议 `feature/<desc>` / `fix/<desc>` / `hotfix/<desc>`，详见 [分支提交规范](../workflows/11-branch-commit.md)）

**操作**：
```bash
# 基于最新主干创建新分支
git checkout <目标基础分支>
git pull
git checkout -b <新分支名>

# 或切换到已有分支
git checkout <已有分支名>
git pull origin <已有分支名>
```
<!-- CONTENT_END: dev_branch_cmd -->

---

### Step 3 · 需求分析（强制先查模块台账）

在开始写代码前，**必须先按 [15-module-inventory.md](../workflows/15-module-inventory.md) Step 4 的协议查台账**，明确以下内容：

**3.1 查台账定位相关模块**（强制）：
1. 读取 `.agent-workflow/modules/index.md`，用需求关键词匹配「关键词」列，得到候选模块清单
2. 对命中模块执行 [15-module-inventory.md Step 6 时效性校验](../workflows/15-module-inventory.md#step-6--时效性校验规则)：
   - 🟢 有效 → 直接加载对应模块档案
   - 🟡/🔴 → 先执行 [15 Step 5 增量更新](../workflows/15-module-inventory.md#step-5--增量更新流程自动--手动共用) 再加载
   - ⚪ 未建档 → 若属于本次改动核心区域，先补建档案
3. **加载模块档案后**，按下列三段梳理改动范围：
   - **主改动模块**：修改点所在模块（读「核心接口」「入口点」章节）
   - **影响面模块**：主改动模块的「下游调用方」（可能被波及，需评估级联刷新）
   - **依赖检查**：主改动模块的「上游依赖」（是否需要联动改）

**3.2 明确本次改动的技术边界**：
- **需求范围**：本次改动涉及哪些模块/文件？（结合 3.1 的模块清单）
- **接口变更**：是否修改对外接口、公共头文件、导出符号？（影响编译模式选择 + 是否触发 15 Step 5.3 的级联刷新）
- **文件变更类型**：
  - 仅修改现有文件内容 → 后续可使用**增量编译**
  - 有文件新增/删除 → 后续必须使用**全量编译**
- **测试影响范围**：改动会影响哪些已有单元测试？是否需要新增用例？

> ⚠️ **硬性约束**：跳过 3.1 直接进入 Step 4 视为流程违规。若模块台账尚未建立，先执行 [15 Step 3 首次台账建立](../workflows/15-module-inventory.md#step-3--首次台账建立流程)。

---

### Step 4 · 代码修改

按需求分析结果进行代码修改。注意：

- 遵守项目编码规范（参考 [规则限制](../workflows/02-rules-constraints.md)）
- 修改范围尽量聚焦，避免夹带无关改动
- 如有新增/删除文件，记录下来（影响 Step 5 编译模式）

---

### Step 5 · 本机快速编译（验证改动）

根据 Step 3/4 的变更类型选择编译模式（详见 [编译流程](../workflows/04-build-process.md)）：

<!-- CONTENT_START: quick_build_cmd -->
> 零 build 项目，无编译步骤（详见 [编译流程](../workflows/04-build-process.md)）。可选语法校验：

| 变更类型 | 编译模式 | 命令 |
|---------|---------|------|
| 仅修改文件内容 | 不适用 | `node --check src/index.js && node --check src/startup.js` |
| 新增/删除文件、修改构建配置 | 不适用 | 同上（确认 `package.json` exports/main 指向正确） |
| 产物异常/缓存污染 | 不适用 | 无构建缓存/中间产物 |
<!-- CONTENT_END: quick_build_cmd -->

**判断**：
- 编译通过 → 继续 Step 6
- 编译失败 → 修复编译错误后重新执行 Step 5，不进入下一步

---

### Step 6 · 新增/更新单元测试用例

- 若本次改动新增了功能或修复了 Bug，**必须**新增对应的单元测试用例
- 若改动修改了已有逻辑，检查并更新受影响的测试用例
- 测试文件存放位置和命名规范参考 [测试流程](../workflows/05-testing-process.md)

---

### Step 7 · 运行单元测试

<!-- CONTENT_START: unit_test_cmd -->
> 未检测到测试框架（无 test 脚本、无测试目录）。待引入后补充（参考 [测试流程](../workflows/05-testing-process.md)）。

```bash
# 待补充：运行与本次改动相关的单元测试
```
<!-- CONTENT_END: unit_test_cmd -->

**判断**：
- 全部通过 → 继续 Step 8
- 有失败 → 修复后重新执行 Step 5 → Step 7，不进入下一步

---

### Step 8 · 运行全量测试

<!-- CONTENT_START: full_test_cmd -->
> 未检测到测试配置。

```bash
# 待补充：运行全量测试套件
```
<!-- CONTENT_END: full_test_cmd -->

**判断**：
- 全部通过 → 继续 Step 9
- 有失败（非本次改动引入）→ 记录已有失败用例，评估是否阻塞提交
- 有失败（本次改动引入）→ 必须修复后重新执行 Step 5 → Step 8

---

### Step 9 · 全平台编译

测试通过后，执行全平台编译，确保改动不破坏其他目标平台（详见 [编译流程 - 全平台编译](../workflows/04-build-process.md)）：

<!-- CONTENT_START: full_platform_build_cmd -->
> 零 build 项目，暂无全平台编译；Electron 打包落地后补充（参考 [编译流程](../workflows/04-build-process.md)）。

```bash
# 待补充：Electron 打包（electron-builder 等）
```
<!-- CONTENT_END: full_platform_build_cmd -->

**判断**：
- 所有平台编译通过 → 继续 Step 10
- 某平台编译失败 → 修复后重新执行 Step 9，确认全部通过后再继续

---

### Step 10 · 更新模块台账与工作流文档（强制）

本步骤是 **[15-module-inventory.md Step 5 增量更新](../workflows/15-module-inventory.md#step-5--增量更新流程自动--手动共用) 的执行入口**，任务向用户报告完成前必须执行。

**10.1 模块台账增量更新（强制）**

对本次改动涉及的每个模块，执行 [15 Step 5 增量更新](../workflows/15-module-inventory.md#52-更新步骤)：

1. 保留档案中的手动补充内容（`## 备注` 与用户显式标记的段落）
2. 重新扫描三类关系（上游依赖 / 下游调用方 / 下游数据调用），差量更新
3. 更新档案头部 `<!-- LAST_ANALYZED: YYYY-MM-DD -->`
4. 检查是否发生**模块边界变化**（新增/删除对外入口、规模剧变），必要时新建/合并/拆分档案
5. **接口签名变化时触发 1 层级联**：若本模块对外接口签名有变，须同步刷新其「下游调用方」列表中所有模块档案的「上游依赖」章节（详见 [15 Step 5.3](../workflows/15-module-inventory.md#53-更新粒度)）

**10.2 模块索引同步（强制）**

凡是更新了 `modules/<module-name>.md` 的，**必须**同步更新 `.agent-workflow/modules/index.md` 对应行：
- 若为新增模块：追加一行，填写 `模块ID / 模块名称 / 职责概述 / 状态 / 关键词 / 时效状态 / 最后更新 / 文件链接`
- 若为更新模块：同步修改对应行的「职责概述」「关键词」「状态」「时效状态=🟢 有效」「最后更新=今日」

**10.3 关联工作流文档同步（按需）**

- 修改了构建方式或依赖 → 更新 [编译流程](../workflows/04-build-process.md)
- 修改了项目整体结构 → 更新 [项目说明](../workflows/01-project-overview.md)
- 新增/修改对外接口 → 已由 10.1 覆盖

> ⚠️ **硬性约束**：
> 1. 未执行 10.1 就进入 Step 11 视为**流程违规**，任务不得报告完成
> 2. 未执行 10.2（索引同步）会导致 Agent 后续无法通过关键词命中该模块，属于**质量事故**

---

### Step 11 · Git 提交

<!-- CONTENT_START: git_commit_cmd -->
> 本项目已实测使用 Conventional Commits（见 `git log`：`chore:`、`docs:`）。

```bash
git add <变更文件>      # 精确 add，避免提交无关文件
git commit -m "<type>(<scope>): <description>"
git push origin <当前分支>
```

**Commit 消息规范**：Conventional Commits（`feat`/`fix`/`docs`/`refactor`/`test`/`chore` 等），详见 [分支提交规范](../workflows/11-branch-commit.md)
<!-- CONTENT_END: git_commit_cmd -->

**提交前检查清单**：
- [ ] 编译通过（增量或全量）
- [ ] 单元测试全部通过
- [ ] 全量测试通过（或已知失败均为存量问题）
- [ ] 全平台编译通过
- [ ] **模块台账已同步**（Step 10.1 已执行，受影响模块档案 `LAST_ANALYZED` = 今日）
- [ ] **模块索引已同步**（Step 10.2 已执行，`modules/index.md` 时效状态 🟢）
- [ ] 关联工作流文档已同步更新
- [ ] 无调试代码、无敏感信息

---

### Step 12 · 提交 PR

参考 [PR 提交规范](../workflows/12-pull-request.md) 在代码托管平台创建 PR。

**PR 要求**：
- 标题遵循 commit 规范格式
- 描述中说明改动内容、测试情况、关联需求/Bug 单据
- 指定正确的目标分支和评审人

<!-- CONTENT_END: daily_workflow -->

---

## 开发工具推荐

<!-- CONTENT_START: dev_tools -->
> 未检测到 `.vscode/`、`.editorconfig` 等编辑器配置。

| 工具 | 用途 | 配置文件 |
|------|------|---------|
| （无） | - | - |

> 推荐（待补充）：Node.js 调试、ESM 支持等编辑器扩展。
<!-- CONTENT_END: dev_tools -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
- `package.json` — 无 scripts（零 build/零 test）
- `README.md` — 安装与运行命令
- `PLAN.md` — 环境速查（Node/DSH/pnpm 版本）
- `cordis.patch.yml` — 插件编排
- `src/*.js` — 插件源码
<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->
<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查文件: Dockerfile, docker-compose.yml, docker-compose.yaml, .devcontainer/devcontainer.json
  - 检查文件: Vagrantfile
  - 检查文件: Makefile(dev/run/serve/test/clean 目标), Justfile
  - 检查文件: package.json(scripts.dev/start/serve/test/build/clean)
  - 检查文件: .env, .env.example, .env.development, .env.local
  - 检查文件: .vscode/settings.json, .vscode/extensions.json, .vscode/launch.json
  - 检查文件: .idea/, .editorconfig
  - 检查文件: tilt.yaml, skaffold.yaml
  - 检查文件: commitlint.config.*, .commitlintrc*, .czrc（commit 规范配置）
  - 检查目录: .devcontainer/
  - 提取信息: 启动命令, 端口号, 环境变量列表, 依赖安装命令, 开发工具配置
  - 提取信息: 单元测试命令（支持按模块/文件过滤）, 全量测试命令
  - 提取信息: 本机增量/全量/重置编译命令（引用自 04-build-process）
  - 提取信息: 全平台编译命令（引用自 04-build-process）
  - 提取信息: commit 消息规范, 分支命名规范（引用自 11-branch-commit）
-->
