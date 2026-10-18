# 开发说明

[返回 README](../README.md)

## 目录职责

| 位置 | 职责 |
| --- | --- |
| `src/electron.cjs`、`src/preload.cjs` | Electron 窗口、受限 IPC 与界面桥接 |
| `src/server.cjs` | HTTP API、扫描、任务与导出编排 |
| `src/*` | ASR、元信息、评分、播放、波形与持久化模块 |
| `ui/` | 浏览器端脚本、样式、HTML 与本地 SVG 图标 |
| `metadata-bridge/` | 独立 Go 适配程序，stdin/stdout JSON 通信 |
| `tests/` | Node 测试及 jsdom 交互测试 |
| `scripts/` | 运行库安装、图标构建与模型启动 |
| `scripts/verify/` | 真实音频、服务和接口的手动验证 |

前端使用普通 JavaScript，后端使用 Node.js。

运行数据位于 `data/`，外部运行库位于 `tools/`。Electron 入口由 `package.json` 指向，工作线程与 preload 使用模块相对路径。

## 测试与构建

开发环境：Node.js 24。

```powershell
npm ci
npm test
npm run build:icons
npm run build:metadata
```

`npm test` 自动发现 `tests/*.cjs`，涵盖匹配规则、ASR 状态、任务、导出、mpv IPC、工作线程及 DOM 交互。测试不调用在线平台或启动真实模型。

Go 构建输出 `metadata-bridge/metadata-bridge.exe`，已被 Git 忽略。更新供应商库时检查 `go.mod`、`go.sum` 和 `vendor/`，核对许可与本地适配。

## 手动验证

以下命令从根目录执行。脚本可能读取或临时修改本地库，运行前查看恢复逻辑，不要与客户端写任务并行。

| 示例命令 | 前提与用途 |
| --- | --- |
| `npm run verify:mpv` | mpv、抽样报告与源音频；静音验证真实播放 |
| `node scripts/verify/verify-scan-progress.cjs` | FFmpeg；测试音频与扫描进度 |
| `node scripts/verify/verify-asr-progress.cjs` | FFmpeg；本地 mock 验证片段与队列进度 |
| `node scripts/verify/verify-quality.cjs` | FFmpeg；音频参数、重复组和补全任务 |
| `node scripts/verify/verify-asr-gpu.cjs` | 音乐库、GPU 服务与显存查询工具；真实并发识别 |
| `node scripts/verify/verify-metadata.cjs` | 抽样数据及联网；向平台发送歌曲查询 |
| `node scripts/verify/sample-validation.cjs` | 本机 `D:\Music` 与模型服务；十首抽样，正式扫描不受此限制 |

验证数据位于 `validation/music-sample-10/`，测试产物位于 `test-fixtures/`，均不随仓库提供。依赖抽样数据的脚本需先准备样本。

## 调试

`npm run dev` 提供浏览器备用模式；原生 mpv、服务管理与窗口控制需要 Electron。开发版调试菜单支持重载、开发者工具与重启。

安装包构建、版本标签及 Release 自动化见 [版本与发布](releasing.md)。
