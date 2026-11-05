"""Incrementally refresh OAI metadata and S2 references, preserving local caches."""
import argparse
from collections import Counter, defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
import gzip
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import urllib.error

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT))
os.chdir(PROJECT)
import pipeline_core as graph
from pipeline_core import Client, save_json

ROOT = graph.ROOT

def read_key():
    key = os.environ.get('SEMANTIC_SCHOLAR_API_KEY')
    env = PROJECT / '.env'
    if not key and env.exists():
        for line in env.read_text().splitlines():
            name, sep, value = line.strip().removeprefix('export ').partition('=')
            if sep and name.strip() == 'SEMANTIC_SCHOLAR_API_KEY':
                key = value.strip().strip('\"\'')
    return key

def metadata(today):
    old = json.loads((ROOT / 'metadata.json').read_text())
    # OAI rejects a date later than the current UTC date (Shanghai is UTC+8).
    until = min(today, datetime.now(timezone.utc).date().isoformat())
    if until < old.get('harvest_until', old['updated_at'][:10]):
        raise ValueError('The requested cutoff precedes the existing metadata snapshot.')
    end = (date.fromisoformat(until) + timedelta(days=1)).isoformat()
    graph.END = end
    start = old.get('harvest_until', old['updated_at'][:10])
    name = f'update-{today}-through-{until}'
    archive = ROOT / 'snapshots' / today
    archive.mkdir(parents=True, exist_ok=True)
    for name_ in ['metadata.json', 'papers.json.gz', 'references-state.json', 'unresolved-s2-ids.json']:
        dest = archive / name_
        if not dest.exists():
            shutil.copy2(ROOT / name_, dest)
    print(f'OAI incremental harvest: {start} through {until} UTC (requested {today})', flush=True)
    graph.harvest_interval(Client(3.1), name, start, until)
    nodes = graph.load_nodes()
    before = len(nodes)
    directory = ROOT / 'oai' / name
    for path in sorted(directory.glob('*.xml.gz'), key=lambda p: p.stat().st_mtime):
        graph.ingest(nodes, gzip.decompress(path.read_bytes()))
    graph.write_gzip(ROOT / 'papers.json.gz', nodes)
    months = Counter(v[0][:7] for v in nodes.values())
    save_json(ROOT / 'metadata.json', {
        'complete': True, 'v1_start': old['v1_start'], 'v1_end_exclusive': end,
        'nodes': len(nodes), 'monthly_submissions': dict(sorted(months.items())),
        'partial_months': [until[:7]], 'harvest_until': until,
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'latest_v1_date': max(v[0] for v in nodes.values()),
    })
    print(f'Metadata complete: {len(nodes):,} CS papers ({len(nodes)-before:+,})', flush=True)

def references(today):
    key = read_key()
    if not key:
        print('Using public S2 access at a conservative rate; 429 responses use exponential backoff.', flush=True)
    nodes = graph.load_nodes()
    seen, coverage = set(), Counter()
    for path in (ROOT / 'references').glob('*.json.gz'):
        for row in graph.read_gzip(path):
            if row['id'] in nodes:
                seen.add(row['id'])
                coverage[row['status']] += 1
    ignored = set(json.loads((ROOT / 'unresolved-s2-ids.json').read_text())) & nodes.keys()
    pending = sorted(nodes.keys() - seen - ignored)
    client = Client(1.1 if key else 3.1, key)
    print(f'S2 new sources: {len(pending):,}; previously skipped: {len(ignored):,}', flush=True)
    def retrieve(ids):
        name = hashlib.sha256(json.dumps(ids).encode()).hexdigest()
        raw_path = ROOT / 's2' / f'{name}.json.gz'
        cached = graph.read_gzip(raw_path) if raw_path.exists() else None
        if cached and cached.get('references_verified'):
            if cached['source_ids'] != ids:
                raise ValueError(f'Cache membership mismatch: {raw_path.name}')
            papers = cached['papers']
        else:
            papers = graph.complete_batch(client, ids)
            graph.write_gzip(raw_path, {'source_ids': ids, 'papers': papers, 'references_verified': True})
        if len(papers) != len(ids):
            raise ValueError('Cached batch response length mismatch')
        rows = [graph.source_record(i, p) for i, p in zip(ids, papers)]
        graph.write_gzip(ROOT / 'references' / f'{name}.json.gz', rows)
        return rows

    def batches():
        groups = iter(pending[n:n+200] for n in range(0, len(pending), 200))
        # Both workers share one rate limiter and all 429 cooldowns.
        with ThreadPoolExecutor(max_workers=2) as pool:
            jobs = deque()
            for _ in range(2):
                ids = next(groups, None)
                if ids:
                    jobs.append(pool.submit(retrieve, ids))
            while jobs:
                yield jobs.popleft().result()
                ids = next(groups, None)
                if ids:
                    jobs.append(pool.submit(retrieve, ids))

    completed = 0
    for rows in batches():
        completed += len(rows)
        for row in rows:
            seen.add(row['id'])
            coverage[row['status']] += 1
        save_json(ROOT / 'references-state.json', {
            'expected': len(nodes), 'completed': len(seen), 'complete': len(seen) == len(nodes),
            'coverage': dict(coverage), 'skipped': len(ignored),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        })
        print(f'S2 updated {completed:,}/{len(pending):,}', flush=True)
    print('Incremental references complete', flush=True)

