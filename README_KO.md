<p align="center">
  <a href="README.md">简体中文</a> · <a href="README_EN.md">English</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_ES.md">Español</a>
</p>

<p align="center">
  <img src="assets/cover.png" alt="youtube-channel-book" width="100%">
</p>

# youtube-channel-book

> YouTube 채널 하나를 입력하면 그 채널의 **모든 영상 자막**을 자동으로 크롤링해, 학습용 **작은 책**으로 증류합니다.
>
> Turn an entire YouTube channel into a small, learnable book — crawl every video's
> captions, then distill the channel's essence into structured chapters.

이것은 [Claude Code](https://claude.com/claude-code) **Skill**입니다. `.claude/skills/`
（프로젝트 단위）또는 `~/.claude/skills/`（전역）에 넣은 다음, Claude에게 이렇게 말하세요:

> 「https://www.youtube.com/@DanKoeTalks 이 채널을 작은 책 한 권으로 정리해 줘」

Claude가 알아서 처리합니다: 목록 수집 → 자막 다운로드 → 텍스트 변환 → 병렬 추출 → `BOOK.md`로 종합.

## 무엇을 해결하나

2026년, YouTube 자막을 일괄로 가져오는 일은 이미 꽤 어렵습니다(PO Token, 가상화 목록, 제한된 네트워크). 이 skill은 돌파에 필요한 핵심 수법을 모두 고정해 두었습니다:

- **PO Token 없이 자막 가져오기**: `yt-dlp --extractor-args "youtube:player_client=android_vr"`
  를 사용 —— 현재 PO Token 없이 안정적으로 동작하는 유일한 클라이언트입니다. `web/mweb/tv`로는 자막을 가져올 수 없습니다.
- **채널 전체 목록 수집**: YouTube의 새 그리드는 가상화되어 DOM에 약 30개의 카드만 남습니다. 스크립트는 스크롤하며 누적해 전부를 가져옵니다.
- **컨텍스트를 터뜨리지 않음**: N개 영상의 자막은 수백만 토큰에 이를 수 있습니다 —— 병렬 서브 Agent로 배치 추출하고, 메인 스레드는 핵심만 받습니다.
- **한 권의 책처럼**: 주제별로 장을 나누고, 일반적인 원론이 아니라 저자 특유의 프레임워크·숫자·명언을 보존합니다.

## 파이프라인

```
@handle ──①list_videos.mjs──> videos.tsv
        ──②fetch_subs.sh────> subs/*.json3   (android_vr, PO Token 불필요)
        ──③json3_to_text.py─> txt/*.txt
        ──④병렬 서브 Agent──> 배치별 핵심
        ──⑤종합─────────────> BOOK.md  📖
```

## 의존성

- [Claude Code](https://claude.com/claude-code)
- [`web-access`](https://github.com/eze-is/web-access) skill（그 CDP Proxy로 채널 목록을 수집）
- Python ≥ 3.10, `yt-dlp`（스크립트가 zipapp을 자동으로 내려받습니다）

## 파일

| 경로 | 역할 |
|---|---|
| `SKILL.md` | 오케스트레이션 설명（Claude가 이것을 읽습니다） |
| `scripts/list_videos.mjs` | CDP로 채널 전체 영상 id + 제목 수집 |
| `scripts/fetch_subs.sh` | yt-dlp로 자막 일괄 다운로드（android_vr） |
| `scripts/json3_to_text.py` | json3 자막 → 일반 텍스트 |
| `references/extractor-prompt.md` | 서브 Agent 추출 템플릿 |
| `references/book-template.md` | 작은 책 구조 템플릿 |
| `references/troubleshooting.md` | 스크래핑 방지 함정과 문제 해결 |

## 수동으로 실행（Claude 없이도 사용 가능）

```bash
WORK=./out; SKILL=.
node "$SKILL/scripts/list_videos.mjs" "@DanKoeTalks" "$WORK/videos.tsv"   # web-access Proxy가 실행 중이어야 합니다
cut -f1 "$WORK/videos.tsv" > "$WORK/ids.txt"
bash "$SKILL/scripts/fetch_subs.sh" "$WORK/ids.txt" "$WORK/subs"
python3 "$SKILL/scripts/json3_to_text.py" "$WORK/subs" "$WORK/txt"
# 그 후 txt/를 LLM에 넘겨 배치로 추출하고 한 권의 책으로 종합합니다
```

## License

MIT
