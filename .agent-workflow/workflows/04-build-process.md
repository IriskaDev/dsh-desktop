<!-- MODULE: build-process -->
<!-- STATUS: PARTIAL -->
<!-- LAST_ANALYZED: 2026-08-15 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 编译流程

> 编译/构建命令、配置说明、产物输出和依赖管理。

---

## 概述

<!-- CONTENT_START: overview -->
本项目**零 build**：纯 ESM JS，无编译/打包步骤，源码即产物。`package.json` 无 `scripts` 字段，未检测到任何打包器配置（webpack/vite/rollup/esbuild）。未来 Electron 外壳落地后将引入 `electron-builder` 等打包步骤，届时再补实本流程。

- 构建系统：无
- 构建流程：无（直接 `node` 运行 / DSH 运行时加载）
<!-- CONTENT_END: overview -->

---

## 构建工具

<!-- CONTENT_START: build_tools -->
> 未检测到任何构建工具。

| 构建工具 | 版本 | 配置文件 |
|---------|------|---------|
| （无） | - | - |
<!-- CONTENT_END: build_tools -->

---

## 编译模式说明

> 根据改动类型选择合适的编译模式，避免不必要的全量重编。

| 编译模式 | 触发时机 | 说明 |
|---------|---------|------|
| **增量编译** | 仅修改了已有文件内容 | 构建系统自动识别变更文件，只重编受影响的部分，速度最快 |
| **全量编译** | 新增/删除文件、修改构建配置、切换分支、依赖变更 | 清除所有缓存后重新编译，确保产物一致性 |
| **重置编译** | 构建产物异常、缓存污染、跨平台切换后 | 先执行 clean 清除所有中间产物和缓存，再执行全量编译 |

> ⚠️ **注意**：以下情况**必须**使用全量编译或重置编译，增量编译可能产生错误结果：
> - 新增或删除源文件（文件依赖关系图发生变化）
> - 修改了头文件 / 公共接口 / 导出符号
> - 修改了构建脚本、CMakeLists.txt、Makefile 等构建配置
> - 切换 Git 分支后（不同分支的中间产物可能不兼容）
> - 修改了编译宏、编译选项、链接参数

---

## 本机快速编译

> 仅编译当前开发平台的目标，用于**快速验证代码改动**，不要求跨平台产物。适合在提交前做本地冒烟验证。

### 增量编译（仅文件内容修改）

<!-- CONTENT_START: local_build_incremental -->
> 零 build 项目，无增量编译。可选的语法校验（未固化到 scripts）：

```bash
node --check src/index.js
node --check src/startup.js
```

**适用场景**：修改 `.js` 源码后做语法冒烟校验。
<!-- CONTENT_END: local_build_incremental -->

### 全量编译（有文件增删或配置变更）

<!-- CONTENT_START: local_build_full -->
> 零 build 项目，无全量编译，无构建产物需要重编。

```bash
# 无全量编译命令（纯 ESM 源码即产物）
```

**说明**：新增/删除源文件后，仅需确认 `package.json` 的 `exports` / `main` 指向正确，无需编译。
<!-- CONTENT_END: local_build_full -->

### 重置编译（清除缓存后重建）

<!-- CONTENT_START: local_build_clean -->
> 零 build 项目，无 clean 步骤；`.gitignore` 已忽略 `dist/`、`lib/`、`node_modules/`。

```bash
# 无 clean 命令（无构建缓存/中间产物）
```
<!-- CONTENT_END: local_build_clean -->

---

## 全平台编译

> 在本机快速编译通过后，进行全量跨平台编译，输出所有受支持目标平台的产物。

### 宿主平台支持矩阵

<!-- CONTENT_START: platform_matrix -->
> 零 build 项目，暂无跨平台产物矩阵。Electron 打包落地后补充（Windows/macOS/Linux）。

| 宿主平台 | 可编译的目标平台 | 备注 |
|---------|---------------|------|
| macOS | - | 待 Electron 打包后补充 |
| Windows | - | 待 Electron 打包后补充 |
| Linux | - | 待 Electron 打包后补充 |

> 💡 未来 Electron 目标：Windows / macOS / Linux 三平台安装包。
<!-- CONTENT_END: platform_matrix -->

### macOS 宿主 - 全平台编译

<!-- CONTENT_START: full_build_macos -->
> 零 build 项目，暂无。Electron 打包后补充。

