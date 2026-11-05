import {$, t, fmt, el, initLanguage, initDates, updateDates, validBounds, bounds, rankPapers, snapshot, loadData, showLoadError, rankingTable} from './common.js?v=20261106-1';
let D, rows = [], current = null, resultKey = '', timer, detailRow;
initLanguage(() => { if (D) { render(); if ($('detail').open && detailRow) showDetail(detailRow); } });
function schedule() { clearTimeout(timer); timer = setTimeout(render, 180); }
function citationChart(row, days, width = 160, height = 36) {
  const counts = new Map();
  for (let i = 0; i < row.paper[3].length; i += 2) counts.set(row.paper[3][i], row.paper[3][i+1]);
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
function selectedDays() {
  return D.days.map((d, i) => i).filter(i => D.days[i] >= current['citation-start'] && D.days[i] <= current['citation-end']);
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
  const query = $('paper-search').value, key = JSON.stringify([current, query]);
  if (key !== resultKey) {
    rows = rankPapers(D, current['paper-start'], current['paper-end'], current['citation-start'], current['citation-end'], query);
    resultKey = key;
  }
  const top = rows.slice(0,100), days = selectedDays();
  if (top.length) {
    const table = rankingTable(top, 0, '', showDetail);
    table.querySelectorAll('tbody .history-cell').forEach((cell,i) => cell.prepend(citationChart(top[i],days)));
    $('rankings').replaceChildren(table);
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
function showDetail(row) {
  detailRow = row;
  $('detail-title').textContent = row.paper[2]; $('detail-id').textContent = row.paper[0] + ' · v1 ' + row.paper[1];
  const counts = new Map(); for (let j=0; j<row.paper[3].length; j+=2) counts.set(row.paper[3][j],row.paper[3][j+1]);
  const table = el('table'), head = el('thead'), tr = el('tr');
  for (const key of ['date','citations','submissions','score']) tr.append(el('th',t(key)));
  head.append(tr); table.append(head); const body = el('tbody');
  for (const day of selectedDays()) {
    const n = counts.get(day) || 0, r = el('tr');
    for (const v of [D.days[day],fmt(n),fmt(D.denominators[day]),(n*1000/D.denominators[day]).toFixed(3)]) r.append(el('td',v));
    body.append(r);
  }
  table.append(body); $('detail-days').replaceChildren(citationChart(row,selectedDays(),700,160),table);
  if (!$('detail').open) $('detail').showModal();
}
function download() {
  const output = {
    paper_start: current['paper-start'], paper_end_inclusive: current['paper-end'],
    citation_start: current['citation-start'], citation_end_inclusive: current['citation-end'],
    search: $('paper-search').value, formula: 'sum(daily citations / daily CS submissions * 1000)',
    snapshot: D.report.generated_at, eligible: rows.length,
    top: rows.slice(0,100).map((r,i) => ({rank:i+1, arxiv_id:r.paper[0], v1_date:r.paper[1], title:r.paper[2], new_citations:r.raw, normalized_score:r.score})),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/json'}));
  const a = el('a'); a.href = url; a.download = 'arxiv-cs-rankings.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),5000);
}
(async () => {
  try {
    D = await loadData(); initDates(D, schedule);
    $('paper-search').addEventListener('input',schedule); $('download').onclick = download;
    $('close-detail').onclick = () => $('detail').close();
    $('loading').hidden = true; $('app').hidden = false; render();
  } catch (error) { showLoadError(error); }
})();
