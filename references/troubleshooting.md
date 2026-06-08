# 排错 / 反爬坑(2026 实战记录)

## 字幕拿不到 —— 最大的坑
**症状**：yt-dlp 报 `subtitles require a PO Token`，或浏览器内 fetch timedtext 返回空，
或 get_transcript API 报 `FAILED_PRECONDITION`。
**原因**：YouTube 现在对字幕强制 PO Token。
**解法**：用 `--extractor-args "youtube:player_client=android_vr"`。这是目前唯一稳定
**免 PO Token** 拿到自动字幕的客户端。`web/mweb/tv/tv_simply` 都需要 PO Token，不要用。
> 备选：`--cookies-from-browser chrome` 不能解决字幕问题(它解决的是登录态)；
> 装 Deno 让 yt-dlp 自动解 n-challenge/生成 PO Token 也可以，但 Deno 二进制在 GitHub，
> 受限网络下载困难。android_vr 是最省事的路。

## 视频清单只抓到 ~30 个
**原因**：YouTube 新版频道页用 `ytLockupViewModel` 网格 + 虚拟化，DOM 只保留视口附近约 30 个。
**解法**：边滚动边把 `a.ytLockupMetadataViewModelTitle` 累加进 `window._acc`(同一 tab 的
window 跨 eval 保持)。`list_videos.mjs` 已实现。注意**不要中途导航该 tab**，否则 `_acc` 丢失。
- 标题选择器：`a.ytLockupMetadataViewModelTitle`(2026 版)。旧选择器 `#video-title`/
  `ytLockupMetadataViewModelTitle` 之外的都已失效。

## Python 版本
新版 yt-dlp 要 Python ≥ 3.10。macOS 自带 `python3` 常是 3.9(Command Line Tools)，会报
`malformed`/导入失败。用 `python3.11`/`python3.12`(Homebrew 装的)跑 zipapp。

## yt-dlp 二进制下载慢/损坏
GitHub release 在受限网络下直连慢、易截断(`malformed Mach-o file` = 没下完)。
- 用 **zipapp**(`.../releases/latest/download/yt-dlp`，约 3MB)而非 macos 独立二进制(约 40MB)。
- 下载时 `env -u http_proxy -u https_proxy -u all_proxy ... curl`(本机代理对 GitHub 是死的，必须直连)。

## Shorts vs 长视频
`/videos` 只列长视频；Shorts 在 `/shorts`，是独立列表。频道页显示的"视频总数"通常含 Shorts。
Shorts 信息密度低，默认不纳入小书。

## get_transcript 内部 API(留档，一般用不到)
能从 `ytInitialData` 里递归找到 `getTranscriptEndpoint.params`，POST `/youtubei/v1/get_transcript`，
但在受限网络/无 PO Token 时会 `FAILED_PRECONDITION`。android_vr 路线更稳，优先用它。
