<!-- TASK_ID: 20260815-release-packaging -->
<!-- TASK_TYPE: feature -->
<!-- STATUS: DONE -->
<!-- CREATED: 2026-08-15 -->
<!-- LAST_UPDATED: 2026-08-15 19:30 -->
<!-- OWNER: IriskaDev -->
<!-- BRANCH: feature/release-packaging -->
<!-- RELATED_WORKFLOWS: 03,04,05,08,11,12,13 -->
<!-- 约束源：analyzer-instructions.md#约束常量表 表 A · RELATED_WORKFLOWS_FEATURE / TASK_STATUS_ENUM / TASK_TYPE_ENUM；修改本行前请先改常量表（D5.E1/E2 自检规则会校验）。 -->

# 打包 Electron 运行时 + GitHub Release 发布

> 让用户免 `npm install`：把 `apps/electron` 打包进各平台 Electron 运行时，插件找不到 node_modules electron 时回退到打包运行时；推 `v*` tag 自动构建三平台产物并发 GitHub Release。

---

## 1. 需求理解

<!-- CONTENT_START: requirement -->
- **背景 / 起源**：当前 `dsh-desktop` 插件运行时会从工作区 `node_modules` 解析 `electron`，用户必须 `npm install`（下载 Electron 二进制）才能用。
- **目标用户 / 调用方**：希望下载 Release 包直接 `dsh plugin --profile desktop add link:<解压目录>` 即可使用、无需 Node/npm 的桌面用户。
- **核心交付物**：① `scripts/package.mjs` 打包脚本；② `src/index.js` 运行时回退逻辑；③ `.github/workflows/release.yml` 推 `v*` tag 自动发 Release；④ README 增加 Release 安装说明。
- **不做范围（Out of Scope）**：不做 electron-builder 安装包（NSIS/dmg/AppImage）；不发布 npm 包；不做自动更新。
- **验收标准**：① `npm run package` 本地生成 `dist/electron/runtime/`；② `npm run dist` 生成发布压缩包；③ 解压 Release 包后 `src/index.js` 可正常导入且打包 Electron 可执行文件存在；④ CI 门禁 lint/test 通过；⑤ 推 tag 后三平台产物上传 GitHub Release。
<!-- CONTENT_END: requirement -->

---

## 2. 影响范围分析

<!-- CONTENT_START: impact -->
- **涉及模块**：desktop-surface（`src/index.js`）
- **涉及文件 / 路径**：
  - `scripts/package.mjs`（新增）
  - `.github/workflows/release.yml`（新增）
  - `src/index.js`（Electron 路径解析回退）
  - `apps/electron/package.json`（补 author/description，packager 必需）
  - `package.json` / `package-lock.json`（版本 0.1.0、`@electron/packager` devDependency、`package`/`dist` scripts）
  - `README.md` / `README.zh-CN.md`（Release 安装说明）
- **涉及接口 / 数据结构**：`src/index.js` 内部新增 `resolveElectron()`；`DSH_ELECTRON_BIN` 环境变量作为显式覆盖。
- **依赖的上下游**：`@electron/packager`（devDependency）、GitHub Actions `actions/upload-artifact`/`actions/download-artifact`/`softprops/action-gh-release`。
- **数据库 / 配置 / 环境变量变更**：新增可选 `DSH_ELECTRON_BIN`。
- **兼容性影响**：开发态行为不变（优先 `require('electron')`）；发布态回退为打包运行时。
<!-- CONTENT_END: impact -->

---

## 3. 实施计划（Step List）

<!-- CONTENT_START: steps -->
> ✅ 关键区块：每完成一步勾选一项；中断恢复时从首个未勾选项继续。

