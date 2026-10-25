# Bundled runtime components

The Windows package includes these separate programs and their license files:

- mpv: shinchiro build `20261011`, revision `accb7b2821`. License texts are in `tools/mpv/LICENSE.GPL` and `tools/mpv/LICENSE.LGPL`; documentation is in `tools/mpv/doc/`.
  - Binary distribution: https://github.com/shinchiro/mpv-winbuild-cmake/releases/tag/20261011
  - Build recipes and dependency sources: https://github.com/shinchiro/mpv-winbuild-cmake
  - mpv source: https://github.com/mpv-player/mpv
- FFmpeg / ffprobe: Gyan essentials build `8.1.2`, GPLv3. License and build configuration are in `tools/ffmpeg/LICENSE` and `tools/ffmpeg/README.txt`.
  - Distribution and source references: https://www.gyan.dev/ffmpeg/builds/
  - FFmpeg source: https://github.com/FFmpeg/FFmpeg/commit/38b88335f9
- Metadata bridge: AGPL-3.0. Uses [guohuiyuan/music-lib v1.1.1](https://github.com/guohuiyuan/music-lib/tree/v1.1.1), commit `6353508e84cd357b5bc3acf32d95a16e01bbe20c`, for platform search, lyrics and URL resolution, plus `golang.org/x/text v0.39.0` (BSD-3-Clause). The workflow was informed by [guohuiyuan/go-music-dl](https://github.com/guohuiyuan/go-music-dl); music-lib is the actual linked provider dependency. Complete bridge and vendored dependency sources, module manifests and licenses are included in `metadata-bridge/` beside the executable.

The application source for each release is available from the corresponding tag at https://github.com/supermantou42/music_manager . Electron and its bundled components retain their upstream license files in the application directory.

Models and llama.cpp/CUDA runtimes are installed separately and are not included in the package.
