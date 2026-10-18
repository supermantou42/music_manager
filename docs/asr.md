# 本地 ASR 配置

[返回 README](../README.md)

## 模型与运行库

本项目启动脚本使用以下两份文件：

```text
D:\models\gguf\Qwen3-ASR-1.7B-Q8_0.gguf
D:\models\gguf\mmproj-Qwen3-ASR-1.7B-Q8_0.gguf
```

这是当前本机配置，其他机器需调整 `scripts/start-asr.ps1` 中的模型路径；桌面服务管理也使用同一组路径，见 `src/model-service.cjs`。

GPU 安装脚本固定使用 llama.cpp b11552 CUDA 13.4 构建，并校验下载文件 SHA256：

```powershell
npm run install:asr
npm run start:asr
```

运行库保存在 `tools/llama-cuda/`，模型不随仓库提供。需要兼容该构建的 NVIDIA GPU 与驱动。模型服务仅监听本机。

客户端设置中提供服务启动、停止和状态。关闭客户端不等于停止独立模型服务，需要时使用停止按钮。

## 并发与端口

| 项目 | 当前默认值 |
| --- | --- |
| ASR 地址 | `http://127.0.0.1:8082` |
| 模型槽位 | 32 |
| 客户端歌曲并发 | 32，可在设置中调整为 1–32 |
| 单槽上下文 | 2048 |
| 总上下文 | 槽位数 × 2048，默认 65536 |
| 元信息接口并发 | 10，可在设置中调整为 1–16 |

32 是当前配置，不是所有显卡都能承受的推荐值。显存不足、超时或识别异常时先降低并发，保存设置后重启模型服务，使槽位数与客户端配置一致。

独立启动可显式指定：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-asr.ps1 -Parallel 4 -Port 8082
```

脚本还支持 `-ContextSize` 和 `-Cpu`。CPU 回退需要事先将兼容的运行库放在 `tools/llama/`，GPU 安装脚本不安装 CPU 版。

## 粗切分与容错

FFmpeg 解码为 16 kHz 单声道，在 150–3500 Hz 频段寻找短时能量低谷。片段最短三秒、目标八秒、最长十八秒，连续覆盖全曲；静音不转写，缺少低谷时按最大长度回退。最多处理三十分钟音频。

识别使用流式接收，机械重复会提前中止。异常片段可带少量前后文自动重试，重试并发受限；正常片段保留。连接失败后不会继续请求同曲剩余片段。HTTP 成功不代表转写质量达标。

切片、`transcript.lrc`、`segments.json` 和试听索引保存在 `data/asr/`。时间戳只表示粗片段起点，不代表逐句或逐字时间。
