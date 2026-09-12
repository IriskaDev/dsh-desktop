<!-- MODULE: ci-cd-pipeline -->
<!-- STATUS: DONE -->
<!-- LAST_ANALYZED: 2026-09-12 -->
<!-- ANALYZER_VERSION: 1.0 -->

# CI/CD 流程

> 定义项目的持续集成（CI）和持续部署/交付（CD）流程，包括流水线配置、构建阶段、自动化检查、部署策略等。

---

## 概述

<!-- CONTENT_START: overview -->
已引入两条 GitHub Actions 流程：

- **CI**（`.github/workflows/ci.yml`）：`push` 到 `main` 与 `pull_request` 到 `main` 时触发 lint + 测试 + 格式检查。
- **CD**（`.github/workflows/release.yml`）：推送 `v*` tag 时触发三平台打包，并自动创建 GitHub Release、上传发布压缩包。

- CI/CD 平台：GitHub Actions
- 流水线架构：CI 单 job `check`；Release 分 `package`（三平台 matrix）与 `release`（汇总资产并发布）两个 job
<!-- CONTENT_END: overview -->

---

## 流水线配置

### 触发规则

<!-- CONTENT_START: trigger_rules -->
> CI 触发规则（`.github/workflows/ci.yml`）。

| 触发事件 | 触发分支/条件 | 执行的流水线 | 说明 |
|---------|-------------|------------|------|
| Push | `main` | `check` | 主干提交门禁 |
| Pull Request | → `main` | `check` | PR 门禁 |
| Tag 创建 | `v*` | `Release` | 三平台打包 + 创建 GitHub Release |
| 定时触发 | - | 无 | - |
| 手动触发 | - | 无 | - |
<!-- CONTENT_END: trigger_rules -->

### 流水线阶段

<!-- CONTENT_START: pipeline_stages -->
> 当前 CI（`.github/workflows/ci.yml`）与 Release（`.github/workflows/release.yml`）的流水线阶段。

```mermaid
graph LR
    A[代码检出] --> B[依赖安装]
    B --> C[CI: Lint / Test / Format]
    C --> D[tag: Lint / Test / Package]
    D --> E[上传平台产物]
    E --> F[创建 GitHub Release]
```

| 阶段 | 说明 | 是否必须通过 | 超时时间 |
|------|------|:----------:|---------|
| 代码检出 | `actions/checkout@v4` | ✅ | 默认 |
| 依赖安装 | CI：`npm ci --ignore-scripts`；Release：`npm ci`（需要 Electron 二进制） | ✅ | 默认 |
| Lint | `npm run lint`（ESLint） | ✅ | 默认 |
| 单元测试 | `npm test`（node:test，`test/*.test.js`） | ✅ | 默认 |
| 格式检查 | `npm run format:check`（Prettier，仅 CI） | ✅ | 默认 |
| 制品打包 | `npm run dist`（Ubuntu / Windows / macOS matrix） | ✅ | 默认 |
| 上传平台产物 | `actions/upload-artifact@v4` | ✅ | 默认 |
| 部署 | `softprops/action-gh-release` 创建 GitHub Release | ✅ | 默认 |
<!-- CONTENT_END: pipeline_stages -->

---

## 自动化检查

<!-- CONTENT_START: automated_checks -->
> CI 自动化检查项（`.github/workflows/ci.yml`）。

| 检查项 | 工具 | 阶段 | 失败策略 | 说明 |
|-------|------|------|---------|------|
| 代码格式 | Prettier | format:check | 失败即阻断 | `npm run format:check` |
| 静态分析 | ESLint | lint | 失败即阻断 | `npm run lint` |
| 单元测试 | node:test | test | 失败即阻断 | `npm test`（`test/*.test.js`） |
| 发布打包 | `scripts/package.mjs` | Release package | 失败即阻断 | `npm run dist`，三平台矩阵 |
| Release 资产 | `softprops/action-gh-release` | Release publish | 失败即阻断 | 汇总三平台 `dist/release/*` |
| 覆盖率门禁 | （无） | - | - | 未启用 |
| 安全扫描 | （无） | - | - | 待引入 |
| 依赖漏洞检查 | （无） | - | - | 零运行时依赖 |
| 构建产物校验 | GitHub Actions artifacts | Release package | 失败即阻断 | `if-no-files-found: error` |
<!-- CONTENT_END: automated_checks -->

---

## 环境与部署

### 环境配置

<!-- CONTENT_START: environments -->
> 桌面客户端项目，无服务端部署环境；部署 = 发布安装包（GitHub Release）。

