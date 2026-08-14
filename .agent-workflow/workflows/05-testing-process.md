<!-- MODULE: testing-process -->
<!-- STATUS: DONE -->
<!-- LAST_ANALYZED: 2026-08-15 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 测试流程

> 从编写测试用例到运行验证的完整 SOP，包含单元测试、全量测试、覆盖率检查各阶段说明。

---

## 概述

<!-- CONTENT_START: overview -->
测试框架为 **node:test**（Node.js 内置测试运行器，零依赖）。测试文件放 `test/*.test.js`，用 `node --test` 运行。

- 单元测试：node:test（`test/startup.test.js`、`test/index.test.js`）
- 集成测试：无
- E2E 测试：无
<!-- CONTENT_END: overview -->

---

## 测试框架

<!-- CONTENT_START: test_frameworks -->
| 测试类型 | 框架 | 配置文件 |
|---------|------|---------|
| 单元测试 | node:test（Node 内置） | 无（`package.json` scripts.test = `node --test`） |
| 集成测试 | （无） | - |
| E2E 测试 | （无） | - |
<!-- CONTENT_END: test_frameworks -->

---

## 测试目录结构

<!-- CONTENT_START: test_structure -->
```
test/
├── startup.test.js    # 对应 src/startup.js
└── index.test.js      # 对应 src/index.js
```

**测试文件命名规范**：`test/<被测模块>.test.js`，与被测文件同名（`src/<name>.js` → `test/<name>.test.js`）
<!-- CONTENT_END: test_structure -->

---

## 覆盖率要求

<!-- CONTENT_START: coverage -->
> 使用 node:test 内置覆盖率（`--experimental-test-coverage`），当前未设强制阈值。

| 指标 | 最低要求 | 说明 |
|------|---------|------|
| 行覆盖率 | 无强制阈值 | 待项目稳定后可设门禁 |
| 分支覆盖率 | 无强制阈值 | 同上 |
| 函数覆盖率 | 无强制阈值 | 同上 |
<!-- CONTENT_END: coverage -->

---

## 测试 SOP

> 以下为标准测试执行流程，在开发流程的 Step 6~8 和 Bug 修复流程的 Step 6~8 中调用。

### Step 1 · 编写/更新测试用例

**新增功能**：必须编写对应的单元测试用例，覆盖：
- 正常路径（Happy Path）
- 边界条件
- 异常/错误情况

**Bug 修复**：必须添加回归测试用例，确保该 Bug 不会再次引入。

**测试文件存放**：按照"测试目录结构"中定义的规范存放，与被测文件保持对应关系。

---

### Step 2 · 运行相关单元测试（按模块过滤）

> 仅运行与本次改动相关的测试，快速验证，不需要等待全量测试。

<!-- CONTENT_START: unit_test_filter_cmd -->
```bash
# 运行指定测试文件
node --test test/startup.test.js
```
<!-- CONTENT_END: unit_test_filter_cmd -->

**判断**：
- 全部通过（含新增用例）→ 继续 Step 3
- 有失败 → 修复后重新执行 Step 2，不进入下一步

---

### Step 3 · 运行全量单元测试

<!-- CONTENT_START: unit_test_full_cmd -->
```bash
npm test
# 等价于 node --test
```
<!-- CONTENT_END: unit_test_full_cmd -->

**判断**：
- 全部通过 → 继续 Step 4
- 有失败（本次改动引入）→ 必须修复后重新执行
- 有失败（已知存量问题）→ 记录并评估是否阻塞提交

---

### Step 4 · 运行集成测试（如有）

<!-- CONTENT_START: integration_test_cmd -->
> 本项目暂无集成测试。

```bash
# 本项目暂无集成测试
```
<!-- CONTENT_END: integration_test_cmd -->

---

### Step 5 · 检查覆盖率

<!-- CONTENT_START: coverage_cmd -->
```bash
# 生成覆盖率（node:test 内置）
node --test --experimental-test-coverage
```

**覆盖率报告路径**：stdout 输出（无独立报告文件）
<!-- CONTENT_END: coverage_cmd -->

**判断**：
- 覆盖率达到最低要求（见"覆盖率要求"表）→ 通过
- 低于要求 → 补充测试用例后重新执行 Step 2~5

---

### Step 6 · 运行 E2E 测试（发布前）

> E2E 测试通常在发布前或 CI 中运行，不要求每次开发改动都执行。

<!-- CONTENT_START: e2e_test_cmd -->
> 本项目暂无 E2E 测试。

```bash
# 本项目暂无 E2E 测试
```
<!-- CONTENT_END: e2e_test_cmd -->

---

## 测试命令速查

<!-- CONTENT_START: test_commands -->
| 场景 | 命令 |
|------|------|
| 按模块运行单元测试 | `node --test test/<name>.test.js` |
| 运行全量单元测试 | `npm test`（= `node --test`） |
| 运行集成测试 | 本项目暂无集成测试 |
| 生成覆盖率报告 | `node --test --experimental-test-coverage` |
| 运行 E2E 测试 | 本项目暂无 E2E 测试 |
<!-- CONTENT_END: test_commands -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
- `package.json` — `scripts.test`（`node --test`）
- `test/startup.test.js`、`test/index.test.js` — 单元测试
<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->
<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查目录: test/, tests/, __tests__/, spec/, __test__/, test_*, *_test/
  - 检查文件: jest.config.js, jest.config.ts, jest.config.json
  - 检查文件: vitest.config.ts, vitest.config.js
  - 检查文件: pytest.ini, conftest.py, pyproject.toml(tool.pytest)
  - 检查文件: .mocharc.yml, .mocharc.js
  - 检查文件: karma.conf.js
  - 检查文件: cypress.config.js, cypress.config.ts, cypress/
  - 检查文件: playwright.config.ts, playwright.config.js
  - 检查文件: package.json(scripts.test, scripts.test:unit, scripts.test:e2e, scripts.coverage)
  - 检查文件: Makefile(test 目标)
  - 检查文件: *_test.go, *_test.rs
  - 检查文件: .coveragerc, .nycrc, .nycrc.json, .c8rc
  - 提取信息: 测试框架名称, 全量测试命令, 按模块过滤测试命令（--testPathPattern/--run/etc）
  - 提取信息: 覆盖率阈值配置（branches/lines/functions）, 覆盖率报告路径
  - 提取信息: 测试文件命名规范, 测试目录结构
-->
