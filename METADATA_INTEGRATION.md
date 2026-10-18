# 元信息接口学习与接入

参考项目：https://github.com/guohuiyuan/go-music-dl

学习快照：`c1b188c366ece39cb19a61d108e4fbf7c29271e5`。

实际供应商库：https://github.com/guohuiyuan/music-lib ，固定版本 `v1.1.1-0.20260916154859-28e1080ba416`。

## 学到的结构

- `core/service.go`：根据 source 分派 Search 和 GetLyrics。
- `internal/web/music.go`：`/search` 返回 HTML；`/lyric` 返回歌词文本。歌词失败时 Web 层会返回“纯音乐 / 无歌词”占位文本，不适合作为元信息核验的真值。
- `music-lib/model/song.go`：统一歌曲模型，包含平台、歌曲 ID、歌名、歌手、专辑、时长、封面及源链接。
- `music-lib/netease`：Linux API 搜索；WeAPI 获取 LRC/YRC/翻译等歌词。
- `music-lib/qq`：搜索通过 songmid 与数字 song_id 关联；歌词请求使用数字 song_id，并解密 QRC。

## 原型实现

`metadata-bridge` 是独立 Go 程序，stdin JSON 请求、stdout JSON 响应。链接上游 music-lib，复用网易云与 QQ 的歌词获取和解码。没有音频下载功能。适配程序依赖 AGPL-3.0 组件；许可证位于 metadata-bridge/LICENSE，模块源代码可通过固定 Go 依赖获得。Go 适配程序源码按同一 AGPL-3.0 许可证提供。参考仓库位于 tools，仅用于学习，不打包整个 go-music-dl。

搜索专门保留无播放/下载权限的歌曲元信息。上游 Search 会过滤 VIP 等歌曲，这会使 QQ 的周杰伦原版结果消失。为元信息用途，QQ 使用同一搜索接口独立解析全部条目；网易云通过库提供的 Linux 协议加密进行搜索，但不应用播放权限过滤。

Node `metadata.cjs` 并行搜索两平台，按歌名、歌手、专辑、时长、版本初排，仅为前 5 个候选获取歌词。有效 ASR 的全文比对参与排序；异常 ASR 不参与。每个供应商超时/失败单独报告。不同平台歌曲 ID 不合并。

接口：

- `POST /api/metadata`：`{id, sources?: ["netease", "qq"]}`，根据当前曲目搜索；返回 candidates / errors。
- `POST /api/apply-candidate`：`{id, source, candidateId}`，只能采纳本次任务真实检索到且含正文的候选。
- Mock 接口仍保留供离线测试，但主界面已使用真实接口。

点击“搜索在线元信息与歌词”会把歌名、歌手发给两平台；音频、文件路径、ASR 转写留在本地。点击“采纳到当前任务”仅修改内存任务及后续输出命名/歌词文本，未改源音频，未写回音频内嵌标签。采纳仍需核对版本；同名翻唱也可能有相同歌词。

## 运行与验证

已编译 `metadata-bridge/metadata-bridge.exe`。重建：`powershell -ExecutionPolicy Bypass -File metadata-bridge/build.ps1`。需要 Go 1.20 或更高。未使用用户浏览器 Cookie；可选 Cookie 仅通过 MUSIC_NETEASE_COOKIE / MUSIC_QQ_COOKIE 环境变量传入，不保存在仓库。

本地测试：`node --test tests.cjs metadata-tests.cjs`。

一次真实查询已验证：《给我一首歌的时间 周杰伦》搜索和 QQ 歌词解码成功，原版 QQ id `004BhQke4adHcf` 位居第一。保存于 validation/music-sample-10/metadata-first.json。候选评分是排序分，不是模型正确率。

10 首批量查询脚本为 `node verify-metadata.cjs`。用户明确授权后已完成，十首均返回 5 个候选，首选候选均取得歌词；另有 3 次候选请求失败。报告位于 validation/music-sample-10/metadata-report.md，完整候选与错误记录位于 metadata-results.json。候选成功不代表十首都已确认正确；Summer Wine 的歌手署名、爱着爱着就永远的黑胶版本均需人工复核。
