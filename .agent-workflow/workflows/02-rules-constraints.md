<!-- MODULE: rules-constraints -->
<!-- STATUS: PARTIAL -->
<!-- LAST_ANALYZED: 2026-08-15 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 规则限制

> 编码规范、命名约定、技术限制和代码风格配置说明。

---

## 概述

<!-- CONTENT_START: overview -->
未检测到任何 linter / formatter 配置文件（无 ESLint / Prettier / EditorConfig / tsconfig）。当前为极简 ESM JS 插件，编码规范主要靠约定，尚未固化到配置文件。

- 现状：无代码检查 / 格式化工具链
- 建议：引入 ESLint + Prettier 前，先按下方「编码规范」的源码观察约定执行
<!-- CONTENT_END: overview -->

---

## 编码规范

<!-- CONTENT_START: coding_standards -->
> 未检测到 linter/formatter 配置文件，以下为从源码（`src/startup.js`、`src/index.js`）观察到的既有风格：

- **缩进**：2 空格
- **引号**：单引号
- **分号**：语句末尾加分号
- **尾随逗号**：无
- **注释**：英文注释，说明「为什么」而非「是什么」

**Linter 配置**：未检测到（待引入）
**Formatter 配置**：未检测到（待引入）
<!-- CONTENT_END: coding_standards -->

---

## 命名约定

<!-- CONTENT_START: naming_conventions -->
> 此部分基于源码观察，未固化到配置文件，可手动补充。

- **文件/目录**：小写短横线（kebab-case），如 `src/startup.js`、`cordis.patch.yml`
- **ESM 导出**（cordis 插件约定）：`name`（插件名）、`inject`（依赖数组）、`apply(ctx, config)`（入口函数）
- **变量/函数**：小驼峰（camelCase），如 `sessionId`、`start`、`emit`
- **常量**：全大写蛇形（SCREAMING_SNAKE_CASE），如 `CONFIGURED_AGENT_IDENTITIES_KEY`
- **API 端点命名**：不适用（无 HTTP API）
<!-- CONTENT_END: naming_conventions -->

---

## 技术限制

<!-- CONTENT_START: technical_constraints -->
- **语言版本**：Node.js `v26.2.0`（ESM）；无 TypeScript
- **运行时**：依赖 DSH rc.6（`@deepseek-ai/dsh`）作为宿主运行时
- **禁止引入构建步骤**：当前约定「零 build」，纯 ESM JS 直接运行（未来 Electron 层除外）
- **禁止运行时第三方依赖**：仅用 Node 内置模块（`node:crypto`）；`@deepseek-ai/*` 经 DSH 运行时符号链接解析，不写入本包依赖声明
- **无浏览器兼容性要求**（非 Web 项目）
<!-- CONTENT_END: technical_constraints -->

---

## 代码风格配置文件

<!-- CONTENT_START: config_files -->
> 未检测到任何代码风格配置文件。

| 配置文件 | 工具 | 说明 |
|---------|------|------|
| （无） | - | 项目暂无 lint/format 配置 |
<!-- CONTENT_END: config_files -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
- （无 linter/formatter 配置文件）
- `.gitignore` — 忽略 `node_modules/`、`dist/`、`lib/`、`.env`、`*.log`
- `.editorconfig` — 未检测到
<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->
<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查文件: .eslintrc, .eslintrc.js, .eslintrc.json, .eslintrc.yml, eslint.config.js, eslint.config.mjs
  - 检查文件: .prettierrc, .prettierrc.js, .prettierrc.json, prettier.config.js
  - 检查文件: .editorconfig
  - 检查文件: .clang-format, .clang-tidy
  - 检查文件: pylintrc, .pylintrc, pyproject.toml(tool.pylint), setup.cfg(pylint)
  - 检查文件: .flake8, tox.ini(flake8)
  - 检查文件: .rubocop.yml
  - 检查文件: .golangci.yml, .golangci.yaml
  - 检查文件: rustfmt.toml, .rustfmt.toml, clippy.toml
  - 检查文件: checkstyle.xml, .checkstyle
  - 检查文件: .stylelintrc, stylelint.config.js
  - 检查文件: tsconfig.json(strict 相关配置)
  - 检查文件: .browserslistrc, browserslist
  - 提取信息: 规则列表, 严格程度配置, 自定义规则, 忽略规则(.eslintignore 等)
-->