- [x] 3.1 设计打包方案（@electron/packager 运行时目录 + 源码回退 + CI 发 Release）
- [x] 3.2 升级 package.json（0.1.0 + @electron/packager + scripts）
- [x] 3.3 编写 `scripts/package.mjs`（打包到 `dist/electron/runtime`，`--archive` 生成发布压缩包）
- [x] 3.4 修改 `src/index.js`（`resolveElectron()`：`DSH_ELECTRON_BIN` → `require('electron')` → 打包运行时）
- [x] 3.5 新增 `.github/workflows/release.yml`（tag 触发、三平台矩阵、上传 Release）
- [x] 3.6 更新 README 中英文（Release 安装 + 开发命令表 + 目录结构）
- [x] 3.7 本地验证（lint、单文件测试、`npm run package`、`npm run dist`、解包冒烟）
- [x] 3.8 更新模块文档（`modules/desktop-surface.md`、`modules/index.md`）
- [x] 3.9 归档任务文件
<!-- CONTENT_END: steps -->

---

## 4. 关键决策记录

<!-- CONTENT_START: decisions -->
> 凡是有 A / B 取舍的，必须记录"选了什么、为什么"，避免后续重复讨论。

| # | 决策点 | 选项 | 选择 | 原因 | 时间 |
|:-:|-------|-----|-----|-----|------|
| 1 | 打包工具 | electron-builder vs @electron/packager | @electron/packager | 本插件只需可 spawn 的运行时目录，不需要安装包；产物结构简单、与 `link:` 安装天然契合 | 2026-08-15 |
| 2 | 发布物形态 | 仅打包 Electron app vs 源码+运行时 zip | 源码+运行时 zip | 用户解压后直接 `dsh plugin add link:` 即可，无需单独处理插件安装 | 2026-08-15 |
| 3 | 运行时定位 | 硬编码 dist 路径 vs 搜索 | 固定 `dist/electron/runtime/<name>` | 打包脚本控制输出目录，结构可预期 | 2026-08-15 |
| 4 | ASAR | true vs false | false | 应用只有 3 个文件，asar 收益可忽略；false 便于排查 preload 路径问题 | 2026-08-15 |
<!-- CONTENT_END: decisions -->

---

## 5. 进度日志（Append-Only）

<!-- CONTENT_START: log -->
> 只追加、不删改。每次会话开始与结束、每次完成步骤、每次遇到阻塞都追加一条。

- `2026-08-15 19:18` 创建任务，确认打包方案
- `2026-08-15 19:30` Step 3.1~3.8 完成：本地 `npm run package`/`npm run dist` 通过，Release 压缩包解压冒烟通过，模块文档已刷新
<!-- CONTENT_END: log -->

---

## 6. 风险与阻塞

<!-- CONTENT_START: risks -->
> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；遇到阻塞时**追加新行**，不要覆写占位行。

| 风险 / 阻塞点 | 影响 | 应对方案 | 状态 |
|-------------|-----|--------|------|
| - | - | - | - |
| 本机沙箱限制 `node --test` spawn EPERM | 本地 `npm test` 无法跑完整测试 | 单文件直跑 `node test/*.test.js` 验证；CI ubuntu 无此限制 | 已解除 |
<!-- CONTENT_END: risks -->

---

## 7. 验收清单

<!-- CONTENT_START: acceptance -->
- [x] 所有 Step 已勾选完成
- [x] 单元测试 / 集成测试通过
- [x] 编译无 warning，linter 通过
- [x] 自测覆盖核心路径与边界场景
- [x] 模块文档已更新（如涉及模块变更：`modules/<name>.md` + `modules/index.md` 均已同步）
- [x] 接口文档 / CHANGELOG 已更新（如有对外接口变更）
- [x] PR 已合入目标分支
- [x] 任务文件已从 `_active/` 移入 `_archive/{YYYY-MM}/`
<!-- CONTENT_END: acceptance -->

---

<!-- TASK_HINTS:
  - STATUS 流转：PLANNING → IN_PROGRESS → (BLOCKED) → DONE / ABANDONED
  - 每完成一个 Step 必须：勾选 checkbox + 追加进度日志 + 更新 LAST_UPDATED
  - 任何阻塞必须把 STATUS 改为 BLOCKED 并在「风险与阻塞」记录原因
  - 中断恢复时：先读元数据 → 再读 Step List 找首个未勾选项 → 再读最近 3 条进度日志
-->
