<!-- MODULE: release-process -->
<!-- STATUS: DONE -->
<!-- LAST_ANALYZED: 2026-09-12 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 发布流程

> 从版本确认到上线验证的完整发布 SOP，包含版本号更新、编译、测试、打包、部署各阶段说明。

---

## 概述

<!-- CONTENT_START: overview -->
项目已建立正式发布流程：版本号写入 `package.json` 与 `package-lock.json`，发布提交经 PR 合入 `main` 后推送 `v<semver>` tag；tag 触发 `.github/workflows/release.yml`，在 Linux / Windows / macOS 三平台矩阵执行 lint、测试与 Electron 打包，汇总 `dist/release/*` 后由 `softprops/action-gh-release` 创建 GitHub Release，并自动生成 release notes。

- 发布流程：SemVer 版本提交 + tag 触发 GitHub Actions 发布
- 版本管理：SemVer（`package.json` version）
- 发布产物：`dsh-desktop-<version>-<platform>-<arch>.zip`（Windows）或 `.tar.gz`（Linux / macOS）
<!-- CONTENT_END: overview -->

---

## 版本管理

<!-- CONTENT_START: versioning -->
| 项目 | 说明 |
|------|------|
| 版本号规范 | SemVer：MAJOR.MINOR.PATCH |
| 版本号存储位置 | `package.json` 与 `package-lock.json` 顶层的 `version` 字段 |
| 版本更新命令 | `npm version patch/minor/major --no-git-tag-version`，或同步手工编辑上述两个文件 |
| 版本提交规范 | `chore(release): bump version to <version>`，经 PR 合入 `main` 后再打 tag |
| Tag 规范 | `v<version>`，例如 `v0.3.1`；tag 推送即触发 GitHub Release |
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
| 生产环境 | GitHub Release 资产 | `.github/workflows/release.yml` | GitHub Releases |
<!-- CONTENT_END: environments -->

---

## 变更日志

<!-- CONTENT_START: changelog -->
| 项目 | 说明 |
|------|------|
| CHANGELOG 文件位置 | 无独立 `CHANGELOG.md` |
| 变更日志格式 | GitHub Release notes（由 GitHub 根据提交 / PR 自动生成） |
| 自动生成工具 | `softprops/action-gh-release` 的 `generate_release_notes: true` |
<!-- CONTENT_END: changelog -->

---

## 发布 SOP

> 以下为标准发布流程，按步骤顺序执行。区分**常规发布**和**紧急 Hotfix 发布**两种场景。

### Step 1 · 确认发布范围与版本号

- 确认本次发布包含的功能列表（来自任务书 / 已合入 PR）
- 根据变更类型确定版本号递增规则：
  - 不兼容的 API 变更 → MAJOR 版本
  - 向下兼容的新功能 → MINOR 版本
  - 向下兼容的 Bug 修复 → PATCH 版本
- 确认目标发布分支

---

### Step 2 · 确认/切换发布分支

<!-- CONTENT_START: release_branch -->
> `main` 禁止直接推送；版本号变更通过短期 `chore/release-<version>` 分支提交 PR 合入。参考 [分支提交规范](../workflows/11-branch-commit.md)。

```bash
# 常规发布：基于最新 main 创建 release 分支
git checkout main
git pull origin main
git checkout -b chore/release-<version>

# Hotfix 发布：直接基于生产分支（当前为 main）
git checkout main
git pull origin main
git checkout -b hotfix/<简述>
```
<!-- CONTENT_END: release_branch -->

---

### Step 3 · 更新版本号

<!-- CONTENT_START: version_bump_cmd -->
```bash
## Bug 修复 / 兼容性修复 → patch
npm version patch --no-git-tag-version

## 向后兼容的新功能 → minor
npm version minor --no-git-tag-version

## 不兼容变更 → major
npm version major --no-git-tag-version
```

`npm version` 会同步更新 `package.json` 与 `package-lock.json` 的版本号；不要在版本提交中打 tag，tag 在 PR 合入 `main` 后创建。
<!-- CONTENT_END: version_bump_cmd -->

---

### Step 4 · 更新 CHANGELOG

- 整理本次版本的变更内容（新增/修复/重构/Breaking Changes）
- 按 CHANGELOG 格式写入对应版本条目

<!-- CONTENT_START: changelog_cmd -->
```bash
# 无独立 CHANGELOG；发布说明由 release workflow 自动生成
```

如需人工补充发布说明，可在 tag 推送后编辑生成的 GitHub Release；默认不改用 CHANGELOG 文件。
<!-- CONTENT_END: changelog_cmd -->

---

### Step 5 · 全平台编译

执行全平台编译，确保所有目标平台产物正常（详见 [编译流程](../workflows/04-build-process.md)）：

