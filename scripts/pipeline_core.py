"""Standard-library acquisition primitives for the incremental data updater."""
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import gzip
import hashlib
import json
from pathlib import Path
import random
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path('data/five-years')
START = '2021-09-01'
END = None  # Set to the requested exclusive cutoff by update_data.py.
OAI = 'https://oaipmh.arxiv.org/oai'
S2 = 'https://api.semanticscholar.org/graph/v1'
NS = {'o': 'http://www.openarchives.org/OAI/2.0/', 'a': 'http://arxiv.org/OAI/arXivRaw/'}
FIELDS = 'externalIds,title,references.externalIds,references.title,references.year,referenceCount'


def arxiv_id(value):
    value = re.sub(r"^(?:https?://arxiv.org/abs/|arxiv:)", "", value.strip(), flags=re.I)
    value = re.sub(r"v\d+$", "", value)
    if not re.fullmatch(r"(?:\d{4}\.\d{4,5}|[a-zA-Z.-]+/\d{7})", value):
        raise ValueError(f"Invalid arXiv ID: {value!r}")
    return value

def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    temp.replace(path)

class Client:
    def __init__(self, interval, key=None):
        self.interval = interval
        self.key = key
        self.last = 0
        self.blocked_until = 0
        self.lock = threading.Lock()

    def wait_turn(self):
        while True:
            with self.lock:
                now = time.monotonic()
                delay = max(self.last + self.interval, self.blocked_until) - now
                if delay <= 0:
                    self.last = now
                    return now
            time.sleep(min(delay, 1))

    def request(self, url, body=None):
        # A repeatedly throttled individual source can be explicitly excluded;
        # batch requests retain the longer retry budget and are never discarded.
        attempts = 5 if '/references?' in url else 9
        for attempt in range(attempts):
            self.wait_turn()
            headers = {"User-Agent": "arxiv-cs-rankings/1.0", "Accept-Encoding": "gzip"}
            if self.key:
                headers["x-api-key"] = self.key
            if body is not None:
                headers["Content-Type"] = "application/json"
            req = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(), headers=headers)
            try:
                with urllib.request.urlopen(req, timeout=120) as response:
                    data = response.read()
                    if response.headers.get("Content-Encoding") == "gzip":
                        data = gzip.decompress(data)
                    return data
            except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
                status = getattr(exc, "code", None)
                if status is not None and status not in (429, 500, 502, 503, 504):
                    raise
                if attempt == attempts - 1:
                    raise
                retry = getattr(exc, "headers", {}).get("Retry-After", "0")
                try:
                    retry = float(retry)
                except ValueError:
                    retry = max(0, parsedate_to_datetime(retry).timestamp() - time.time())
                delay = max(retry, min(300, 2 ** attempt * 2)) + random.random()
                with self.lock:
                    self.blocked_until = max(self.blocked_until, time.monotonic() + delay)
                print(f"Retry status={status}: waiting {delay:.1f}s", flush=True)
                time.sleep(delay)

    def json(self, url, body=None):
        return json.loads(self.request(url, body))

def parse_oai(raw):
    root = ET.fromstring(raw)
    error = root.find("o:error", NS)
    if error is not None:
        if error.get("code") == "noRecordsMatch":
            return [], None
        raise RuntimeError(f"OAI {error.get('code')}: {error.text}")
    nodes = []
    for record in root.findall(".//o:record", NS):
        if record.find("o:header", NS).get("status") == "deleted":
            continue
        node = record.find("o:metadata/a:arXivRaw", NS)
        if node is None:
            raise ValueError("Missing arXivRaw metadata")
        categories = node.findtext("a:categories", namespaces=NS).split()
        if not any(c.startswith("cs.") for c in categories):
            continue
        v1 = node.find("a:version[@version='v1']/a:date", NS)
        if v1 is None:
            raise ValueError("Missing explicit v1 date")
        created = parsedate_to_datetime(v1.text).astimezone(timezone.utc).date()
        nodes.append((arxiv_id(node.findtext("a:id", namespaces=NS)), created,
                      " ".join(node.findtext("a:title", namespaces=NS).split()), categories))
    return nodes, root.findtext(".//o:resumptionToken", namespaces=NS) or None

def batch(client, ids):
    return client.json(S2 + "/paper/batch?" + urllib.parse.urlencode({"fields": FIELDS}),
                       {"ids": ["ARXIV:" + i for i in ids]})

def paginated_references(client, identifier):
    refs, offset = [], 0
    while True:
        fields = "externalIds,title,year"
        url = S2 + "/paper/ARXIV:" + urllib.parse.quote(identifier, safe="") + "/references?" + urllib.parse.urlencode(
            {"fields": fields, "limit": 1000, "offset": offset})
        try:
            page = client.json(url)
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return None
            if exc.code == 429:
                print(f'Unresolved S2 source after repeated HTTP 429: {identifier}', flush=True)
                return {'references': [], '_unresolved_http': 429, 'requested_id': identifier}
            raise
        refs.extend(r["citedPaper"] for r in page["data"] if r.get("citedPaper"))
        if page.get("next") is None:
            return {"references": refs}
        offset = page["next"]

def write_gzip(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix+'.tmp')
    with gzip.open(temp, 'wt', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, separators=(',', ':'))
    temp.replace(path)

def read_gzip(path):
    with gzip.open(path, 'rt', encoding='utf-8') as file:
        return json.load(file)

def load_nodes():
    return read_gzip(ROOT/'papers.json.gz')

