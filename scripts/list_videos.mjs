#!/usr/bin/env node
// 抓取某 YouTube 频道 /videos 页全部长视频的 id + 标题。
// 依赖 web-access skill 的 CDP Proxy（默认 http://localhost:3456），需先跑 check-deps.mjs 启动 Proxy。
// 用法: node list_videos.mjs <@handle | channelURL> [outFile.tsv]
// 输出: 每行 "videoId\t标题"，并打印总数到 stderr。
//
// 关键点: YouTube 新版网格会虚拟化(DOM 只保留约 30 个)，必须边滚动边把
// a.ytLockupMetadataViewModelTitle 累加进 window._acc，否则只能拿到 30 个。

const PROXY = process.env.CDP_PROXY || 'http://localhost:3456';
const input = process.argv[2];
const outFile = process.argv[3];
if (!input) { console.error('usage: node list_videos.mjs <@handle|url> [out.tsv]'); process.exit(1); }

// 归一化成 /videos 页
let url;
if (input.startsWith('http')) {
  url = input.replace(/\/$/, '');
  if (!/\/videos$/.test(url)) url += '/videos';
} else {
  const handle = input.startsWith('@') ? input : '@' + input;
  url = `https://www.youtube.com/${handle}/videos`;
}

const post = async (path, body) => {
  const r = await fetch(PROXY + path, { method: 'POST', body });
  return r.text();
};
const get = async (path) => (await fetch(PROXY + path)).text();
const evalJs = async (target, js) => {
  const t = await post(`/eval?target=${target}`, js);
  try { return JSON.parse(t).value; } catch { return t; }
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const newResp = await post('/new', url);
  const target = JSON.parse(newResp).targetId;
  console.error('opened', url, 'tab', target);
  await sleep(3500);

  await evalJs(target, 'window._acc={};"ok"');

  let last = 0, stagnant = 0;
  // 逐步滚动 + 累加；连续多轮无新增则停止
  for (let y = 0; y < 400000 && stagnant < 6; y += 1100) {
    await get(`/scroll?target=${target}&y=${y}`);
    await sleep(450);
    const n = await evalJs(target,
      'document.querySelectorAll("a.ytLockupMetadataViewModelTitle").forEach(function(a){var id=(a.href.match(/v=([^&]+)/)||[])[1];if(id)window._acc[id]=a.textContent.trim()});Object.keys(window._acc).length');
    const count = parseInt(n) || 0;
    if (count === last) stagnant++; else { stagnant = 0; last = count; }
    if (y % 5500 === 0) console.error('  scrolled, collected', count);
  }
  // 再触底几次兜底
  for (let i = 0; i < 4; i++) { await get(`/scroll?target=${target}&direction=bottom`); await sleep(1000); }
  await evalJs(target,
    'document.querySelectorAll("a.ytLockupMetadataViewModelTitle").forEach(function(a){var id=(a.href.match(/v=([^&]+)/)||[])[1];if(id)window._acc[id]=a.textContent.trim()});0');

  const tsv = await evalJs(target,
    'var o=window._acc||{};Object.keys(o).map(k=>k+"\\t"+o[k]).join("\\n")');
  await get(`/close?target=${target}`);

  const lines = (tsv || '').split('\n').filter(Boolean);
  console.error('TOTAL videos:', lines.length);
  if (outFile) {
    const fs = await import('fs');
    fs.writeFileSync(outFile, tsv);
    console.error('written to', outFile);
  } else {
    process.stdout.write(tsv + '\n');
  }
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
