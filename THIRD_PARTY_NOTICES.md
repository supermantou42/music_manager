# Third-party notices

## Referenced projects and reused code

| Project | Version / revision | Use in MusicManager | License / source location |
| --- | --- | --- | --- |
| [guohuiyuan/music-lib](https://github.com/guohuiyuan/music-lib/tree/v1.1.1) | v1.1.1, `6353508e84cd357b5bc3acf32d95a16e01bbe20c` | Provider implementations for metadata, lyrics, QRC processing and audio URL resolution; called by the Go bridge | AGPL-3.0; complete vendored source and original license at `metadata-bridge/vendor/github.com/guohuiyuan/music-lib/` |
| [golang.org/x/text](https://cs.opensource.google/go/x/text/+/refs/tags/v0.39.0:) | v0.39.0 | Text encoding support used by the bridge dependency | BSD-3-Clause; source, LICENSE and PATENTS at `metadata-bridge/vendor/golang.org/x/text/` |
| [guohuiyuan/go-music-dl](https://github.com/guohuiyuan/go-music-dl) | Implementation reference | Reference for the multi-provider search and metadata workflow; the actual linked provider library is music-lib | Reference project, not a separately bundled executable or Go module |

The provider code is **reused through a pinned Go dependency**, not presented as original MusicManager code. The bridge is distributed with its own [AGPL-3.0 license](metadata-bridge/LICENSE), sources and vendored dependencies. This version adds local JSON bridge actions, download/import orchestration, UI and export handling around that library. Upstream license texts and notices are retained in the vendor tree.

The application has its own [LICENSE](LICENSE); bundled components retain their respective licenses. This notice does not replace or relicense their license texts.

## Bundled programs

- [Electron](https://github.com/electron/electron), 44.7.0: desktop runtime, MIT; Electron/Chromium third-party license files accompany the runtime.
- [mpv](https://github.com/mpv-player/mpv), shinchiro build 20261011 (`accb7b2821`): native audio playback. Distribution: [mpv-winbuild-cmake](https://github.com/shinchiro/mpv-winbuild-cmake/releases/tag/20261011). GPL/LGPL texts and documentation accompany the packaged binary.
- [FFmpeg / ffprobe](https://github.com/FFmpeg/FFmpeg/commit/38b88335f9), Gyan essentials build 8.1.2: audio inspection and export. This distribution is GPLv3; license and build information accompany the binaries.

See [runtime notices](build/runtime-notices.md) for exact distribution and source references. Installed packages include the runtime notice as `resources/RUNTIME-NOTICES.md`, the bridge source/licenses under `resources/metadata-bridge/`, and the runtime licenses under `resources/tools/`.


## Lucide

Version: 1.59.0
Project: https://lucide.dev/

The local SVG sprite is generated from selected Lucide icons.

ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
