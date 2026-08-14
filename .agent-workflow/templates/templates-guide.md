# 模板骨架说明

> 本目录存放可被复制使用的 Markdown 骨架文件。当需要新增工作流或业务模块文档时，从这里复制起步。

---

## 文件清单

| 文件 | 用途 | 复制目标位置 |
|------|------|-------------|
| [`workflow-template.md`](./workflow-template.md) | 工作流文档骨架（流程 SOP / 配置 / 相关文件 / 探测规则） | `.agent-workflow/workflows/<NN>-<name>.md` |
| [`module-template.md`](./module-template.md) | 业务模块文档骨架（功能 / 数据流 / 接口 / 依赖 / 数据结构） | `.agent-workflow/modules/<module-name>.md` |
| [`task-feature-template.md`](./task-feature-template.md) | **任务模板**：功能 / 需求开发（含 Step List + 进度日志，支持中断恢复） | `.agent-workflow/tasks/_active/<YYYYMMDD-slug>.md` |
| [`task-bugfix-template.md`](./task-bugfix-template.md) | **任务模板**：Bug 修复（含复现 / 根因 / 回归测试） | `.agent-workflow/tasks/_active/<YYYYMMDD-slug>.md` |
| [`task-refactor-template.md`](./task-refactor-template.md) | **任务模板**：重构 / 性能优化（含安全网测试 / 前后指标对比） | `.agent-workflow/tasks/_active/<YYYYMMDD-slug>.md` |

---

## 关键字段含义

每个骨架文件头部包含 **4 个必填 HTML 注释字段**（META 元流程额外多 1 个）：

```markdown
<!-- MODULE: {module-id} -->        模块唯一 ID（小写连字符），与 analyzer 映射表对应
<!-- STATUS: TODO -->                状态：TODO / PARTIAL / DONE
<!-- LAST_ANALYZED: -->              最后一次自动分析的日期（YYYY-MM-DD）
<!-- ANALYZER_VERSION: 1.0 -->       本骨架兼容的分析器版本，需与 AGENTS.md 一致
```

**META 元流程例外**（如 `14-workflow-self-check.md`）需在上述 4 字段之外额外声明一行：

```markdown
<!-- WORKFLOW_TYPE: META -->         标识本流程不参与项目侦察、不计入阶段一完善度评分
```

> ⚠️ 不要删除这些注释，自动分析器依赖它们识别状态与版本兼容性。META 流程的 `ANALYZER_VERSION` 跟随顶层 `WORKFLOW_VERSION` 同步升级，详见 [`AGENTS.md`](../../AGENTS.md) 的「🔖 版本兼容性」章节。

---

## 内容占位区块

骨架内的 `<!-- CONTENT_START: xxx -->` 与 `<!-- CONTENT_END: xxx -->` 之间的内容是**自动分析覆盖区**：

- AI Agent 执行 `分析项目工作流` 时，**只覆盖**这些区块内的占位文字
- 区块外的章节标题、说明文字、表头结构**不会被改动**
- 用户手动填写的内容（不再是 `⚠️ **待实现**` 占位文字）也会被保留

---

## 探测规则区块

骨架底部的 `<!-- DETECTION_HINTS: ... -->` 注释定义了该工作流应检查的文件、目录与提取信息。

**新增工作流时务必填写**：分析器会读取此区块决定扫描什么。格式参考 [04-build-process.md](../workflows/04-build-process.md) 底部。

---

## 新增工作流的步骤

1. 复制 `workflow-template.md` 到 `workflows/` 目录
2. 按编号规则命名（如 `15-your-workflow.md`，注意 14 已被自检流程占用；编号递增不复用）
3. 替换 `{module-id}` 与 `{流程标题}`
4. 填写 `DETECTION_HINTS` 探测规则
5. 在 [`AGENTS.md`](../../AGENTS.md) 状态总览表中追加一行
6. （可选）在 [`analyzer-instructions.md`](../analyzer-instructions.md) 的「模块映射表」与「各模块检测规则」章节中追加对应条目

---

## 新增业务模块的步骤

1. 复制 `module-template.md` 到 `modules/` 目录
2. 按业务模块名称命名（如 `user-auth.md`，使用小写连字符）
3. 替换 `{module-id}` 与 `{模块标题}`
4. 触发 `分析 <模块名> 模块` 让 Agent 自动填充内容；或手动填写

> 💡 也可以让 Agent 通过 `分析所有业务模块` 自动批量生成，无需手动复制。

---

## 新增研发任务的步骤（Task Templates）

