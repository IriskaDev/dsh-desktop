<!-- TASK_ID: 20260919-macos-ipc-socket-path-length -->
<!-- TASK_TYPE: bugfix -->
<!-- STATUS: DONE -->
<!-- CREATED: 2026-09-19 -->
<!-- LAST_UPDATED: 2026-09-19 09:47 -->
<!-- OWNER: IriskaDev -->
<!-- BRANCH: fix/macos-ipc-socket-path-length -->
<!-- SEVERITY: P1 -->
<!-- RELATED_WORKFLOWS: 07,04,05,08,11,12,13 -->
<!-- 约束源：analyzer-instructions.md#约束常量表 表 A · RELATED_WORKFLOWS_BUGFIX / TASK_STATUS_ENUM / TASK_TYPE_ENUM；修改本行前请先改常量表（D5.E1/E2 自检规则会校验）。 -->

# macOS 下 IPC socket 路径超长导致 Electron 窗口无法启动

> macOS 上 `dsh --profile dsh-desktop` 进程存活但永不出现窗口，且 stdout/stderr 无任何输出。

> 📐 **章节结构（共 8 节）**：1 问题描述 → 2 复现步骤 → 3 根因分析 → 4 修复计划 → 5 关键决策 → 6 进度日志 → 7 风险与阻塞 → 8 **验收清单（最后一节）**

---

## 1. 问题描述

<!-- CONTENT_START: issue -->
- **现象**：macOS 上执行 `dsh --profile dsh-desktop`，dsh 进程正常存活（DSH 侧 webServer 兼容服务、route 注册均无报错），但**永远不出现 Electron 窗口**；30s 内 `ps` 中查不到 Electron 子进程，`$TMPDIR` 下也没有 `dsh-desktop-*.sock`；stdout/stderr 完全静默。
- **预期行为**：`apply()` 阶段 spawn Electron（冷启动与 loader 结算重叠），loader 结算且 Typert Gateway 就绪后发 `ready` 帧，Electron 收到后创建窗口。
- **影响范围**：**所有 macOS 用户**（`os.tmpdir()` 为 `/var/folders/<x>/<hash>/T`，长度足以溢出 Unix socket 路径上限）；Linux（`os.tmpdir()` = `/tmp`）与 Windows（走命名管道分支）不受影响。功能完全不可用（无窗口、无任何提示）。
- **严重等级**：P1（核心功能在目标平台完全阻塞，非线上服务故障）
- **首次发现**：2026-09-19 09:35，本机源码 link 装配后的启动冒烟测试
- **关联资料**：无 Issue；本机实测记录见「2 复现步骤」

**发现环境**：macOS 14.6（Darwin 23.5.0 / arm64）· Node v26.3.1 · DSH 0.1.5-rc.2 · dsh-desktop 0.4.0（`dsh plugin --profile dsh-desktop add link:<repo>`）
<!-- CONTENT_END: issue -->

---

## 2. 复现步骤

<!-- CONTENT_START: reproduce -->
> 100% 稳定复现，无需特殊数据条件。

**环境**：macOS + 默认 `TMPDIR=/var/folders/wq/113cy1l11fd12cjm0l1s14zh0000gn/T` + DSH 0.1.5-rc.2

**步骤**：

1. 装配插件并启动：`dsh plugin --profile dsh-desktop add link:<repo>` → `dsh --profile dsh-desktop`
2. 等待 30s，检查子进程：`ps -eo pid,ppid,command | grep -i electron`（预期出现 Electron；实际为空）
3. 检查 IPC socket：`ls $TMPDIR/dsh-desktop-*.sock`（预期存在；实际不存在）

**实际结果**：

- 步骤 2/3 均为空，dsh 主进程存活，stderr/stdout 无输出。
- **最小单元复现**（定位用）：
  ```
  net.createServer().listen(join(os.tmpdir(), 'dsh-desktop-<pid>-<uuid>.sock'))
  → Error: listen EINVAL: invalid argument <path>
  ```
  路径实测 108 字节。**逐字节探针**：102/103/104 字节 → `listening OK`；105 字节 → `EINVAL`（即上限 104 字节，与 macOS `sockaddr_un.sun_path` 一致）。
- **对照实验**：`TMPDIR=/tmp dsh --profile dsh-desktop` → 4s 内出现 Electron 进程并成功开窗；关闭窗口后 dsh 1s 内干净退出（双向清理逻辑正常）。说明唯一变量就是 socket 路径长度。