<!-- CONTENT_START: release_build_cmd -->
```bash
# 本地仅验证当前平台产物（可选）
npm run dist

# 全平台产物由 release workflow 的三平台 matrix 生成
```
<!-- CONTENT_END: release_build_cmd -->

**判断**：
- 所有平台编译通过 → 继续 Step 6
- 有平台编译失败 → 修复后重新执行，确认全部通过再继续

---

### Step 6 · 运行全量测试

<!-- CONTENT_START: release_test_cmd -->
```bash
npm test
npm run lint
npm run format:check
```

release workflow 的每个平台任务会再次执行 `npm run lint` 与 `npm test`；CI 门禁见 [CI/CD 流程](../workflows/13-ci-cd-pipeline.md)。
<!-- CONTENT_END: release_test_cmd -->

**判断**：
- 全部通过 → 继续 Step 7
- 有失败（发布阻塞级）→ 修复后重新走 Step 4~6
- 有失败（已知存量问题）→ 记录到任务书 / PR，评估是否可发布

---

### Step 7 · 打包发布产物

<!-- CONTENT_START: package_cmd -->
```bash
# 生成 Electron runtime（仅当前平台）
npm run package

# 生成 runtime + 可分发压缩包
npm run dist
```

**产物输出路径**：`dist/release/dsh-desktop-<version>-<platform>-<arch>.zip|.tar.gz`
<!-- CONTENT_END: package_cmd -->

---

### Step 8 · 提交版本变更并打 Tag

<!-- CONTENT_START: tag_cmd -->
> PR 合入 `main` 后创建 tag；tag 推送触发 `release.yml`，不要手工执行打包后直接上传 Release。

```bash
git add package.json package-lock.json
git commit -m "chore(release): bump version to <version>"
git push -u origin chore/release-<version>
gh pr create --base main --head chore/release-<version> --title "chore(release): bump version to <version>"
gh pr merge --squash --delete-branch

git checkout main
git pull origin main
git tag v<version>
git push origin v<version>
```
<!-- CONTENT_END: tag_cmd -->

---

### Step 9 · 等待 tag 触发的 Release workflow

tag 推送后检查 GitHub Actions：

- `Release / Package (ubuntu-latest|windows-latest|macos-latest)` 全部通过
- 三个平台的 `dist/release/*` 均上传成功
- `Release / Create GitHub Release` 成功创建 Release

release workflow 的触发与产物细节见 [CI/CD 流程](../workflows/13-ci-cd-pipeline.md)。

---

### Step 10 · 部署到目标环境

<!-- CONTENT_START: deploy_cmd -->
> 本项目为桌面客户端，部署 = 发布安装包（GitHub Release 等），无服务端部署。

**部署顺序**：tag 推送 → 三平台矩阵打包 → 上传 Release 资产

```bash
# release workflow 自动执行：
# npm ci → npm run lint → npm test → npm run dist
# → softprops/action-gh-release
```

**回滚命令**：
```bash
# 桌面客户端回滚 = 重新下载旧版本 Release 资产并覆盖安装；
# 如需回到旧版本，安装对应 tag 的历史 Release 即可。
```
<!-- CONTENT_END: deploy_cmd -->

---

### Step 11 · 发布后验证

- 在目标环境验证核心功能是否正常
- 检查 GitHub Actions 的 `Release` workflow 是否全绿
- 检查 GitHub Release 是否包含三个平台资产
- 抽查至少一个平台压缩包，确认版本号与核心功能正常

**判断**：
- 验证通过 → 发布完成，在相关 Issue / 任务中关闭单据
- 发现问题 → 评估严重程度，决定撤回 Release、重打 tag 或提紧急 Hotfix

---

## Hotfix 发布流程

> 适用于生产环境紧急故障，需跳过常规发布节奏快速上线。

<!-- CONTENT_START: hotfix_release -->
> Hotfix 发布沿用常规流程，仅将修复分支改为 `hotfix/<简述>`；修复 PR 合入 `main` 后按 patch 版本号发 tag。

**与常规发布的差异**：
- 基于生产分支（`main`）直接修复
- 可缩小测试范围，但仍必须通过 release workflow 的 lint + test
- 修复合并后立即创建对应 patch 版本 tag，并按需补充 Release notes

```bash
git checkout main
git pull origin main
git checkout -b hotfix/<简述>
```
<!-- CONTENT_END: hotfix_release -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
- `package.json` / `package-lock.json` — 版本号
- `.github/workflows/release.yml` — tag 触发的三平台打包与 GitHub Release
- `scripts/package.mjs` — Electron runtime 与发布压缩包生成脚本
- 无独立 CHANGELOG（使用 GitHub Release notes）
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