def build(today):
    """Export exact-day aggregates and daily acquisition coverage for both pages."""
    meta = json.loads((ROOT / 'metadata.json').read_text())
    nodes = graph.load_nodes()
    days = sorted({p[0] for p in nodes.values()})
    idx = {d: i for i, d in enumerate(days)}
    denoms = Counter(p[0] for p in nodes.values())
    counts, daily = defaultdict(Counter), defaultdict(Counter)
    seen, newly_unresolved = set(), set()
    raw_edges = matched = 0
    for path in (ROOT / 'references').glob('*.json.gz'):
        for row in graph.read_gzip(path):
            source = row['id']
            if source not in nodes:
                continue
            if source in seen:
                raise ValueError(f'Duplicate source {source}')
            seen.add(source)
            day = nodes[source][0]
            daily[day][row['status']] += 1
            if row['status'] == 'unresolved':
                newly_unresolved.add(source)
            if row['status'] != 'ok':
                continue
            if row['reference_count'] == 0:
                daily[day]['empty_references'] += 1
            targets = set(row['targets'])
            raw_edges += len(targets)
            for target in targets:
                if target != source and target in nodes:
                    counts[target][idx[day]] += 1
                    matched += 1
    ignored = (set(json.loads((ROOT / 'unresolved-s2-ids.json').read_text())) & nodes.keys()) - seen
    pending = nodes.keys() - seen - ignored
    if pending:
        raise ValueError(f'{len(pending)} sources still need references; refusing to publish')
    for source in ignored:
        daily[nodes[source][0]]['unresolved'] += 1
    unresolved_count = sum(v['unresolved'] for v in daily.values())
    save_json(ROOT / 'unresolved-s2-ids-current.json', sorted(ignored | newly_unresolved))
    for day in days:
        if sum(daily[day][s] for s in ('ok','missing','id_mismatch','unresolved')) != denoms[day]:
            raise ValueError(f'Coverage mismatch {day}')
    rows = []
    for identifier, (d, title, _) in sorted(nodes.items()):
        sparse = [v for pair in sorted(counts.get(identifier, {}).items()) for v in pair]
        rows.append([identifier, d, title, sparse])
    report = {
        'generated_at': datetime.now(timezone.utc).isoformat(), 'refreshed_through': today,
        'metadata_harvest_until_utc': meta['harvest_until'],
        'nodes': len(nodes), 'sources_attempted': len(seen), 'arxiv_edges': raw_edges,
        'cs_edges_within_five_years': matched, 'source_coverage_complete': not unresolved_count,
        'source_coverage_unresolved': unresolved_count, 'metadata_complete': True,
        'excluded_id_mismatches': sum(v['id_mismatch'] for v in daily.values()),
        'missing_s2_sources': sum(v['missing'] for v in daily.values()),
        'reference_refresh_policy': 'Fetch newly discovered sources; preserve previous reference snapshots.',
    }
    payload = {'days': days, 'denominators': [denoms[d] for d in days],
               'daily_coverage': [dict(daily[d]) for d in days],
               'range': [meta['v1_start'], meta['v1_end_exclusive']],
               'partial_months': meta['partial_months'], 'report': report, 'papers': rows}
    graph.write_gzip(ROOT / 'ranking-data-daily.json.gz', payload)
    save_json(ROOT / 'final-audit-daily.json', report)
    print(f'Built {len(nodes):,} papers and {matched:,} CS edges', flush=True)

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('stage', choices=['metadata','references','build','all'])
    p.add_argument('--through', required=True, help='Inclusive UTC date (YYYY-MM-DD); current day remains partial.')
    args = p.parse_args()
    date.fromisoformat(args.through)
    for name, fn in [('metadata',metadata),('references',references),('build',build)]:
        if args.stage in (name, 'all'):
            fn(args.through)