**复现率**：100%
<!-- CONTENT_END: reproduce -->

---

## 3. 根因分析（RCA）

<!-- CONTENT_START: rca -->
- **直接原因**：`src/index.js:129` 用 `join(os.tmpdir(), 'dsh-desktop-${process.pid}-${randomUUID()}.sock')` 作为 Unix socket 路径。macOS 默认 `TMPDIR` 长 49 字节，拼出的路径 108 字节 > 104 字节上限，`ipcServer.listen(ipcPath, ...)`（`src/index.js:216`）抛 `EINVAL`。
- **底层原因**：两点叠加，导致故障被完全吞掉——
  1. **spawn Electron 的代码写在 `listen()` 的成功回调里**（`src/index.js:216-225`），listen 一失败，spawn 分支根本不会执行，表现为「进程活着但什么都不做」；
  2. `ipcServer.on('error')` 只调用 `ctx.logger?.warn?.(...)`（`src/index.js:212-214`），该日志不落 stdout/stderr，CLI 前台看不到任何提示。
  属于**边界场景遗漏**：路径长度约束只在短 `TMPDIR` 环境（Linux `/tmp`、或显式 `TMPDIR=/tmp`）下被验证过，macOS 默认长 `TMPDIR` 从未覆盖。
- **触发条件**：`byteLength(os.tmpdir()) + byteLength('dsh-desktop-<pid>-<uuid>.sock') > 104`。macOS 默认 `TMPDIR` 下必然触发；Linux 默认不触发。
- **类似风险点**：全仓库排查（`grep -rn "tmpdir()\|\.sock\|pipe" src apps test`）后确认**仅此一处**自行拼接 socket 路径；`apps/electron/main.js` 只消费环境变量 `DSH_ELECTRON_IPC_PATH`，不拼路径。无同类点。
- **影响数据**：无脏数据（不涉及持久化）；仅影响启动成功率。
<!-- CONTENT_END: rca -->

---

## 4. 修复计划（Step List）

<!-- CONTENT_START: steps -->
> ✅ 关键区块：每完成一步勾选一项；中断恢复时从首个未勾选项继续。

- [x] 4.1 在本地稳定复现（参考 `workflows/07-bug-fixing.md`）
- [x] 4.2 定位根因，确认修复方案
- [x] 4.3 实施代码修复：抽出可注入、可测的 `resolveIpcPath(platform, tmpdir)`，路径超限时回退到短目录 `/tmp`（Windows 命名管道分支保持不变）
- [x] 4.4 添加回归测试用例（必须能在修复前失败、修复后通过）
- [x] 4.5 本地编译通过（零 build：`node --check`，参考 `workflows/04-build-process.md`）
- [x] 4.6 本地完整测试通过（`npm test` + `npm run lint` + `npm run format:check`，参考 `workflows/05-testing-process.md`）
- [x] 4.7 同类风险点排查与修复（已初查：全仓仅 `src/index.js:129` 一处，本步复核）
- [x] 4.8 数据修复（如需）—— 本 Bug 不涉及持久化，判定为无需
- [x] 4.9 更新模块文档（`modules/desktop-surface.md` 注意事项 + `modules/index.md` 时效/最后更新）
- [x] 4.10 完成归档动作（参考 AGENTS.md「Step 4」）
  - [x] `STATUS` 改为 `DONE`，更新 `LAST_UPDATED`
  - [x] 「验收清单」预声明勾选「PR 已合入目标分支」「任务文件已归档」
  - [x] 任务文件 `git mv` 到 `_archive/2026-09/`
- [x] 4.11 提交分支（归档动作与代码主体一同 commit + push，参考 `workflows/11-branch-commit.md`）
- [x] 4.12 创建 PR（参考 `workflows/12-pull-request.md`）
- [ ] 4.13 CI 通过 + PR 合入主干（参考 `workflows/13-ci-cd-pipeline.md`；若 PR 被打回，按 AGENTS.md「Step 4」回滚机制恢复 STATUS 与文件位置）
<!-- CONTENT_END: steps -->

---

## 5. 关键决策记录

<!-- CONTENT_START: decisions -->
> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；记录实际决策时**追加新行**，不要覆写占位行。

