# 版本与发布

## 版本号

以 `package.json` 的 `version` 为唯一来源。版本提交由 npm 同步更新锁文件，“关于”页面和安装包读取相同版本。

| 变化 | 命令 |
| --- | --- |
| 修复问题 | `npm version patch -m "chore: release v%s"` |
| 增加功能 | `npm version minor -m "chore: release v%s"` |
| 不兼容变更 | `npm version major -m "chore: release v%s"` |
| 指定测试版本 | `npm version 0.2.0-beta.1 -m "chore: release v%s"` |

执行前整理功能提交，编写 `docs/releases/v版本号.md` 发布说明，并确认工作区干净。版本更新会先运行测试，再创建提交和 `v版本号` 标签，不自动推送。

## 发布到 GitHub

以发布 `0.1.1` 为例：

```powershell
npm version patch -m "chore: release v%s"
git push origin main
git push origin v0.1.1
```

普通 main 推送和 PR 运行测试；`v*` 标签触发 Windows Release：校验版本、测试、编译桥接程序、准备运行库、打包、启动检查、生成 SHA256 并上传 Release。带 `-beta.1` 等后缀的版本标记为预发布。

Release 正文使用对应的 `docs/releases/v版本号.md`，缺少说明时构建会停止。

发布凭据使用 Actions 自带 `GITHUB_TOKEN`，无需个人令牌。构建任务只读仓库，独立发布任务具有 `contents: write`。已存在的 Release 不覆盖；标签与锁文件不一致时停止。

## 本地打包

Windows 需要 Node.js 24、Go、curl 与 7-Zip：

```powershell
npm ci
npm run release:check
npm test
npm run dist:win
npm run smoke:package
node scripts/release-checksums.cjs
```

`dist/` 包含 x64 NSIS 安装程序、ZIP 解压包及 SHA256 校验文件。打包会下载并校验固定版本运行库，生成的文件不提交 Git。尚未配置代码签名，Windows 可能显示未知发布者。

## 安装版与运行库

安装包包含 Electron、mpv、FFmpeg/ffprobe 和元信息桥接程序，附带运行库声明与桥接源码。模型、CUDA 和本地音乐不打包。

安装版数据默认位于 `%APPDATA%\MusicManager`，安装包升级保留该目录；ZIP 版本也使用此目录。开发版仍使用项目根目录 `data/`，不自动搬迁开发数据。`MUSIC_MANAGER_DATA_DIR` 可指定安装版数据目录。

模型默认读取 `D:\models\gguf`，可通过 `MUSIC_MODELS_DIR` 环境变量更改；该目录需有 Qwen3-ASR 主模型与 mmproj。GPU 运行库独立安装到数据目录中的 `tools/llama-cuda/`：

```powershell
# 从安装目录执行
powershell -ExecutionPolicy Bypass -File .\resources\scripts\install-asr-gpu.ps1 -DestinationRoot "$env:APPDATA\MusicManager"
```

使用自定义数据目录时，将 `DestinationRoot` 改为该目录。准备完成后，从客户端设置启动模型服务。相关文件与要求见 [ASR 配置](asr.md)；运行库许可与来源随包提供于 `resources/RUNTIME-NOTICES.md`。