def ingest(nodes, raw):
    records, token = parse_oai(raw)
    xml = ET.fromstring(raw)
    for record in xml.findall('.//o:record',NS):
        header=record.find('o:header',NS)
        identifier=header.findtext('o:identifier',namespaces=NS)
        node=record.find('o:metadata/a:arXivRaw',NS)
        categories=node.findtext('a:categories',default='',namespaces=NS).split() if node is not None else []
        if identifier and (header.get('status')=='deleted' or not any(c.startswith('cs.') for c in categories)):
            nodes.pop(identifier.removeprefix('oai:arXiv.org:'),None)
    for i, d, title, categories in records:
        if START <= str(d) < END:
            nodes[i] = [str(d), title, categories]
    return token

def harvest_interval(client, name, start, until):
    directory = ROOT/'oai'/name
    directory.mkdir(parents=True, exist_ok=True)
    state_path = directory/'state.json'
    state = json.loads(state_path.read_text()) if state_path.exists() else {'token':None,'pages':0,'complete':False}
    while not state['complete']:
        params = {'verb':'ListRecords','resumptionToken':state['token']} if state['token'] else {
            'verb':'ListRecords','metadataPrefix':'arXivRaw','set':'cs','from':start,'until':until}
        url = OAI+'?'+urllib.parse.urlencode(params)
        raw = client.request(url)
        try:
            records, token = parse_oai(raw)
        except RuntimeError as exc:
            if 'badResumptionToken' in str(exc) and state['token']:
                # Restart at the last datestamp, never infer first-submission dates from it.
                start = state.get('last_datestamp', start)
                state['token'] = None
                continue
            raise
        xml = ET.fromstring(raw)
        stamps = [n.text for n in xml.findall('.//o:header/o:datestamp',NS)]
        page = directory/(hashlib.sha256(url.encode()).hexdigest()+'.xml.gz')
        temp = page.with_suffix('.tmp')
        temp.write_bytes(gzip.compress(raw))
        temp.replace(page)
        state.update(token=token,pages=state['pages']+1,complete=token is None,
                     last_datestamp=max(stamps) if stamps else state.get('last_datestamp',start))
        save_json(state_path,state)
        print(f"OAI {name}: page={state['pages']} updated_through={state['last_datestamp']} records={len(records)}",flush=True)

def source_record(source,paper):
    if paper and paper.get('_unresolved_http'):
        return {'id':source,'status':'unresolved','targets':[],'reference_count':0,
                'http_status':paper['_unresolved_http']}
    if paper is None:
        return {'id':source,'status':'missing','targets':[],'reference_count':0}
    returned = (paper.get('externalIds') or {}).get('ArXiv')
    if returned and arxiv_id(returned) != source:
        return {'id':source,'status':'id_mismatch','returned_id':returned,'targets':[],
                'reference_count':len(paper.get('references') or [])}
    refs = paper.get('references')
    if not isinstance(refs,list):
        raise ValueError(f'Missing references for {source}')
    targets = set()
    for ref in refs:
        target = (ref.get('externalIds') or {}).get('ArXiv')
        if target:
            target=arxiv_id(target)
            if target != source:
                targets.add(target)
    return {'id':source,'status':'ok','targets':sorted(targets),'reference_count':len(refs)}

def complete_batch(client, ids):
    try:
        papers=batch(client,ids)
    except urllib.error.HTTPError as exc:
        if exc.code not in (400,413,422):
            raise
        if exc.code == 400:
            try:
                error = json.loads(exc.read()).get('error')
            except (ValueError, AttributeError):
                error = None
            # These are already validated arXiv IDs. S2 uses this exact error
            # when none resolve to S2 records, rather than returning null slots.
            if error == 'No valid paper ids given' and all(arxiv_id(i) == i for i in ids):
                print(f'S2 has no indexed records for {len(ids)} requested arXiv IDs', flush=True)
                return [None] * len(ids)
        if len(ids)>1:
            middle=len(ids)//2
            return complete_batch(client,ids[:middle])+complete_batch(client,ids[middle:])
        return [paginated_references(client,ids[0])]
    if not isinstance(papers,list) or len(papers)!=len(ids):
        # Some recent batches omit a source instead of returning its null slot.
        # Reorder only when every returned ArXiv ID proves a unique membership.
        mapped = {}
        if isinstance(papers, list):
            for paper in papers:
                returned = (paper.get('externalIds') or {}).get('ArXiv') if paper else None
                identifier = arxiv_id(returned) if returned else None
                if identifier not in ids or identifier in mapped:
                    mapped = None
                    break
                mapped[identifier] = paper
        else:
            mapped = None
        if mapped is not None:
            print(f'S2 short batch: {len(papers)}/{len(ids)}; resolving omitted sources individually', flush=True)
            papers = [mapped[i] if i in mapped else paginated_references(client, i) for i in ids]
        elif len(ids) > 1:
            middle = len(ids)//2
            return complete_batch(client,ids[:middle])+complete_batch(client,ids[middle:])
        else:
            return [paginated_references(client,ids[0])]
    bad=[n for n,p in enumerate(papers) if p and not p.get('_unresolved_http') and
         (not isinstance(p.get('references'),list) or (p.get('referenceCount') or 0)>len(p['references']))]
    total=sum(len(p.get('references') or []) for p in papers if p)
    if bad and total>=9900 and len(ids)>1:
        middle=len(ids)//2
        return complete_batch(client,ids[:middle])+complete_batch(client,ids[middle:])
    for n in bad:
        fallback=paginated_references(client,ids[n])
        if fallback is not None:
            fallback['externalIds']=papers[n].get('externalIds')
        papers[n]=fallback
    return papers
