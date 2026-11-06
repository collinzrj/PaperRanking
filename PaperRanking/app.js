import {$, t, fmt, el, initLanguage, initDates, updateDates, validBounds, bounds, rankPapers, matchPapers, paperRank, queryText, paperLink, snapshot, loadData, showLoadError, rankingCards, rankingTable} from './common.js?v=20261106-5';
let D, ranked = [], rows = [], current = null, rankKey = '', timer, detailPaper = null, detailKey = '', detail = null;
initLanguage(() => { if (D) { render(); if ($('detail').open) renderDetail(); } });
function schedule(delay = 180) { clearTimeout(timer); timer = setTimeout(render, delay); }
function dateChanged(prefix) { if (prefix === 'detail-citation') renderDetail(); else { schedule(); if ($('detail').open) renderDetail(); } }
function citationChart(paper, days, width = 160, height = 36) {
  const counts = new Map();
  for (let i = 0; i < paper[3].length; i += 2) counts.set(paper[3][i], paper[3][i+1]);
  const values = days.map(i => (counts.get(i) || 0) * 1000 / D.denominators[i]);
  const max = Math.max(0.000001, ...values), ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.classList.add('citation-chart');
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', t('trend'));
  const line = document.createElementNS(ns, 'polyline');
  line.setAttribute('points', values.map((v,i) => `${values.length === 1 ? width/2 : 2+i*(width-4)/(values.length-1)},${height-2-v/max*(height-4)}`).join(' '));
  line.setAttribute('fill', 'none'); line.setAttribute('stroke', '#087e75');
  line.setAttribute('stroke-width', '2'); line.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.append(line); return svg;
}
function selectedDays(start, end) {
  return D.days.map((d, i) => i).filter(i => D.days[i] >= start && D.days[i] <= end);
}
function coverage(days) {
  const container = $('coverage'); container.replaceChildren();
  if (!D.daily_coverage) { container.append(el('p', t('coverageOld'), 'hint')); return; }
  const months = new Map();
  for (const day of days) {
    const month = D.days[day].slice(0,7), c = D.daily_coverage[day] || {};
    if (!months.has(month)) months.set(month, {submissions:0,ok:0,missing:0,id_mismatch:0,unresolved:0,empty_references:0});
    const sum = months.get(month); sum.submissions += D.denominators[day];
    for (const key of ['ok','missing','id_mismatch','unresolved','empty_references']) sum[key] += c[key] || 0;
  }
  const table = el('table', undefined, 'coverage-table'), head = el('thead'), tr = el('tr');
  for (const key of ['month','submissions','ok','missing','mismatch','unresolved','emptyRefs']) tr.append(el('th',t(key)));
  head.append(tr); table.append(head); const body = el('tbody');
  for (const [month, c] of months) {
    const row = el('tr');
    for (const v of [month,c.submissions,c.ok,c.missing,c.id_mismatch,c.unresolved,c.empty_references]) row.append(el('td', typeof v === 'number' ? fmt(v) : v));
    body.append(row);
  }
  table.append(body); container.append(table);
}
function render() {
  if (!D) return;
  snapshot(D); updateDates(D);
  if (!validBounds(D)) {
    $('error').textContent = t('invalid'); $('download').disabled = true;
    $('rankings').replaceChildren(); $('coverage').replaceChildren();
    for (const id of ['eligible','sources','matched','citations']) $(id).textContent = '—';
    $('result-label').textContent = ''; $('result-subtitle').textContent = ''; return;
  }
  $('error').textContent = ''; $('download').disabled = false; current = bounds();
  const key = JSON.stringify(current);
  if (key !== rankKey) {
    ranked = rankPapers(D, current['paper-start'], current['paper-end'], current['citation-start'], current['citation-end']);
    rankKey = key;
  }
  rows = matchPapers(D, ranked, $('paper-search').value);
  const top = rows.slice(0,100), days = selectedDays(current['citation-start'], current['citation-end']);
  if (top.length) {
    const cards = rankingCards(top, openPaper);
    cards.querySelectorAll('.card-history').forEach((cell,i) => cell.prepend(citationChart(top[i].paper,days)));
    $('rankings').replaceChildren(cards);
  } else $('rankings').replaceChildren(el('p',t('empty'),'empty'));
  $('eligible').textContent = fmt(rows.length);
  const submissions = days.reduce((s,i) => s + D.denominators[i], 0);
  $('sources').textContent = fmt(submissions);
  $('matched').textContent = D.daily_coverage ? (submissions ? days.reduce((s,i) => s + (D.daily_coverage[i]?.ok || 0),0) * 100 / submissions : 0).toFixed(2) + '%' : '—';
  $('citations').textContent = fmt(rows.reduce((s,r) => s + r.raw,0));
  $('result-label').textContent = t('ranking', {count: top.length});
  $('result-subtitle').textContent = t('resultWindow', {start: current['citation-start'], end: current['citation-end']});
  coverage(days);
}
// The dialog starts from the leaderboard's citation window, then keeps its own.
function openPaper(paper) {
  if (!$('detail').open) {
    $('detail-citation-start').value = $('citation-start').value; $('detail-citation-end').value = $('citation-end').value;
  }
  detailPaper = paper; renderDetail();
  if (!$('detail').open) $('detail').showModal();
  $('detail').scrollTop = 0;
  const url = new URL(location.href); url.searchParams.set('paper', paper[0]); history.replaceState(null, '', url);
}
function renderDetail() {
  if (!detailPaper) return;
  const p = detailPaper, result = $('detail-result'), title = $('detail-title');
  title.replaceChildren(paperLink(p)); $('detail-id').textContent = p[0] + ' · v1 ' + p[1];
  updateDates(D); result.replaceChildren();
  const ps = $('paper-start').value, pe = $('paper-end').value;
  $('detail-population').textContent = t('population', {ps, pe});
  if (!validBounds(D, ['paper', 'detail-citation'])) { $('detail-error').textContent = t('invalid'); return; }
  $('detail-error').textContent = '';
  if (p[1] < ps || p[1] > pe) {
    const include = el('button', t('include')); include.type = 'button';
    include.onclick = () => {
      if (p[1] < ps) $('paper-start').value = p[1];
      if (p[1] > pe) $('paper-end').value = p[1];
      render(); renderDetail();
    };
    result.append(el('p', t('outside', {date: p[1]}), 'outside'), include); return;
  }
  const cs = $('detail-citation-start').value, ce = $('detail-citation-end').value, key = JSON.stringify([p[0], ps, pe, cs, ce]);
  if (key !== detailKey) { detail = paperRank(D, p, ps, pe, cs, ce); detailKey = key; }
  const {row, rank, total, nearby} = detail, days = selectedDays(cs, ce);
  const summary = el('div', undefined, 'detail-summary'), position = el('div', undefined, 'detail-position');
  position.append(el('strong', t('position', {rank: fmt(rank), total: fmt(total)})),
    el('span', t('percentile', {percent: (Math.floor((total - rank) / total * 10000) / 100).toFixed(2)})));
  summary.append(position);
  for (const [value, label] of [[fmt(row.raw),'citations'],[row.score.toFixed(3),'score']]) {
    const metric = el('div', undefined, 'metric'); metric.append(el('strong', value), el('span', t(label))); summary.append(metric);
  }
  const daily = el('details'), counts = new Map();
  for (let j = 0; j < p[3].length; j += 2) counts.set(p[3][j], p[3][j+1]);
  const table = el('table'), head = el('thead'), tr = el('tr'), body = el('tbody');
  for (const key of ['date','citations','submissions','score']) tr.append(el('th',t(key)));
  head.append(tr); table.append(head);
  for (const day of days) {
    const n = counts.get(day) || 0, r = el('tr');
    for (const v of [D.days[day],fmt(n),fmt(D.denominators[day]),(n*1000/D.denominators[day]).toFixed(3)]) r.append(el('td',v));
    body.append(r);
  }
  table.append(body);
  const scroll = el('div', undefined, 'daily-table'); scroll.append(table);
  daily.append(el('summary', t('details')), scroll);
  result.append(summary, citationChart(p, days, 700, 160), el('h3', t('nearby')), rankingTable(nearby, p[0], openPaper), daily);
}
function download() {
  const output = {
    paper_start: current['paper-start'], paper_end_inclusive: current['paper-end'],
    citation_start: current['citation-start'], citation_end_inclusive: current['citation-end'],
    search: $('paper-search').value, formula: 'sum(daily citations / daily CS submissions * 1000)',
    snapshot: D.report.generated_at, eligible: rows.length,
    top: rows.slice(0,100).map(r => ({rank:r.rank, arxiv_id:r.paper[0], v1_date:r.paper[1], title:r.paper[2], new_citations:r.raw, normalized_score:r.score})),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/json'}));
  const a = el('a'); a.href = url; a.download = 'arxiv-cs-rankings.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),5000);
}
const byId = id => D.papers.find(p => p[0] === id);
(async () => {
  try {
    D = await loadData(); initDates(D, dateChanged);
    // Searching scans every title, so wait until typing pauses. Enter searches now, or opens an exact arXiv ID.
    $('paper-search').addEventListener('input',() => schedule(1000));
    $('paper-search').addEventListener('keydown',e => {
      if (e.key !== 'Enter') return;
      const paper = byId(queryText($('paper-search').value));
      if (paper) openPaper(paper); else schedule(0);
    });
    $('download').onclick = download;
    $('close-detail').onclick = () => $('detail').close();
    $('detail').addEventListener('close', () => {
      detailPaper = null; const url = new URL(location.href); url.searchParams.delete('paper'); history.replaceState(null, '', url);
    });
    $('loading').hidden = true; $('app').hidden = false; render();
    const id = new URLSearchParams(location.search).get('paper');
    if (id) { const paper = byId(queryText(id)); if (paper) openPaper(paper); else { $('paper-search').value = id; render(); } }
  } catch (error) { showLoadError(error); }
})();
