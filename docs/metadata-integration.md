# 元信息接口来源与实现

[返回 README](../README.md)

## 来源

参考项目：[guohuiyuan/go-music-dl](https://github.com/guohuiyuan/go-music-dl)。

实际复用其供应商库 [guohuiyuan/music-lib](https://github.com/guohuiyuan/music-lib)，固定版本 `v1.1.1`（提交 `6353508e84cd357b5bc3acf32d95a16e01bbe20c`）。源码在 `metadata-bridge/vendor/`，包含歌词获取与 QRC 解码。

桥接程序提供元信息搜索、歌词与多源歌曲目录、音频直链解析；下载由 Node 服务管理，见 [在线搜歌与下载](online-music.md)。它使用 AGPL-3.0 组件，许可证见 [metadata-bridge/LICENSE](../metadata-bridge/LICENSE)。

## 调用链

```text
ui/ → src/server.cjs → src/metadata.cjs
                    → metadata-bridge/metadata-bridge.exe
                    → 网易云 / QQ 元信息与歌词接口
```

Go 程序通过 stdin 接收 JSON，通过 stdout 返回 JSON。QQ 搜索保留无播放权限的元信息结果，避免因 VIP 下载限制遗漏原版歌曲；网易云搜索复用供应商协议加密。两者都不将“纯音乐 / 无歌词”等占位文本当作有效歌词。

Node 层并行检索平台、去重并获取候选歌词；排序结合歌名、歌手、时长、版本以及可用的 ASR 比较结果。无高匹配时降级只查歌名，各平台失败单独报告。具体使用规则见 [使用说明](usage.md)。

## 接口

| 接口 | 输入 / 用途 |
| --- | --- |
| `POST /api/metadata` | `{id, sources?, parameters?: {title, artist}}`，搜索当前曲目的候选 |
| `POST /api/apply-candidate` | `{id, source, candidateId}`，选择真实检索到且包含有效正文的候选 |
| `POST /api/mock` | 离线测试占位响应，不能作为真实歌词写入 |

写请求需要客户端本地 token。搜索参数以当前服务实现及界面实际请求为准。选择候选仅影响任务与最终输出，原文件不变。

## 构建与本地凭据

```powershell
npm run build:metadata
node --test tests/tests.cjs tests/metadata-tests.cjs
```

需要 Go 1.25+，输出位于 `metadata-bridge/metadata-bridge.exe`。可选 Cookie 通过 `MUSIC_NETEASE_COOKIE` / `MUSIC_QQ_COOKIE` 环境变量传入，不保存在仓库。搜索发送歌名、歌手；不上传音频、路径或 ASR 转写。
