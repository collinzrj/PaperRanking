import {$, t, fmt, el, initLanguage, initDates, updateDates, validBounds, bounds, rankPapers, snapshot, loadData, showLoadError, normalize, queryText, paperLink, rankingTable} from './common.js?v=20261106-1';
let D, selected, timer, rows = [], rankKey = '';
initLanguage(() => { if (D) { showCandidates(); render(); } });
function showCandidates() {
  const box = $('candidates'), query = queryText($('query').value); box.replaceChildren(); $('candidate-status').textContent = '';
  if (!query || selected) return;
  const hits = []; let count = 0;
  for (const p of D.papers) if (normalize(p[0] + ' ' + p[2]).includes(query)) { count++; if (hits.length < 20) hits.push(p); }
  // Prefer an exact ID when multiple titles also contain the same digits.
  hits.sort((a,b) => Number(b[0] === query) - Number(a[0] === query));
  $('candidate-status').textContent = count ? t('candidates',{count:fmt(count),shown:hits.length}) : t('searchEmpty');
  for (const p of hits) {
    const button = el('button', p[2], 'candidate'); button.type = 'button';
    button.append(el('small', p[0] + ' · v1 ' + p[1]));
    button.onclick = () => { selected = p; $('query').value = p[0]; box.replaceChildren(); $('candidate-status').textContent = ''; render(); };
    box.append(button);
  }
}
function schedule() { clearTimeout(timer); timer = setTimeout(render,180); }
function render() {
  if (!D) return;
  snapshot(D); updateDates(D); const container = $('result'); container.replaceChildren();
  if (!validBounds(D)) { $('error').textContent = t('invalid'); return; }
  $('error').textContent = '';
  if (!selected) { container.append(el('p', t('choose'), 'empty')); return; }
  const b = bounds(), card = el('section', undefined, 'selected'), title = el('h2'); title.append(paperLink(selected));
  card.append(el('p',t('selected'),'hint'),title,el('p',selected[0] + ' · v1 ' + selected[1],'muted'));
  const change = el('button',t('change')); change.onclick = () => { selected = null; $('query').focus(); showCandidates(); render(); }; card.append(change);
  container.append(card);
  if (selected[1] < b['paper-start'] || selected[1] > b['paper-end']) {
    card.append(el('p',t('outside',{date:selected[1]}),'outside'));
    const include = el('button',t('include'));
    include.onclick = () => {
      if (selected[1] < $('paper-start').value) $('paper-start').value = selected[1];
      if (selected[1] > $('paper-end').value) $('paper-end').value = selected[1]; render();
    };
    card.append(include); return;
  }
  const key = JSON.stringify(b);
  if (key !== rankKey) {
    rows = rankPapers(D,b['paper-start'],b['paper-end'],b['citation-start'],b['citation-end']); rankKey = key;
  }
  const index = rows.findIndex(r => r.paper[0] === selected[0]);
  if (index < 0) { card.append(el('p',t('noPopulation'),'empty')); return; }
  const target = rows[index];
  card.append(el('p',t('position',{rank:fmt(index+1),total:fmt(rows.length)}),'position'));
  card.append(el('p',t('percentile',{percent:((rows.length-index-1)/rows.length*100).toFixed(2)}),'muted'));
  const metrics = el('div',undefined,'metrics');
  for (const [value, label] of [[fmt(target.raw),'citations'],[target.score.toFixed(3),'score']]) {
    const metric = el('div',undefined,'metric'); metric.append(el('strong',value),el('span',t(label))); metrics.append(metric);
  }
  card.append(metrics,el('p',t('rangeSummary',{ps:b['paper-start'],pe:b['paper-end'],cs:b['citation-start'],ce:b['citation-end']}),'hint'));
  const start = Math.max(0,index-3), end = Math.min(rows.length,index+4);
  container.append(el('h2',t('nearby')),rankingTable(rows.slice(start,end),start,selected[0]));
}
(async () => {
  try {
    D = await loadData(); initDates(D,schedule);
    $('query').addEventListener('input', () => {
      selected = null; clearTimeout(timer); timer = setTimeout(() => { showCandidates(); render(); },180);
    });
    $('loading').hidden = true; $('app').hidden = false;
    const id = queryText(new URLSearchParams(location.search).get('id') || '');
    if (id) { $('query').value = id; selected = D.papers.find(p => p[0] === id); if (!selected) showCandidates(); }
    render();
  } catch (error) { showLoadError(error); }
})();