| # | 决策点 | 选项 | 选择 | 原因 | 时间 |
|:-:|-------|-----|-----|-----|------|
| 1 | - | - | - | - | - |
| 2 | 修复范围 | ① 仅修 socket 路径 ② 修复 + 让启动故障在 CLI 可见 | ② 修复 + 让故障可见 | 本 Bug 难定位的一半原因是 `listen` 失败只走 `ctx.logger.warn` 而 CLI 前台完全静默；只修路径不修可观测性，同类故障仍会以「进程活着但什么都不做」的形式复现 | 2026-09-19 09:45 |
| 3 | 超长回退策略 | ① 非 Windows 一律用 `/tmp` ② 优先 `os.tmpdir()`，超 104 字节才回退 `/tmp` | ② 超限回退 | 保留用户显式设置短 `TMPDIR` 的语义与沙箱环境（`/tmp` 可能不可写）的默认行为，只在会触发 `EINVAL` 时才降级 | 2026-09-19 09:45 |
<!-- CONTENT_END: decisions -->

---

## 6. 进度日志（Append-Only）

<!-- CONTENT_START: log -->
- `2026-09-19 09:40` 创建任务：本机装配冒烟测试发现 macOS 无窗口，已完成最小复现与根因定位（socket 路径 108 > 104）；种子诊断记录见「2 复现步骤」。
- `2026-09-19 09:41` 计划确认：用户选定「修复 + 让故障可见」，并追加决策 2/3（见「关键决策记录」）；STATUS → IN_PROGRESS。
- `2026-09-19 09:43` Step 4.3 完成：`src/index.js` 抽出 `resolveIpcPath(platform, tmpdir)`（超 104 字节回退 `/tmp`）与 `reportStartupFailure(ctx, message)`（host logger + stderr 双写），替换 3 处启动期 warn 与 socket 路径拼接。
- `2026-09-19 09:44` Step 4.4 完成：`test/index.test.js` 新增 4 个用例（长 tmpdir 下真实 `listen` 成功、短 tmpdir 不迁移、Windows 命名管道、失败双通道上报）。修复前后对照实测：旧公式 108B → `EINVAL`，新函数 64B → `listen OK`。
- `2026-09-19 09:45` Step 4.5/4.6 完成：`node --check` 通过；`npm test` 26/26 通过；`npm run lint`、`npm run format:check` 均无告警。
- `2026-09-19 09:46` 验收：**默认 TMPDIR**（不设 `TMPDIR=/tmp`）下 `dsh --profile dsh-desktop` 4s 内拉起 Electron 窗口，关闭窗口后 dsh 1s 内干净退出，stderr 无输出——原复现场景不再出现。Step 4.7 复核：全仓仅此一处自拼 socket 路径。
- `2026-09-19 09:47` Step 4.9/4.10 完成：刷新 `modules/desktop-surface.md`（核心接口 + 注意事项两则，`LAST_ANALYZED` = 今日）与 `modules/index.md`（时效 🟢 / 最后更新 = 今日）；STATUS → DONE，任务文件归档到 `_archive/2026-09/`，与代码主体同一 commit。
<!-- CONTENT_END: log -->

---

## 7. 风险与阻塞

<!-- CONTENT_START: risks -->
> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；遇到阻塞时**追加新行**，不要覆写占位行。
>
> 「状态」列标准词汇：`跟进中`（阻塞中，待解除）/ `已解除`（阻塞已解除，记录留档）。

| 风险 / 阻塞点 | 影响 | 应对方案 | 状态 |
|-------------|-----|--------|------|
| - | - | - | - |
<!-- CONTENT_END: risks -->

---

## 8. 验收清单

<!-- CONTENT_START: acceptance -->
- [x] 在原复现环境下问题不再出现（macOS 默认 `TMPDIR` 下直接 `dsh --profile dsh-desktop` 能开窗）
- [x] 回归测试用例已加入并通过
- [x] 同类风险点已排查与修复
- [x] 脏数据已修复（如有）
- [x] 监控 / 告警已恢复正常
- [x] 模块文档已更新（如涉及模块变更：`modules/<name>.md` + `modules/index.md` 均已同步）
- [x] PR 已合入目标分支
- [x] 任务文件已从 `_active/` 移入 `_archive/{YYYY-MM}/`
<!-- CONTENT_END: acceptance -->

---

<!-- TASK_HINTS:
  - STATUS 流转：PLANNING → IN_PROGRESS → (BLOCKED) → DONE / ABANDONED
  - P0 / P1 必须在「进度日志」中维护"分钟级"更新，便于跨人协作
  - 修复前必须先复现，复现不出来时不要盲目改代码
  - 回归测试用例必须能在"修复前失败、修复后通过"，否则不算闭环
-->
