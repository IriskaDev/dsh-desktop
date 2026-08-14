<!-- TASK_ID: 20260526-add-oauth-login -->
<!-- TASK_TYPE: feature -->
<!-- STATUS: IN_PROGRESS -->
<!-- CREATED: 2026-05-26 -->
<!-- LAST_UPDATED: 2026-05-26 16:45 -->
<!-- OWNER: example-user -->
<!-- BRANCH: feature/add-oauth-login -->
<!-- RELATED_WORKFLOWS: 03,04,05,08,11,12,13 -->
<!-- GENERATED_FROM: templates/task-feature-template.md -->
<!-- DRIFT_CHECK: enabled -->
<!-- 约束源：analyzer-instructions.md#约束常量表 表 A · RELATED_WORKFLOWS_FEATURE；本示例的元数据键集合必须是 task-feature-template.md 的子集（D5.E5 自检规则会校验）。 -->

# 接入 GitHub OAuth 第三方登录（示例）

> 📌 **本文件为静态示例**，展示一份"进行到一半"的功能任务的最终形态——其 `STATUS=IN_PROGRESS` 与「验收清单」中的归档路径仅为演示用途，**不会真正流转状态、不会被实际归档**。文件名以 `_` 开头，会被分析器忽略。
>
> 📐 **对应模板**：[`task-feature-template.md`](../templates/task-feature-template.md)（共 7 节，验收清单为最后一节）。本示例演示前 6 节进度记录，第 7 节「验收清单」展示进行中态（多项未勾选属于正常）。
>
> 🔄 **漂移检查**：14 自检流程的 D5.E5 规则会比对本示例与来源模板的元数据键集合一致性。**修改 `task-feature-template.md` 的元数据头时，本文件必须同步更新**（这是 1.3.3 回归性遗漏的根因，1.4.0 用 `GENERATED_FROM` + 自检规则机械防控）。
>
> ⚠️ 本示例的 Step List 编排（13 步）与当前 feature 模板（12 步）存在历史性差异——示例不强制随模板更新同步刷新，**实际任务请以最新模板为准**。
>
> 创建真实任务请从 [`templates/task-feature-template.md`](../templates/task-feature-template.md) 复制起步。

---

## 1. 需求理解

<!-- CONTENT_START: requirement -->
- **背景 / 起源**：用户反馈注册流程繁琐，希望支持一键 GitHub 登录。来源：#12345
- **目标用户 / 调用方**：Web 端用户、移动端 H5 用户
- **核心交付物**：
  1. `/api/v1/auth/oauth/github/start` — 发起授权
  2. `/api/v1/auth/oauth/github/callback` — 处理回调并签发 JWT
  3. 已有用户与 GitHub 账号的绑定 / 解绑接口
- **不做范围**：不支持 Google / Apple 登录；本期不实现"账号合并"逻辑
- **验收标准**：
  - 新用户首次 GitHub 登录可自动建账并登入
  - 已有用户绑定 GitHub 后可双通道登录
  - 单元测试覆盖率 ≥ 85%