**任务模板**与 workflow / module 模板的关键区别：**任务是一次性的、有生命周期的执行实例**，每个研发任务（一次需求 / 一次 Bug / 一次重构）都对应一份独立的任务文件，作为 Agent 的"作战地图 + 进度档案"，支持中断后无损恢复。

**手动新增任务步骤**：

1. 根据任务类型选择模板：
   - 功能 / 需求开发 → `task-feature-template.md`
   - Bug 修复 → `task-bugfix-template.md`
   - 重构 / 性能优化 → `task-refactor-template.md`
2. 复制到 `.agent-workflow/tasks/_active/` 目录
3. 按 `YYYYMMDD-<kebab-slug>.md` 格式命名（如 `20260526-add-oauth-login.md`）
4. 填写元数据头：`TASK_ID` / `OWNER` / `BRANCH` / `RELATED_WORKFLOWS` 等
5. 完成「需求理解」「影响范围」「实施计划」三个必填区块

> ✍️ **任务登记与归档不需要修改 [`AGENTS.md`](../../AGENTS.md)**：「📋 进行中的任务」章节已改为动态视图（输入 `查看进行中的任务` 实时扫描 `_active/`），避免多人并发修改 AGENTS.md 产生 Git 冲突。只需新建 / 移动任务文件即可。

**推荐方式**：直接在 Agent 对话中输入 `创建任务: <描述>`，由 Agent 自动识别类型 → 复制模板 → 填充任务文件 → 等用户确认计划后再执行。完整 SOP 见 [`AGENTS.md`](../../AGENTS.md) 的「📋 任务执行 SOP」章节。

> 📖 想看任务文件的最终形态？参考 [`tasks/_example.md`](../tasks/_example.md)。

---

## 新增 / 修改工作流时的常量同步清单（防 D5 漂移）

> ⚠️ **背景**：根据 CHANGELOG 三轮自检数据，D5 一致性缺陷占比 56%（9 / 16），且呈"修了模板忘了示例"等回归性遗漏。1.4.0 起，模板维护者必须按以下顺序处理变更，由 14 自检 D5.E1~E6 机械规则兜底校验。

每次新增 workflow / 修改 task 模板 / 调整 SOP 后，请按下列**有序**清单核对：

- [ ] 1. **是否需要更新 [`analyzer-instructions.md#约束常量表`](../analyzer-instructions.md#约束常量表ssot--single-source-of-truth)？**
  - 新增工作流编号 → 表 C「关键流 8 跳」可能要扩展衔接处描述
  - 新增 task 类型 → 表 A「TASK_META」追加 `RELATED_WORKFLOWS_<TYPE>` 行 + 表 E 追加章节结构行
  - 新增枚举状态 → 表 A `TASK_STATUS_ENUM` / `RISK_STATUS_ENUM` 同步
  - 新增触发词 → 表 D「COMMANDS」必填登记
- [ ] 2. **是否需要同步 [`tasks/_example.md`](../tasks/_example.md)？**
  - 元数据键变化 → 必同步（`<!-- GENERATED_FROM -->` 声明的来源模板若改了元数据头，本文件等效改之）
  - 章节结构变化 → 必同步（或重写示例）
  - Step List 编号体系变化 → 视情况，已在 `_example.md` 顶部声明"历史性差异不强制刷新"
- [ ] 3. **是否需要同步 [`tasks/tasks-guide.md`](../tasks/tasks-guide.md) / [`guide.md`](../guide.md)？**
  - 不同步常量值（这两份不再硬编码枚举集合，仅做语义说明）
  - 仅同步链接 / 章节锚点 / 触发词文字（不另起定义）
- [ ] 4. **是否需要同步 [`AGENTS.md`](../../AGENTS.md)？**
  - 状态总览表行数变化 → 同步
  - 任务执行 SOP Step 文字调整 → 同步（注意：`tasks-guide.md` 不复述细节）
  - 快速开始触发词列表 → 与表 D 对齐
- [ ] 5. **运行 `自检工作流` 验证 D5 维度无回归**
  - 重点关注 D5.E1~E6 输出
  - 健康度应 ≥ 90 分（🟢 健康）
- [ ] 6. **CHANGELOG 增条目**
  - 标注 `[D5/常量更新]` 标签
  - 写明改动的常量表编号（A/B/C/D/E）与受影响的引用点

> 💡 该清单是 1.4.0 治理飞轮的关键一环：**所有跨文件改动从这里发起，由自检规则兜底**，把"散落硬编码"型 D5 缺陷的复发率从历史的 56% 压到趋近于 0。
