"""Publish a completed local dataset and a content-versioned browser manifest."""
from datetime import datetime, timezone
import gzip
import hashlib
import json
from pathlib import Path
import shutil

PROJECT = Path(__file__).resolve().parents[1]
source = PROJECT / 'data/five-years/ranking-data-daily.json.gz'
with gzip.open(source, 'rt', encoding='utf-8') as stream:
    data = json.load(stream)
assert len(data['papers']) == data['report']['nodes']
assert sum(data['denominators']) == len(data['papers'])
assert sum(sum(p[3][1::2]) for p in data['papers']) == data['report']['cs_edges_within_five_years']
assert data['daily_coverage'], 'Rebuild with the incremental updater before publishing.'
blob = source.read_bytes()
manifest = {
    'file': 'ranking-data-daily.json.gz', 'sha256': hashlib.sha256(blob).hexdigest(),
    'bytes': len(blob), 'generated_at': data['report']['generated_at'],
    'requested_refresh_date': data['report']['refreshed_through'],
    'metadata_harvest_until_utc': data['report']['metadata_harvest_until_utc'],
    'latest_v1_date': data['days'][-1], 'range': data['range'],
    'papers': len(data['papers']), 'cs_edges': data['report']['cs_edges_within_five_years'],
    'unresolved_sources': data['report']['source_coverage_unresolved'],
}
(PROJECT / 'ranking-data-daily.json.gz').write_bytes(blob)
(PROJECT / 'dataset.json').write_text(json.dumps(manifest,indent=2)+'\n')
mirror = PROJECT / 'PaperRanking'
mirror.mkdir(exist_ok=True)
for name in ['index.html','paper.html','app.js','common.js','style.css','dataset.json','ranking-data-daily.json.gz','README.md','.nojekyll']:
    shutil.copy2(PROJECT / name,mirror / name)
print(json.dumps(manifest,indent=2))