- **关联资料**：[#12345](https://github.com/IriskaDev/dsh-desktop/issues/12345)、[设计稿](https://design.example.com/oauth)
<!-- CONTENT_END: requirement -->

---

## 2. 影响范围分析

<!-- CONTENT_START: impact -->
- **涉及模块**：
  - `user-auth` — 新增 OAuth 子模块，扩展 `TokenPair` 签发逻辑
  - `user` — `users` 表新增 `github_uid`、`github_avatar` 字段
- **涉及文件**：
  - `src/auth/oauth/github.ts`（新增）
  - `src/auth/controller.ts`（新增 2 个路由）
  - `src/user/model.ts`（增字段）
  - `migrations/20260526_add_github_fields.sql`（新增）
- **涉及接口**：新增 2 个 API；现有 `/login` 不变
- **依赖的上下游**：第三方 `passport-github2`、Redis（state 暂存）
- **数据库变更**：`users` 表 ALTER TABLE，需要联动 DBA
- **兼容性**：完全向后兼容，不影响现有账号密码登录
<!-- CONTENT_END: impact -->

---

## 3. 实施计划（Step List）

<!-- CONTENT_START: steps -->
- [x] 3.1 阅读 `modules/user-auth.md` 与现有登录代码
- [x] 3.2 设计 OAuth 流程与 `state` 防 CSRF 方案
- [x] 3.3 数据库迁移脚本编写并 review
- [ ] 3.4 实现 `/auth/oauth/github/start` 接口  ← **当前进度**
- [ ] 3.5 实现 `/auth/oauth/github/callback` 接口
- [ ] 3.6 实现绑定 / 解绑接口
- [ ] 3.7 单元测试覆盖
- [ ] 3.8 本地编译通过
- [ ] 3.9 本地测试通过
- [ ] 3.10 自检 + 代码 Review
- [ ] 3.11 提交分支
- [ ] 3.12 创建 PR
- [ ] 3.13 CI 通过、合入主干、归档任务文件
<!-- CONTENT_END: steps -->

---

## 4. 关键决策记录

<!-- CONTENT_START: decisions -->
| # | 决策点 | 选项 | 选择 | 原因 | 时间 |
|:-:|-------|-----|-----|-----|------|
| 1 | state 存储介质 | A. JWT 自签 / B. Redis | **B** | Redis 可主动失效，JWT 不可撤销 | 2026-05-26 14:20 |
| 2 | 首次登录建账策略 | A. 自动建 / B. 引导补全 | **A** | 减少流程跳出率 | 2026-05-26 14:35 |
<!-- CONTENT_END: decisions -->

---

## 5. 进度日志（Append-Only）

<!-- CONTENT_START: log -->
- `2026-05-26 13:50` 创建任务，完成需求理解，与产品对齐验收标准
- `2026-05-26 14:30` 完成 3.1，确认现有 `verifyAccessToken` 可直接复用
- `2026-05-26 14:45` 完成 3.2，确定 state 走 Redis（决策 #1）
- `2026-05-26 15:30` 完成 3.3，DBA review 通过迁移脚本
- `2026-05-26 16:45` 开始 3.4，遇到 `redirect_uri` 与本地开发域名不一致问题，已挂起，待 OPS 配置白名单
<!-- CONTENT_END: log -->

---

## 6. 风险与阻塞

<!-- CONTENT_START: risks -->
| 风险 / 阻塞点 | 影响 | 应对方案 | 状态 |
|-------------|-----|--------|------|
| GitHub OAuth App 白名单未配置本地域名 | 阻塞 3.4 本地联调 | 已邮件 OPS，预计 5/27 上午配置 | 跟进中 |
| `passport-github2` 库 1 年未更新 | 潜在安全风险 | 评估自研轻量替代或锁定版本 + 加 CI 安全扫描 | 评估中 |
<!-- CONTENT_END: risks -->

---

## 7. 验收清单

<!-- CONTENT_START: acceptance -->
- [ ] 所有 Step 已勾选完成
- [ ] 单元测试 / 集成测试通过（覆盖率 ≥ 85%）
- [ ] 编译无 warning，linter 通过
- [ ] 自测覆盖核心路径与边界场景（首次登录 / 已绑定登录 / state 过期 / 取消授权）
- [ ] 文档已更新（`modules/user-auth.md`、API 文档、CHANGELOG）
- [ ] PR 已合入目标分支
- [ ] 任务文件已从 `_active/` 移入 `_archive/2026-05/`
<!-- CONTENT_END: acceptance -->

---

<!-- TASK_HINTS:
  本文件为示例，演示任务执行到 Step 3.4 时的最终形态。实际任务请从
  `.agent-workflow/templates/task-feature-template.md` 复制起步。
-->