| 环境 | 用途 | 部署方式 | 触发条件 | 访问地址 |
|------|------|---------|---------|---------|
| 开发环境（dev） | 本地开发 | 本地 | - | 本地 |
| 测试环境（staging） | - | - | - | - |
| 预发布环境（pre-prod） | - | - | - | - |
| 生产环境（prod） | 安装包发布 | GitHub Release | 推送 `v*` tag | GitHub Releases |
<!-- CONTENT_END: environments -->

### 部署策略

<!-- CONTENT_START: deploy_strategy -->
> 桌面客户端，无服务端滚动/蓝绿/金丝雀部署概念。

- 部署方式：推送 `v<version>` tag 后由 `.github/workflows/release.yml` 自动打包并发布 GitHub Release
- 发布矩阵：`ubuntu-latest` / `windows-latest` / `macos-latest`
- 回滚策略：重新下载并安装历史版本 Release 资产；必要时撤回当前 Release 并重发修复版本
- 部署审批：无（单人仓库）
- 部署通知：GitHub Actions / GitHub Release
<!-- CONTENT_END: deploy_strategy -->

---

## 制品管理

<!-- CONTENT_START: artifacts -->
- 制品仓库：GitHub Release
- 制品来源：`npm run dist` 生成的 `dist/release/*`
- 制品命名：`dsh-desktop-<version>-<platform>-<arch>.zip|.tar.gz`
- 制品保留策略：随 GitHub Release 长期保留
- 制品安全扫描：待补充
<!-- CONTENT_END: artifacts -->

---

## 密钥与变量管理

<!-- CONTENT_START: secrets -->
> Release workflow 使用 GitHub Actions 内置 `secrets.GITHUB_TOKEN`（`contents: write`）创建 Release；本地使用 `gh` 时使用已登录账号。

| 变量名 | 用途 | 作用域 | 是否加密 | 说明 |
|-------|------|-------|:-------:|------|
| `GITHUB_TOKEN` | Release workflow 创建 Release / 上传资产 | repo | ✅ | Actions 内置 |
| `GH_TOKEN` | 本地 gh CLI 操作（PR / Release 查询） | 本机 | - | 不写入仓库 |

> ⚠️ **安全提醒**：密钥值不应出现在本文档中，仅记录变量名和用途。
<!-- CONTENT_END: secrets -->

---

## 常见问题与排查

<!-- CONTENT_START: troubleshooting -->
> 常见排查：

| 问题现象 | 可能原因 | 解决方案 |
|---------|---------|---------|
| tag 推送后没有 Release workflow | tag 不匹配 `v*` 或未实际推送 | 检查 `git tag --list` 与 `git push origin v<version>` |
| 某个平台打包失败 | 平台依赖 / Electron 下载失败 | 查看对应 matrix job 日志，重跑失败 job |
| Release 缺少资产 | `dist/release/*` 为空 | 检查 `npm run dist` 与 `if-no-files-found: error` 日志 |
| CI 与 Release 重复失败 | lint / test 失败 | 本地先执行 `npm test`、`npm run lint`、`npm run format:check` |
<!-- CONTENT_END: troubleshooting -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
- `.github/workflows/ci.yml` — GitHub Actions CI（lint + test + format 门禁）
- `.github/workflows/release.yml` — tag 触发的三平台打包与 GitHub Release
- `scripts/package.mjs` — Electron runtime 与发布压缩包生成脚本
- `.gitignore` — 忽略 `dist/`、`node_modules/`
<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->
<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查文件: .gitlab-ci.yml（GitLab CI 配置）
  - 检查文件: .github/workflows/*.yml（GitHub Actions 配置）
  - 检查文件: Jenkinsfile, jenkins/（Jenkins 配置）
  - 检查文件: .circleci/config.yml（CircleCI 配置）
  - 检查文件: .travis.yml（Travis CI 配置）
  - 检查文件: azure-pipelines.yml（Azure DevOps 配置）
  - 检查文件: Dockerfile, docker-compose.yml, docker-compose.*.yml
  - 检查文件: .dockerignore
  - 检查文件: k8s/, kubernetes/, deploy/, deployment/（K8s 部署配置）
  - 检查文件: helm/, charts/（Helm Charts）
  - 检查文件: Makefile（构建/部署相关 target）
  - 检查文件: .env, .env.example, .env.production（环境变量模板）
  - 检查文件: scripts/deploy*, scripts/ci*（部署/CI 脚本）
  - 提取信息: 流水线阶段列表, 触发规则, 环境变量, 部署目标
  - 提取信息: 制品类型与存储位置, 部署策略, 回滚机制
  - 关联模块: 04-build-process.md（编译流程）, 05-testing-process.md（测试流程）, 06-release-process.md（发布流程）
-->
