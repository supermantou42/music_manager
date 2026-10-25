# 声笺 · Music Manager

Windows 本地音乐库整理工具：扫描音乐与标签，使用本地 ASR 辅助核验歌词，搜索替代元信息，试听对比后整理导出。

当前处于原型验证阶段，版本见 [Releases](https://github.com/supermantou42/music_manager/releases)。基于 Electron，桌面试听使用 mpv，语音识别使用本地 Qwen3-ASR，元信息核验接入网易云音乐与 QQ 音乐，独立搜歌下载支持 12 个音乐源。

## 主要功能

- **在线搜歌与下载**：多源搜索、单首或批量下载、进度、取消与重试，下载后直接试听。

- **音乐库概览**：全目录扫描、封面和音频参数、筛选排序、跨列表全选及位置恢复。
- **歌词核验**：声学粗切分、本地转写、时间戳与左右差异对比、双语评分和异常重试。
- **元信息审阅**：分级检索、候选歌词同步试听、字段快捷选择、封面选择和手动覆盖。
- **重复版本比较**：左右 A/B 试听、共用进度、叠加波形与窗口 MSE，保留一个或多个版本。
- **整理输出**：统一命名、重复处理、单曲排除，向输出副本写入标签与歌词。

## 快速开始

需要 Windows、Node.js 24+/npm，以及可在终端运行的 `ffmpeg`、`ffprobe`。编译元信息桥接程序需要 Go 1.25+；安装 mpv 的脚本需要 curl 和 7-Zip。

在项目根目录执行：

```powershell
npm ci
npm run build:metadata
npm run install:mpv
npm start
```

启动后设置输入、输出目录并全量扫描。搜索元信息需要联网；扫描、标签审阅与本地试听不要求模型服务运行。

歌词识别需按 [ASR 配置](docs/asr.md) 准备模型和 GPU 运行库，再从客户端设置启动模型服务。已准备好环境时，可使用根目录的一键入口：

```powershell
powershell -ExecutionPolicy Bypass -File .\start-prototype.ps1
```

此入口会检查并尝试启动 ASR 服务，再打开客户端；只开客户端使用 `npm start`。

## 使用流程

1. **扫描**：读取音乐、标签、外置歌词及音频参数。
2. **核验**：勾选后自动处理，复用正常转写，达标歌词跳过自动搜索。
3. **审阅**：检查差异，试听候选或重复版本，调整最终字段。
4. **导出**：确认最终来源及排除项，写入独立输出目录，保留源音乐。

ASR 时间来自粗切片，不是精确逐句对齐；推荐分也不代表已确认版本正确。导出优先级与限制见 [使用说明](docs/usage.md)。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm start` | Electron 客户端 |
| `npm run dev` | 浏览器备用模式，默认 `http://127.0.0.1:4173` |
| `npm test` | 本地单元与 DOM 交互测试 |
| `npm run build:metadata` | 编译 Go 元信息桥接程序 |
| `npm run build:icons` | 生成本地图标 |
| `npm run verify:mpv` | 使用已有样本进行 mpv 静音集成验证 |

部分验证脚本需要真实音乐、模型或联网，详见 [开发说明](docs/development.md)。

## 项目目录

```text
src/                Electron、HTTP 服务与业务模块
ui/                 界面脚本、样式和本地图标
metadata-bridge/    Go 元信息适配程序与固定依赖
tests/              单元与 DOM 交互测试
scripts/            安装、构建与 ASR 启动脚本
  verify/           手动验证与抽样脚本
docs/               使用、配置与开发说明
data/               音乐库、设置和缓存（不入库）
tools/              mpv、llama.cpp 运行库（不入库）
validation/         本机验证报告（不入库）
test-fixtures/      本机测试产物（不入库）
```

## 文档导航

- [使用说明与匹配规则](docs/usage.md)
- [在线搜歌与下载](docs/online-music.md)
- [ASR 模型、GPU 服务与并发](docs/asr.md)
- [开发、测试与目录约定](docs/development.md)
- [版本与发布](docs/releasing.md)
- [元信息接口来源与实现](docs/metadata-integration.md)
- [协作与提交准则](AGENTS.md)

## 许可与依赖

根项目许可证见 [LICENSE](LICENSE)。`metadata-bridge` 及其依赖包含 AGPL-3.0 组件，见 [桥接程序许可证](metadata-bridge/LICENSE) 与依赖目录中的许可证。第三方声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。外部运行库不随仓库提交，分发时需保留对应许可声明。

更新内容见 [0.2.1 发布说明](docs/releases/v0.2.1.md)。

## 开源引用与致谢

元信息、歌词和歌曲直链能力复用了 [guohuiyuan/music-lib v1.1.1](https://github.com/guohuiyuan/music-lib/tree/v1.1.1) 的供应商实现（AGPL-3.0），通过独立 Go 桥接程序调用；流程参考了 [guohuiyuan/go-music-dl](https://github.com/guohuiyuan/go-music-dl)。供应商实现并非本项目原创，固定版本源码和原许可证保留在 `metadata-bridge/vendor/` 并随包提供。

另外使用 Electron、mpv、FFmpeg/ffprobe 和 Lucide 等开源组件。完整版本、用途、引用范围和许可证见 [第三方声明](THIRD_PARTY_NOTICES.md) 与 [运行库声明](build/runtime-notices.md)。
