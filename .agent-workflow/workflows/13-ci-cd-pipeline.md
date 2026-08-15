<!-- MODULE: ci-cd-pipeline -->
<!-- STATUS: DONE -->
<!-- LAST_ANALYZED: 2026-08-15 -->
<!-- ANALYZER_VERSION: 1.0 -->

# CI/CD 流程

> 定义项目的持续集成（CI）和持续部署/交付（CD）流程，包括流水线配置、构建阶段、自动化检查、部署策略等。

---

## 概述

<!-- CONTENT_START: overview -->
已引入 GitHub Actions（`.github/workflows/ci.yml`）作为唯一 CI 门禁：`push` 到 `main` 与 `pull_request` 到 `main` 时触发 lint + 测试 + 格式检查。CD（打包分发 GitHub Release）尚未建立。

- CI/CD 平台：GitHub Actions
- 流水线架构与触发策略：单 job `check`（checkout → setup-node → npm ci → lint → test → format）
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
| Tag 创建 | - | 无 | 待建立（发布打包） |
| 定时触发 | - | 无 | - |
| 手动触发 | - | 无 | - |
<!-- CONTENT_END: trigger_rules -->

### 流水线阶段

<!-- CONTENT_START: pipeline_stages -->
> 当前 CI（`.github/workflows/ci.yml`）的流水线阶段。CD 阶段（制品打包/部署）待建立。

```mermaid
graph LR
    A[代码检出] --> B[依赖安装]
    B --> C[Lint]
    C --> D[单元测试]
    D --> E[格式检查]
```

| 阶段 | 说明 | 是否必须通过 | 超时时间 |
|------|------|:----------:|---------|
| 代码检出 | `actions/checkout@v4` | ✅ | 默认 |
| 依赖安装 | `npm ci --ignore-scripts`（跳过 electron 二进制下载） | ✅ | 默认 |
| Lint | `npm run lint`（ESLint） | ✅ | 默认 |
| 单元测试 | `npm test`（node:test，`test/*.test.js`） | ✅ | 默认 |
| 格式检查 | `npm run format:check`（Prettier） | ✅ | 默认 |
| 制品打包 | Electron 打包（待） | - | - |
| 部署 | GitHub Release（待） | - | - |
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
| 覆盖率门禁 | （无） | - | - | 未启用 |
| 安全扫描 | （无） | - | - | 待引入 |
| 依赖漏洞检查 | （无） | - | - | 零运行时依赖 |
| 构建产物校验 | （无） | - | - | 零 build |
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
| 生产环境（prod） | 安装包发布 | GitHub Release | 待建立 | - |
<!-- CONTENT_END: environments -->

### 部署策略

<!-- CONTENT_START: deploy_strategy -->
> 桌面客户端，无服务端滚动/蓝绿/金丝雀部署概念。

- 部署方式：发布安装包（GitHub Release）
- 回滚策略：重新安装旧版本安装包
- 部署审批：待补充
- 部署通知：待补充
<!-- CONTENT_END: deploy_strategy -->

---

## 制品管理

<!-- CONTENT_START: artifacts -->
> 无制品管理配置。

- 制品仓库：GitHub Release（待建立）
- 制品命名与版本规则：待补充（安装包 `dsh-desktop-<version>-<platform>.<ext>`）
- 制品保留策略：待补充
- 制品安全扫描：待补充
<!-- CONTENT_END: artifacts -->

---

## 密钥与变量管理

<!-- CONTENT_START: secrets -->
> 无 CI/CD，暂无密钥配置。未来 GitHub Actions 可能需要的密钥（仅记录变量名）：

| 变量名 | 用途 | 作用域 | 是否加密 | 说明 |
|-------|------|-------|:-------:|------|
| `GH_TOKEN` | gh CLI 鉴权 / 发布 | repo | ✅ | 待配置 |

> ⚠️ **安全提醒**：密钥值不应出现在本文档中，仅记录变量名和用途。
<!-- CONTENT_END: secrets -->

---

## 常见问题与排查

<!-- CONTENT_START: troubleshooting -->
> 无 CI/CD，暂无已知问题。

| 问题现象 | 可能原因 | 解决方案 |
|---------|---------|---------|
| - | - | - |
<!-- CONTENT_END: troubleshooting -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
- `.github/workflows/ci.yml` — GitHub Actions CI（lint + test + format 门禁）
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
