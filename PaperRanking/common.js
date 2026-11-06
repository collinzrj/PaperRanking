// Shared data loading, language settings, date controls, and ranking calculations.
export const $ = id => document.getElementById(id);
export const messages = {
  en: {
    title: 'arXiv CS Citation Rankings', subtitle: 'Exact date windows · Top 100',
    loading: 'Loading paper data…', downloading: 'Downloading data… {mb} MB', cached: 'Reading cached data…', decoding: 'Preparing rankings…',
    loadError: 'Could not load data: {error}', retry: 'Retry', snapshot: '{count} CS papers · {start} to {end}', refreshed: 'Refreshed {date}',
    publication: 'Publication window (arXiv v1)', citation: 'Citation window (citing paper’s v1)', start: 'Start date', end: 'End date',
    d7: 'Last 7 days', d30: 'Last 30 days', d90: 'Last 90 days', m3: 'Last 3 months', m6: 'Last 6 months', y1: 'Last year', all: 'All dates',
    year: 'Year', fullYear: 'Full year', h1: 'H1', h2: 'H2', q1: 'Q1', q2: 'Q2', q3: 'Q3', q4: 'Q4',
    anchor: 'Shortcuts end on the latest submission date in this snapshot: {date}. Both endpoints are inclusive.',
    search: 'Find papers', placeholder: 'Title phrase, arXiv ID, or arXiv URL', searchHint: 'Case-insensitive phrase matching in titles and IDs. Ranks are among all papers in the publication window. Select a paper to see its rank in any citation window.',
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
    viewRank: 'View rank', population: 'Compared with every paper published {ps} to {pe} (the leaderboard’s publication window).',
    position: '#{rank} of {total}', percentile: 'Ahead of {percent}% of the comparison set', nearby: 'Nearby ranks',
    outside: 'This paper’s v1 date ({date}) is outside the publication window. Expand the window to include it before requesting a rank.',
    include: 'Include this publication date', footer: 'arXiv OAI-PMH · Semantic Scholar Graph API',
  },
  zh: {
    title: 'arXiv CS 引用增长榜', subtitle: '精确日期筛选 · 总榜 Top 100',
    loading: '正在载入论文数据…', downloading: '正在下载数据… {mb} MB', cached: '正在读取本地缓存…', decoding: '正在准备排名…',
    loadError: '数据载入失败：{error}', retry: '重试', snapshot: '{count} 篇 CS 论文 · {start} 至 {end}', refreshed: '刷新时间 {date}',
    publication: '论文发表时间窗（arXiv v1）', citation: '被引用时间窗（引用方 v1）', start: '起始日期', end: '结束日期',
    d7: '最近 7 天', d30: '最近 30 天', d90: '最近 90 天', m3: '最近三个月', m6: '最近半年', y1: '最近一年', all: '全部日期',
    year: '年份', fullYear: '全年', h1: '上半年', h2: '下半年', q1: '第一季度', q2: '第二季度', q3: '第三季度', q4: '第四季度',
    anchor: '快捷时间窗截止于快照中最新投稿日：{date}，起止日期均计入。',
    search: '查找论文', placeholder: '标题短语、arXiv ID 或 arXiv 链接', searchHint: '按标题和 ID 匹配连续短语，不区分大小写；排名是在发表窗口全部论文中的名次。点开论文可查看任意被引窗口下的排名。',
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
    viewRank: '查看排名', population: '比较对象：{ps} 至 {pe} 发表的全部论文（取自总榜的发表窗口）。',
    position: '第 {rank} / {total} 篇', percentile: '超过比较范围内 {percent}% 的论文', nearby: '附近排名',
    outside: '该论文的 v1 日期（{date}）不在发表窗口内，请扩大发表窗口后查询排名。',
    include: '将该发表日期纳入窗口', footer: 'arXiv OAI-PMH · Semantic Scholar Graph API',
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
    document.title = t('title');
    document.querySelectorAll('[data-i18n]').forEach(n => n.textContent = t(n.dataset.i18n));
    document.querySelectorAll('[data-placeholder]').forEach(n => n.placeholder = t(n.dataset.placeholder));
    document.querySelectorAll('[data-aria-label]').forEach(n => n.setAttribute('aria-label', t(n.dataset.ariaLabel)));
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
// Date windows: the leaderboard's two filters plus the paper dialog's own citation window.
const WINDOWS = ['paper', 'citation', 'detail-citation'];
export function bounds(prefixes = ['paper', 'citation']) {
  return Object.fromEntries(prefixes.flatMap(w => [w + '-start', w + '-end']).map(id => [id, $(id).value]));
}
export function validBounds(D, prefixes = ['paper', 'citation']) {
  return prefixes.every(prefix => {
    const start = $(prefix + '-start').value, end = $(prefix + '-end').value;
    return start && end && start <= end && start >= D.range[0] && end < D.range[1];
  });
}
function preset(D, button) {
  if (button.dataset.start) return [button.dataset.start, button.dataset.end];
  const last = D.days.at(-1);
  const start = button.dataset.days ? dateAdd(last, 1 - Number(button.dataset.days)) :
    button.dataset.months ? dateAdd(monthsBack(last, Number(button.dataset.months)), 1) : D.range[0];
  return [start < D.range[0] ? D.range[0] : start, last];
}
// Calendar presets: a year dropdown plus [label key, first month, last month] buttons for that year.
const PERIOD_YEARS = [2022, 2023, 2024, 2025];
const PERIODS = [['fullYear',1,12],['h1',1,6],['h2',7,12],['q1',1,3],['q2',4,6],['q3',7,9],['q4',10,12]];
const periodDates = (year, first, last) => [`${year}-${String(first).padStart(2,'0')}-01`, new Date(Date.UTC(year, last, 0)).toISOString().slice(0, 10)];
function setPeriodYear(row, year) {
  row.querySelector('select').value = year;
  row.querySelectorAll('button').forEach((button, i) => {
    [button.dataset.start, button.dataset.end] = periodDates(year, PERIODS[i][1], PERIODS[i][2]);
    button.title = `${button.dataset.start} – ${button.dataset.end}`;
  });
}
function addPeriods(quick) {
  const row = el('div', undefined, 'quick periods'), select = el('select');
  row.dataset.window = quick.dataset.window; select.dataset.ariaLabel = 'year'; select.setAttribute('aria-label', t('year'));
  for (const year of PERIOD_YEARS) { const option = el('option', String(year)); option.value = year; select.append(option); }
  row.append(select);
  for (const [key] of PERIODS) {
    const button = el('button', t(key)); button.type = 'button'; button.dataset.i18n = key;
    button.setAttribute('aria-pressed', 'false'); row.append(button);
  }
  setPeriodYear(row, PERIOD_YEARS.at(-1));
  // Switching years keeps the selected period, e.g. Q3 2024 → Q3 2023.
  select.onchange = () => {
    const active = row.querySelector('button.active'); setPeriodYear(row, select.value);
    if (active) active.click();
  };
  quick.after(row);
}
// Show the year that matches the current dates, so its period button can light up.
function syncPeriodYear(row) {
  const prefix = row.dataset.window, start = $(prefix + '-start').value, end = $(prefix + '-end').value;
  for (const year of PERIOD_YEARS) {
    if (PERIODS.some(([, first, last]) => String(periodDates(year, first, last)) === String([start, end]))) {
      if (row.querySelector('select').value !== String(year)) setPeriodYear(row, year);
      return;
    }
  }
}
export function updateDates(D) {
  document.querySelectorAll('.periods').forEach(syncPeriodYear);
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
  for (const prefix of WINDOWS) for (const id of [prefix + '-start', prefix + '-end']) {
    $(id).min = D.range[0]; $(id).max = dateAdd(D.range[1], -1);
    $(id).addEventListener('change', () => { updateDates(D); onChange(prefix); });
  }
  $('paper-start').value = D.range[0]; $('paper-end').value = last;
  $('citation-start').value = [dateAdd(last, -89), D.range[0]].sort().at(-1); $('citation-end').value = last;
  document.querySelectorAll('.quick:not(.periods)').forEach(addPeriods);
  document.querySelectorAll('.quick button').forEach(button => button.onclick = () => {
    const prefix = button.closest('.quick').dataset.window, [start, end] = preset(D, button);
    $(prefix + '-start').value = start; $(prefix + '-end').value = end;
    updateDates(D); onChange(prefix);
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
// Normalized "id title" strings, built once on the first search.
const searchIndex = new WeakMap();
function searchText(D) {
  if (!searchIndex.has(D)) searchIndex.set(D, D.papers.map(p => normalize(p[0] + ' ' + p[2])));
  return searchIndex.get(D);
}
export const compare = (a, b) => b.score - a.score || b.raw - a.raw || a.paper[0].localeCompare(b.paper[0], 'en');
function scoreRows(D, ps, pe, cs, ce) {
  const rows = [];
  for (let n = 0; n < D.papers.length; n++) {
    const p = D.papers[n];
    if (p[1] < ps || p[1] > pe) continue;
    let raw = 0, score = 0;
    for (let i = 0; i < p[3].length; i += 2) {
      const day = p[3][i], count = p[3][i+1];
      if (D.days[day] < cs) continue;
      if (D.days[day] > ce) break;
      raw += count; score += count * 1000 / D.denominators[day];
    }
    rows.push({paper: p, n, raw, score});
  }
  return rows;
}
// Every paper in the publication window, sorted, with its global rank.
export function rankPapers(D, ps, pe, cs, ce) {
  const rows = scoreRows(D, ps, pe, cs, ce).sort(compare);
  rows.forEach((row, i) => row.rank = i + 1);
  return rows;
}
export function matchPapers(D, rows, query) {
  const q = queryText(query), text = searchText(D);
  return q ? rows.filter(row => text[row.n].includes(q)) : rows;
}
function insertSorted(list, row) {
  let i = list.length;
  while (i && compare(list[i-1], row) > 0) i--;
  list.splice(i, 0, row);
}
// One paper's rank and its k neighbors on each side, in a single pass without sorting.
export function paperRank(D, target, ps, pe, cs, ce, k = 3) {
  const rows = scoreRows(D, ps, pe, cs, ce), me = rows.find(row => row.paper === target);
  if (!me) return null;
  let rank = 1; const above = [], below = [];
  for (const row of rows) {
    if (row === me) continue;
    if (compare(row, me) < 0) {
      rank++;
      if (above.length < k || compare(row, above[0]) > 0) { insertSorted(above, row); if (above.length > k) above.shift(); }
    } else if (below.length < k || compare(row, below.at(-1)) < 0) { insertSorted(below, row); if (below.length > k) below.pop(); }
  }
  const nearby = [...above, me, ...below];
  nearby.forEach((row, i) => row.rank = rank - above.length + i);
  return {row: me, rank, total: rows.length, nearby};
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
export function rankingCards(rows, onOpen) {
  const grid = el('ol', undefined, 'ranking-cards');
  rows.forEach((row, i) => {
    const card = el('li', undefined, 'ranking-card'), stats = el('div', undefined, 'card-stats');
    for (const [value, label, cls] of [[fmt(row.raw),'citations','count'],[row.score.toFixed(3),'score','score']]) {
      const stat = el('div', undefined, cls); stat.append(el('strong', value), el('span', t(label))); stats.append(stat);
    }
    const title = paperLink(row.paper); title.className = 'card-title';
    card.append(el('div', '#' + fmt(row.rank ?? i + 1), 'card-rank'), title, el('div', row.paper[0] + ' · v1 ' + row.paper[1], 'paper-meta'), stats);
    const button = el('button', t('viewRank')), history = el('div', undefined, 'card-history');
    button.type = 'button'; button.onclick = () => onOpen(row.paper); history.append(button); card.append(history);
    card.onclick = e => { if (!e.target.closest('a, button')) onOpen(row.paper); };
    grid.append(card);
  });
  return grid;
}
export function rankingTable(rows, selectedId = '', onOpen = null) {
  const wrap = el('div', undefined, 'table-wrap ranking-wrap'), table = el('table', undefined, 'ranking-table');
  const header = el('thead'), headRow = el('tr');
  const columns = [['rank','rank-cell'],['paper','paper-cell'],['citations','count-cell'],['score','score-cell']];
  if (onOpen) columns.push(['','history-cell']);
  for (const [label, cls] of columns) headRow.append(el('th', label && t(label), cls));
  header.append(headRow); table.append(header);
  const body = el('tbody');
  rows.forEach((row, i) => {
    const tr = el('tr');
    if (row.paper[0] === selectedId) { tr.className = 'me'; tr.setAttribute('aria-current', 'true'); }
    const paper = el('td', undefined, 'paper-cell');
    paper.append(paperLink(row.paper), el('div', row.paper[0] + ' · v1 ' + row.paper[1], 'paper-meta'));
    const count = el('td', fmt(row.raw), 'count-cell'), score = el('td', row.score.toFixed(3), 'score-cell');
    count.dataset.label = t('citations'); score.dataset.label = t('score');
    tr.append(el('td', fmt(row.rank), 'rank-cell'), paper, count, score);
    if (onOpen) {
      const cell = el('td', undefined, 'history-cell');
      if (row.paper[0] !== selectedId) {
        const button = el('button', t('viewRank')); button.type = 'button'; button.onclick = () => onOpen(row.paper); cell.append(button);
      }
      tr.append(cell);
    }
    body.append(tr);
  });
  table.append(body); wrap.append(table); return wrap;
}
