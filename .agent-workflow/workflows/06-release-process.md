<!-- MODULE: release-process -->
<!-- STATUS: PARTIAL -->
<!-- LAST_ANALYZED: 2026-08-15 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 发布流程

> 从版本确认到上线验证的完整发布 SOP，包含版本号更新、编译、测试、打包、部署各阶段说明。

---

## 概述

<!-- CONTENT_START: overview -->
项目处于早期验证阶段，尚无正式发布流程。版本号存于 `package.json`（当前 `0.0.1`）。后续 Electron 桌面客户端成型后需建立发布流程（跨平台打包 + GitHub Release）。

- 发布流程：未建立
- 版本管理：SemVer（`package.json` version）
<!-- CONTENT_END: overview -->

---

## 版本管理

<!-- CONTENT_START: versioning -->
| 项目 | 说明 |
|------|------|
| 版本号规范 | SemVer：MAJOR.MINOR.PATCH（当前 `0.0.1`） |
| 版本号存储位置 | `package.json` 的 `version` 字段 |
| 版本更新命令 | 待补充（如 `npm version patch/minor/major`，或手动编辑） |
<!-- CONTENT_END: versioning -->

---

## 环境配置

<!-- CONTENT_START: environments -->
> 未检测到多环境配置（无 `.env.production` / `.env.staging`）。

| 环境 | 说明 | 配置文件 | 部署地址 |
|------|------|---------|---------|
| 开发环境 | 本地开发 | 无 | 本地 |
| 测试环境 | - | - | - |
| 预发环境 | - | - | - |
| 生产环境 | - | - | - |
<!-- CONTENT_END: environments -->

---

## 变更日志

<!-- CONTENT_START: changelog -->
| 项目 | 说明 |
|------|------|
| CHANGELOG 文件位置 | 无（待建立） |
| 变更日志格式 | 待补充（如 Keep a Changelog） |
| 自动生成工具 | 无（待补充，如 standard-version / release-it） |
<!-- CONTENT_END: changelog -->

---

## 发布 SOP

> 以下为标准发布流程，按步骤顺序执行。区分**常规发布**和**紧急 Hotfix 发布**两种场景。

### Step 1 · 确认发布范围与版本号

- 确认本次发布包含的功能列表（来自 Issue / CHANGELOG）
- 根据变更类型确定版本号递增规则：
  - 不兼容的 API 变更 → MAJOR 版本
  - 向下兼容的新功能 → MINOR 版本
  - 向下兼容的 Bug 修复 → PATCH 版本
- 确认目标发布分支

---

### Step 2 · 确认/切换发布分支

<!-- CONTENT_START: release_branch -->
> 未建立发布分支策略（当前仅 `main` 分支）。参考 [分支提交规范](../workflows/11-branch-commit.md)。

```bash
# 常规发布：基于开发分支创建 release 分支（待补充）
git checkout <开发分支>
git pull
git checkout -b release/<版本号>

# Hotfix 发布：直接基于生产分支（当前为 main）
git checkout main
git pull
git checkout -b hotfix/<简述>
```
<!-- CONTENT_END: release_branch -->

---

### Step 3 · 更新版本号

<!-- CONTENT_START: version_bump_cmd -->
```bash
# 待补充：更新版本号
# 建议：npm version patch/minor/major（更新 package.json version）
```
<!-- CONTENT_END: version_bump_cmd -->

---

### Step 4 · 更新 CHANGELOG

- 整理本次版本的变更内容（新增/修复/重构/Breaking Changes）
- 按 CHANGELOG 格式写入对应版本条目

<!-- CONTENT_START: changelog_cmd -->
```bash
# 待补充：自动生成或手动更新 CHANGELOG
# 本项目暂无 CHANGELOG 文件
```
<!-- CONTENT_END: changelog_cmd -->

---

### Step 5 · 全平台编译

执行全平台编译，确保所有目标平台产物正常（详见 [编译流程](../workflows/04-build-process.md)）：

<!-- CONTENT_START: release_build_cmd -->
```bash
# 待补充：全量编译（所有目标平台）—— 零 build 项目，Electron 打包后补充
```
<!-- CONTENT_END: release_build_cmd -->

**判断**：
- 所有平台编译通过 → 继续 Step 6
- 有平台编译失败 → 修复后重新执行，确认全部通过再继续

---

### Step 6 · 运行全量测试

