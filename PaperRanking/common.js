// Shared data loading, language settings, date controls, and ranking calculations.
export const $ = id => document.getElementById(id);
export const messages = {
  en: {
    title: 'arXiv CS Citation Rankings', singleTitle: 'Find a paper’s rank', subtitle: 'Exact date windows · Top 100',
    singleSubtitle: 'Compare one paper with every paper in your publication window.', leaderboard: 'Leaderboard', singleLink: 'Find a paper’s rank',
    loading: 'Loading paper data…', downloading: 'Downloading data… {mb} MB', cached: 'Reading cached data…', decoding: 'Preparing rankings…',
    loadError: 'Could not load data: {error}', retry: 'Retry', snapshot: '{count} CS papers · {start} to {end}', refreshed: 'Refreshed {date}',
    publication: 'Publication window (arXiv v1)', citation: 'Citation window (citing paper’s v1)', start: 'Start date', end: 'End date',
    d7: 'Last 7 days', d30: 'Last 30 days', d90: 'Last 90 days', m3: 'Last 3 months', m6: 'Last 6 months', y1: 'Last year', all: 'All dates',
    anchor: 'Shortcuts end on the latest submission date in this snapshot: {date}. Both endpoints are inclusive.',
    search: 'Filter papers', placeholder: 'Title phrase or arXiv ID', searchHint: 'Case-insensitive phrase matching in titles and IDs. Results are ranked within the matching set.',
    candidatesLabel: 'Find a paper', candidatesHint: 'Enter a title phrase, arXiv ID, or arXiv URL, then select a paper. The comparison set includes all papers in the publication window.',
    searchEmpty: 'No matching papers.', candidates: '{count} matches · showing the first {shown}', choose: 'Search above and select a paper to see its rank.',
    matchedPapers: 'Papers matching your filters', submissions: 'CS submissions in citation window', responseRate: 'Valid S2 responses', citations: 'New citations', score: 'Normalized score',
    ranking: 'Top {count} · selected window', resultWindow: 'Citations from {start} to {end}', empty: 'No papers match these filters.',
    export: 'Export JSON', rank: 'Rank', paper: 'Paper', trend: 'Citation history', details: 'Daily details', close: 'Close', date: 'Date',
    calculating: 'Calculating…', invalid: 'Choose valid dates within the snapshot, with each start no later than its end.',
    coverage: 'Coverage in the selected citation window', month: 'Month', ok: 'Valid responses', missing: 'S2 not found', mismatch: 'ID mismatch', unresolved: 'Unresolved', emptyRefs: 'Empty references',
    coverageOld: 'Daily response coverage is unavailable in this older snapshot.',
    method: 'Method and limitations', method1: 'Only arXiv CS → arXiv CS citations are counted, including cross-listed papers. IDs are versionless and all dates use arXiv v1 submissions. Targets are limited to this dataset.',
    method2: 'Score = Σ(daily new citations ÷ all CS submissions that day × 1,000). Dates are inclusive. Each source–target pair is counted once. Ties are broken by citation count, then arXiv ID.',
    method3: 'A citation is dated by the citing paper’s v1 submission. S2 references may include later revisions. This measures citation activity, not acceleration. Missing records and incomplete indexing cause undercounts; recent days may be incomplete.',
    method4: 'Updates add newly discovered citing papers. Previously cached reference lists are retained rather than refreshed in full.',
    limitations: '{missing} S2 sources not found · {mismatch} ID mismatches · {unresolved} unresolved sources excluded from citation counts.',
    selected: 'Selected paper', change: 'Choose another paper', position: '#{rank} of {total}', percentile: 'Ahead of {percent}% of the comparison set', nearby: 'Nearby ranks',
    outside: 'This paper’s v1 date ({date}) is outside the publication window. Expand the window to include it before requesting a rank.',
    include: 'Include this publication date', noPopulation: 'No papers in the selected publication window.',
    rangeSummary: 'Published {ps}–{pe} · Citing papers submitted {cs}–{ce}', footer: 'arXiv OAI-PMH · Semantic Scholar Graph API',
  },
  zh: {
    title: 'arXiv CS 引用增长榜', singleTitle: '查询单篇论文排名', subtitle: '精确日期筛选 · 总榜 Top 100',
    singleSubtitle: '查看一篇论文在所选发表窗口全部论文中的排名。', leaderboard: '总榜', singleLink: '查询单篇论文排名',
    loading: '正在载入论文数据…', downloading: '正在下载数据… {mb} MB', cached: '正在读取本地缓存…', decoding: '正在准备排名…',
    loadError: '数据载入失败：{error}', retry: '重试', snapshot: '{count} 篇 CS 论文 · {start} 至 {end}', refreshed: '刷新时间 {date}',
    publication: '论文发表时间窗（arXiv v1）', citation: '被引用时间窗（引用方 v1）', start: '起始日期', end: '结束日期',
    d7: '最近 7 天', d30: '最近 30 天', d90: '最近 90 天', m3: '最近三个月', m6: '最近半年', y1: '最近一年', all: '全部日期',
    anchor: '快捷时间窗截止于快照中最新投稿日：{date}，起止日期均计入。',
    search: '筛选论文', placeholder: '论文标题短语或 arXiv ID', searchHint: '按标题和 ID 匹配连续短语，不区分大小写；结果在匹配论文中重新排名。',
    candidatesLabel: '查找论文', candidatesHint: '输入标题短语、arXiv ID 或 arXiv 链接，再选择论文；排名比较对象是发表窗口内的全部论文。',
    searchEmpty: '没有匹配的论文。', candidates: '{count} 篇匹配 · 显示前 {shown} 篇', choose: '请先搜索并选择一篇论文。',
    matchedPapers: '符合筛选条件的论文', submissions: '引用窗口内 CS 投稿', responseRate: '有效 S2 响应', citations: '新增引用', score: '归一化分数',
    ranking: '所选时间窗 · 总榜 Top {count}', resultWindow: '{start} 至 {end} 的新增引用', empty: '没有符合筛选条件的论文。',
    export: '导出 JSON', rank: '排名', paper: '论文', trend: '引用历史', details: '每日明细', close: '关闭', date: '日期',
    calculating: '正在计算…', invalid: '请选择数据范围内的有效日期，起始日期不能晚于结束日期。',
    coverage: '所选引用窗口的数据覆盖', month: '月份', ok: '有效响应', missing: 'S2 未找到', mismatch: 'ID 不一致', unresolved: '未解决', emptyRefs: '空参考文献',
    coverageOld: '此旧快照暂不含按日响应覆盖信息。',
    method: '统计口径与数据限制', method1: '只统计 arXiv CS → arXiv CS 引用，包含交叉分类。ID 去除版本号；所有日期均使用 arXiv v1 提交日期，被引论文限于本数据集。',
    method2: '分数 = Σ（每日新增引用 ÷ 当日全部 CS 投稿量 × 1,000）。起止日均计入；每对引用关系只计一次。分数相同时按引用数、arXiv ID 排序。',
    method3: '引用日期使用引用方 v1 日期。S2 参考文献可能包含后续版本新增内容。这反映引用活动，不代表增长加速度。缺失和索引延迟会导致低估，近期数据可能不完整。',
    method4: '增量更新拉取新发现的引用方论文；历史参考文献沿用缓存，不做全量重新抓取。',
    limitations: '{missing} 篇 S2 未找到 · {mismatch} 篇 ID 不一致 · {unresolved} 篇未解决来源不计入引用数。',
    selected: '已选论文', change: '选择其他论文', position: '第 {rank} / {total} 篇', percentile: '超过比较范围内 {percent}% 的论文', nearby: '附近排名',
    outside: '该论文的 v1 日期（{date}）不在发表窗口内，请扩大发表窗口后查询排名。',
    include: '将该发表日期纳入窗口', noPopulation: '所选发表窗口内没有论文。',
    rangeSummary: '发表窗口 {ps}–{pe} · 被引窗口 {cs}–{ce}', footer: 'arXiv OAI-PMH · Semantic Scholar Graph API',
  },
};
let language = 'en';
try { language = localStorage.getItem('paper-ranking-language') === 'zh' ? 'zh' : 'en'; } catch {}
export const t = (key, vars = {}) => (messages[language][key] || messages.en[key] || key).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
export const fmt = n => Number(n).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US');
export function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function initLanguage(onChange) {
  function apply() {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = t(document.body.dataset.page === 'paper' ? 'singleTitle' : 'title');
    document.querySelectorAll('[data-i18n]').forEach(n => n.textContent = t(n.dataset.i18n));
    document.querySelectorAll('[data-placeholder]').forEach(n => n.placeholder = t(n.dataset.placeholder));
    $('language').textContent = language === 'en' ? '中文' : 'English';
    $('language').setAttribute('aria-label', language === 'en' ? 'Switch to Chinese' : '切换为英文');
  }
  apply();
  $('language').onclick = () => {
    language = language === 'en' ? 'zh' : 'en';
    try { localStorage.setItem('paper-ranking-language', language); } catch {}
    apply(); onChange();
  };
}
export function dateAdd(d, n) {
  const date = new Date(d + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}
function monthsBack(d, n) {
  const date = new Date(d + 'T00:00:00Z'), day = date.getUTCDate();
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() - n);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.toISOString().slice(0, 10);
}
export function bounds() {
  return Object.fromEntries(['paper-start','paper-end','citation-start','citation-end'].map(id => [id, $(id).value]));
}
export function validBounds(D) {
  return ['paper', 'citation'].every(prefix => {
    const start = $(prefix + '-start').value, end = $(prefix + '-end').value;
    return start && end && start <= end && start >= D.range[0] && end < D.range[1];
  });
}
function preset(D, button) {
  const last = D.days.at(-1);
  const start = button.dataset.days ? dateAdd(last, 1 - Number(button.dataset.days)) :
    button.dataset.months ? dateAdd(monthsBack(last, Number(button.dataset.months)), 1) : D.range[0];
  return [start < D.range[0] ? D.range[0] : start, last];
}
export function updateDates(D) {
  document.querySelectorAll('.quick button').forEach(button => {
    const prefix = button.closest('.quick').dataset.window;
    const [start, end] = preset(D, button);
    const active = $(prefix + '-start').value === start && $(prefix + '-end').value === end;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('date-note').textContent = t('anchor', {date: D.days.at(-1)});
}
export function initDates(D, onChange) {
  const last = D.days.at(-1);
  for (const id of ['paper-start','paper-end','citation-start','citation-end']) {
    $(id).min = D.range[0]; $(id).max = dateAdd(D.range[1], -1);
    $(id).addEventListener('change', () => { updateDates(D); onChange(); });
  }
  $('paper-start').value = D.range[0]; $('paper-end').value = last;
  $('citation-start').value = [dateAdd(last, -89), D.range[0]].sort().at(-1); $('citation-end').value = last;
  document.querySelectorAll('.quick button').forEach(button => button.onclick = () => {
    const prefix = button.closest('.quick').dataset.window, [start, end] = preset(D, button);
    $(prefix + '-start').value = start; $(prefix + '-end').value = end;
    updateDates(D); onChange();
  });
  updateDates(D);
}
export function normalize(s) { return s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim(); }
export function queryText(s) {
  const q = normalize(s);
  const match = q.match(/^(?:https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf)\/|arxiv:)?((?:\d{4}\.\d{4,5}|[a-z.-]+\/\d{7}))(?:v\d+)?(?:\.pdf)?\/?$/);
  return match ? match[1] : q;
}
export function paperLink(p) {
  const a = el('a', p[2]); a.href = 'https://arxiv.org/abs/' + encodeURIComponent(p[0]);
  a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
}
export const compare = (a, b) => b.score - a.score || b.raw - a.raw || a.paper[0].localeCompare(b.paper[0], 'en');
export function rankPapers(D, ps, pe, cs, ce, query = '') {
  const q = queryText(query), rows = [];
  for (const p of D.papers) {
    if (p[1] < ps || p[1] > pe || (q && !normalize(p[0] + ' ' + p[2]).includes(q))) continue;
    let raw = 0, score = 0;
    for (let i = 0; i < p[3].length; i += 2) {
      const day = p[3][i], count = p[3][i+1];
      if (D.days[day] < cs) continue;
      if (D.days[day] > ce) break;
      raw += count; score += count * 1000 / D.denominators[day];
    }
    rows.push({paper: p, raw, score});
  }
  return rows.sort(compare);
}
export function snapshot(D) {
  $('snapshot').textContent = t('snapshot', {count: fmt(D.papers.length), start: D.range[0], end: D.days.at(-1)});
  $('refreshed').textContent = t('refreshed', {date: new Date(D.report.generated_at).toLocaleString(document.documentElement.lang)});
  const info = $('limitations');
  if (info) info.textContent = t('limitations', {missing: fmt(D.report.missing_s2_sources || 0), mismatch: fmt(D.report.excluded_id_mismatches || 0), unresolved: fmt(D.report.source_coverage_unresolved || 0)});
}
export async function loadData() {
  const manifestResponse = await fetch('./dataset.json', {cache: 'no-cache'});
  if (!manifestResponse.ok) throw Error('Dataset manifest HTTP ' + manifestResponse.status);
  const manifest = await manifestResponse.json(), url = new URL(manifest.file, location.href);
  url.searchParams.set('version', manifest.sha256);
  let cache, response;
  try { cache = await caches.open('arxiv-ranking-data-v2'); response = await cache.match(url.href); } catch {}
  let bytes;
  if (response) {
    $('loading').textContent = t('cached'); bytes = await response.arrayBuffer();
  } else {
    response = await fetch(url.href);
    if (!response.ok) throw Error('Dataset HTTP ' + response.status);
    const reader = response.body.getReader(), chunks = []; let size = 0;
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      chunks.push(value); size += value.length;
      $('loading').textContent = t('downloading', {mb: (size/1e6).toFixed(1)});
    }
    const data = new Uint8Array(size); let offset = 0;
    for (const part of chunks) { data.set(part, offset); offset += part.length; }
    bytes = data.buffer;
  }
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(b => b.toString(16).padStart(2,'0')).join('');
  if (hash !== manifest.sha256) {
    if (cache) await cache.delete(url.href);
    throw Error('Dataset checksum mismatch; please retry.');
  }
  if (cache) {
    try {
      await cache.put(url.href, new Response(bytes));
      for (const request of await cache.keys()) if (request.url !== url.href) await cache.delete(request);
      // Reclaim the unversioned snapshot used by the previous site release.
      await caches.delete('arxiv-ranking-2026-09-22');
    } catch { /* Private mode and quota limits must not prevent loading. */ }
  }
  $('loading').textContent = t('decoding');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}
