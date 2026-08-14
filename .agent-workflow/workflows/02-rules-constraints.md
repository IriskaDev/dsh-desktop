<!-- MODULE: rules-constraints -->
<!-- STATUS: DONE -->
<!-- LAST_ANALYZED: 2026-08-15 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 规则限制

> 编码规范、命名约定、技术限制和代码风格配置说明。

---

## 概述

<!-- CONTENT_START: overview -->
已引入 ESLint（flat config `eslint.config.js`）+ Prettier（`.prettierrc.json`）作为代码检查/格式化工具链，规范已固化到配置文件。

- 现状：ESLint 9 flat config + Prettier，通过 `npm run lint` / `npm run format` 执行
- 无 EditorConfig / tsconfig（非 TS 项目）
<!-- CONTENT_END: overview -->

---

## 编码规范

<!-- CONTENT_START: coding_standards -->
> 由 ESLint + Prettier 强制，配置如下：

- **缩进**：2 空格（`tabWidth: 2`）
- **引号**：单引号（`singleQuote: true`）
- **分号**：语句末尾加分号（`semi: true`）
- **尾随逗号**：无（`trailingComma: "none"`）
- **行宽**：80（`printWidth: 80`）
- **注释**：英文注释，说明「为什么」而非「是什么」

**Linter**：ESLint（`eslint.config.js`，flat config，`@eslint/js` recommended + `eslint-config-prettier`）
**Formatter**：Prettier（`.prettierrc.json`）
**命令**：`npm run lint` / `npm run lint:fix` / `npm run format` / `npm run format:check`
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
| 配置文件 | 工具 | 说明 |
|---------|------|------|
| `eslint.config.js` | ESLint | flat config，`@eslint/js` recommended + `eslint-config-prettier` |
| `.prettierrc.json` | Prettier | 2 空格 / 单引号 / 分号 / 无尾随逗号 |
| `.prettierignore` | Prettier | 忽略 `node_modules/`、`.npm-cache/`、`.agent-workflow/`、`*.md` 等 |
<!-- CONTENT_END: config_files -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
- `eslint.config.js` — ESLint flat config
- `.prettierrc.json` / `.prettierignore` — Prettier 配置
- `.gitignore` — 忽略 `node_modules/`、`.npm-cache/`、`dist/`、`lib/`、`.env`、`*.log`
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