<!-- CONTENT_START: release_test_cmd -->
```bash
# 待补充：运行全量单元测试 + 集成测试（本项目暂无测试）
```
<!-- CONTENT_END: release_test_cmd -->

**判断**：
- 全部通过 → 继续 Step 7
- 有失败（发布阻塞级）→ 修复后重新走 Step 4~6
- 有失败（已知存量问题）→ 记录到 CHANGELOG，评估是否可发布

---

### Step 7 · 打包发布产物

<!-- CONTENT_START: package_cmd -->
```bash
# 待补充：打包发布产物（Electron 用 electron-builder 等）
```

**产物输出路径**：待补充
<!-- CONTENT_END: package_cmd -->

---

### Step 8 · 提交版本变更并打 Tag

<!-- CONTENT_START: tag_cmd -->
> 未建立 CHANGELOG；生产分支当前为 `main`。

```bash
git add <版本号文件>          # 如 package.json；CHANGELOG.md 待建立后加入
git commit -m "chore(release): v<版本号>"
git tag v<版本号>
git push origin main --tags
```
<!-- CONTENT_END: tag_cmd -->

---

### Step 9 · 提交发布 PR

参考 [PR 提交流程](../workflows/12-pull-request.md) 创建 PR：
- **release → 生产分支**（合并发布内容）
- **release → 开发分支**（同步版本号和 CHANGELOG 变更）

PR 描述需包含：版本号、变更摘要、测试结论。

---

### Step 10 · 部署到目标环境

<!-- CONTENT_START: deploy_cmd -->
> 本项目为桌面客户端，部署 = 发布安装包（GitHub Release 等），无服务端部署。

**部署顺序**：不适用（无测试/预发/生产环境）

```bash
# 待补充：发布安装包到 GitHub Release
```

**回滚命令**：
```bash
# 待补充：安装包回滚（重新安装旧版本）
```
<!-- CONTENT_END: deploy_cmd -->

---

### Step 11 · 发布后验证

- 在目标环境验证核心功能是否正常
- 检查监控/告警平台是否有异常指标
- 确认本次版本的关键需求已按预期上线

**判断**：
- 验证通过 → 发布完成，在 Issue 中关闭相关单据
- 发现问题 → 评估严重程度，决定是否回滚或提紧急 Hotfix

---

## Hotfix 发布流程

> 适用于生产环境紧急故障，需跳过常规发布节奏快速上线。

<!-- CONTENT_START: hotfix_release -->
> 未建立 Hotfix 发布流程（项目早期，仅 `main` 分支）。

**与常规发布的差异**：
- 基于生产分支（`main`）直接修复
- 可简化 CHANGELOG、缩小测试范围
- 修复合并后须同步回开发分支（如有）

```bash
git checkout main
git pull
git checkout -b hotfix/<简述>
```
<!-- CONTENT_END: hotfix_release -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
- `package.json` — 版本号（`0.0.1`）
- 无 CHANGELOG / 发布配置 / 部署配置
<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->
<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查文件: CHANGELOG.md, CHANGELOG, HISTORY.md, RELEASES.md
  - 检查文件: VERSION, version.txt, version.py, version.go
  - 检查文件: package.json(version 字段, scripts.release, scripts.deploy)
  - 检查文件: .release-it.json, .release-it.js, release.config.js
  - 检查文件: lerna.json, .changeset/
  - 检查文件: .gitlab-ci.yml(deploy 阶段), .github/workflows/*release*, .github/workflows/*deploy*
  - 检查文件: Jenkinsfile(deploy 阶段)
  - 检查文件: Dockerfile, docker-compose.prod.yml
  - 检查文件: kubernetes/, k8s/, helm/, charts/
  - 检查文件: terraform/, pulumi/, ansible/, serverless.yml
  - 检查文件: .env.production, .env.staging, .env.test
  - 检查文件: Makefile(release/deploy/tag 目标)
  - 检查文件: Procfile, app.yaml, vercel.json, netlify.toml, fly.toml
  - 提取信息: 版本号规范, 版本号存储位置, 版本更新命令
  - 提取信息: 发布命令, 打包命令, 部署命令（按环境区分）, 回滚命令
  - 提取信息: 环境列表（开发/测试/预发/生产）及配置文件路径
  - 提取信息: CHANGELOG 格式和自动生成工具
  - 提取信息: Tag 命名规范（如 v1.2.3）
-->