```bash
# 待补充：macOS 宿主下编译所有支持的目标平台
```
<!-- CONTENT_END: full_build_macos -->

### Windows 宿主 - 全平台编译

<!-- CONTENT_START: full_build_windows -->
> 零 build 项目，暂无。Electron 打包后补充。

```bash
# 待补充：Windows 宿主下编译所有支持的目标平台
```
<!-- CONTENT_END: full_build_windows -->

---

## 构建命令汇总

<!-- CONTENT_START: build_commands -->
> 零 build 项目，无构建命令。Electron 打包落地后补充以下各节。

**本机增量编译**：无（零 build）
**本机全量编译**：无
**重置编译**：无
**全平台构建**：待 Electron 打包后补充
**其他构建目标**：无
<!-- CONTENT_END: build_commands -->

---

## 构建配置

<!-- CONTENT_START: build_config -->
> 无构建配置文件。`package.json` 无 `scripts`、无打包器配置。

- 编译选项：无
- 优化级别：无
- 目标平台：无（纯 JS，运行时无关）
- 交叉编译工具链：无
- 环境变量影响：无
<!-- CONTENT_END: build_config -->

---

## 构建产物

<!-- CONTENT_START: build_output -->
> 无构建产物（源码即产物）。

| 目标平台 | 产物类型 | 输出路径 | 说明 |
|---------|---------|---------|------|
| - | - | - | 无构建产物 |
<!-- CONTENT_END: build_output -->

---

## 依赖管理

<!-- CONTENT_START: dependency_management -->
- **包管理器**：pnpm `11.21.0`（但本项目零依赖，无 lockfile）
- **依赖锁文件**：无（`package.json` 无依赖声明）
- **私有源配置**：无
- **依赖更新策略**：不适用（零依赖）
- **运行时依赖解析**：`@deepseek-ai/*` 由 DSH 经 `healProfilesModuleFallback` 在 `$DSH_HOME/profiles/node_modules` 符号链接解析
<!-- CONTENT_END: dependency_management -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
- `package.json` — 无 scripts（确认零 build）
- `.gitignore` — 忽略 `dist/`、`lib/`、`node_modules/`
- `src/*.js` — 纯 ESM 源码（无需编译）
<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->
<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查文件: Makefile, CMakeLists.txt, meson.build, BUILD, BUILD.bazel, WORKSPACE
  - 检查文件: build.gradle, build.gradle.kts, pom.xml, settings.gradle
  - 检查文件: package.json(scripts.build/clean/rebuild), webpack.config.*, vite.config.*, rollup.config.*, esbuild.config.*
  - 检查文件: Cargo.toml, build.rs, .cargo/config.toml（含 [target.*] 交叉编译目标配置）
  - 检查文件: setup.py, setup.cfg, pyproject.toml(build-system)
  - 检查文件: Rakefile, Gruntfile.js, gulpfile.js
  - 检查文件: .npmrc, .yarnrc, .yarnrc.yml, .pnpmrc
  - 检查文件: go.mod, go.sum（注意 GOOS/GOARCH 环境变量用于交叉编译）
  - 检查文件: Pipfile, Pipfile.lock, poetry.lock
  - 检查文件: toolchain.cmake, cross-*.cmake（CMake 交叉编译工具链文件）
  - 检查文件: .xcode-version, Podfile（iOS/macOS 平台）
  - 检查文件: build-all.sh, build-cross.sh, build-platforms.sh 等批量编译脚本
  - 检查目录: dist/, build/, out/, target/, bin/, release/
  - 检查目录: .cargo/, toolchains/, cross/, cmake/toolchains/（交叉编译工具链目录）
  - 提取信息: 增量编译命令（直接 build，依赖构建系统缓存机制）
  - 提取信息: 全量编译命令（强制重编，如 make -B / cargo build --release / gradle build）
  - 提取信息: clean 命令（如 make clean / cargo clean / gradle clean / rm -rf build/）
  - 提取信息: 重置编译命令（clean + build 组合，或 rebuild 脚本）
  - 提取信息: 本机快速编译命令, 全平台编译命令, 宿主平台限制（mac/windows/linux）
  - 提取信息: 各宿主平台支持的目标平台列表（target triple），构建工具名称及版本
  - 提取信息: 产物输出路径（按平台区分）, 编译选项, 包管理器类型
  - 注意: 识别构建系统是否支持增量编译（Makefile 依赖时间戳、Ninja、Bazel、Gradle 增量等）
-->