export function showLoadError(error) {
  $('loading').textContent = t('loadError', {error: error.message});
  const button = el('button', t('retry')); button.onclick = () => location.reload();
  $('loading').append(' ', button);
}
export function rankingTable(rows, offset = 0, selectedId = '', onDetail = null) {
  const wrap = el('div', undefined, 'table-wrap ranking-wrap'), table = el('table', undefined, 'ranking-table');
  const header = el('thead'), headRow = el('tr');
  const columns = [['rank','rank-cell'],['paper','paper-cell'],['citations','count-cell'],['score','score-cell']];
  if (onDetail) columns.push(['trend','history-cell']);
  for (const [label, cls] of columns) headRow.append(el('th', t(label), cls));
  header.append(headRow); table.append(header);
  const body = el('tbody');
  rows.forEach((row, i) => {
    const tr = el('tr');
    if (row.paper[0] === selectedId) { tr.className = 'me'; tr.setAttribute('aria-current', 'true'); }
    const paper = el('td', undefined, 'paper-cell');
    paper.append(paperLink(row.paper), el('div', row.paper[0] + ' · v1 ' + row.paper[1], 'paper-meta'));
    const count = el('td', fmt(row.raw), 'count-cell'), score = el('td', row.score.toFixed(3), 'score-cell');
    count.dataset.label = t('citations'); score.dataset.label = t('score');
    tr.append(el('td', fmt(offset + i + 1), 'rank-cell'), paper, count, score);
    if (onDetail) {
      const cell = el('td', undefined, 'history-cell'), button = el('button', t('details'));
      button.type = 'button'; button.onclick = () => onDetail(row); cell.append(button); tr.append(cell);
    }
    body.append(tr);
  });
  table.append(body); wrap.append(table); return wrap;
}
