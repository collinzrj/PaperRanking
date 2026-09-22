# arXiv CS citation growth pilot

One cited-paper quarter at a time. Nodes and first-submission dates come from
arXiv OAI-PMH; references come from Semantic Scholar Graph API. No S2 datasets,
non-arXiv entity matching, graph database, or full historical edge backfill.

## Run

Requires Python 3.10+ and DuckDB.

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
export SEMANTIC_SCHOLAR_API_KEY='your-key'
.venv/bin/python trending.py probe --window-end 2026-09-01
.venv/bin/python trending.py run --quarter 2025Q4 --window-end 2026-09-01 --months 3 --top 20 --batch-size 50
```

Alternatively pass `--key-file /path/to/key`. Keys are never saved in caches.
Without a key the public API is attempted, with the same conservative rate limit;
availability is not guaranteed. If system Python lacks ensurepip, use
`python3 -m pip --python .venv/bin/python install -r requirements.txt` after
creating the environment without pip.

Use `--s2-interval 3.1` to lower the request rate on a throttled public endpoint.
Batch sizes up to 200 are supported; the default is 20. Live size probes verified
50, 100, and 200 papers. A counter discrepancy in the 200-paper probe was checked
against the individual paginated endpoint, which returned the same 24 references
despite `referenceCount=25`.

`--window-end` is exclusive and must be the first day of a month. By default it
is the first day of the current month, so the default window contains the last
three complete months. Default cohort is 2025Q4, with Top 20 output.

Commands `harvest`, `fetch`, and `rank` also run separately. Repeat the same
command after interruption to resume. Use a different `--data-dir` for a different
quarter or window. The process is a single writer; do not run two commands against
the same directory concurrently. Stop after the first quarter and inspect the
ranking before expanding scope.

## Data and calculation

- IDs lose their `vN` suffix before storage, including old `cs/NNNNNNN` IDs.
- Dates come specifically from `arXivRaw/version[@version='v1']/date`, in UTC.
  The simpler `arXiv/created` field did not match v1 in a live sample.
- The OAI `cs` set includes cross-listed papers; metadata must contain a `cs.*`
  category. OAI `from` selects metadata updates, not first submissions. Harvest
  starts at the earlier of the cohort/window starts and follows all pages to the
  current endpoint, then filters on v1 dates. This captures older submissions
  revised after the selected window. Deleted records have no usable metadata.
- Fetch references for **all CS citing papers in the window**, not just papers
  in the target quarter. Monthly denominators include missing S2 papers too.
- Probe `/paper/batch` using two known papers and nested
  `references.externalIds,title,year`. Fetch in batches of 20. If unsupported,
  rejected for size, or apparently truncated according to `referenceCount`,
  use the paginated `/paper/{id}/references` endpoint. No second lookup is made
  to resolve a cited paper's metadata.
- Keep references with `externalIds.ArXiv` that join to a CS node in the target
  v1 quarter. Each `(source,target)` pair counts once. The same paper cannot cite
  itself as another version. Other author self-citations remain included.
- An edge is timestamped with the **citing paper's v1 month**. This is a proxy:
  S2 exposes current references, and a later revision may have added a reference.
- For target `p`, rank descending by
  `sum_m(1000 * new_edges(p,m) / all_CS_submissions(m))`, then raw new edges,
  then arXiv ID. The factor 1000 only changes display units. Output retains each
  month's counts, denominators, and raw window count. This measures normalized
  window growth, not a second derivative or acceleration versus a prior window.
- Up to four S2 responses may be in flight, but a shared limiter spaces all
  request starts at least 1.05 seconds apart; OAI requests 3.1 seconds apart.
  Transient failures and HTTP 429 use exponential backoff with jitter and respect
  `Retry-After` across all workers. Exhausted retries stop the run while preserving checkpoints.
  S2 null/404 records are reported as missing, not hidden as successful fetches.

## Artifacts

Under `data/pilot/`:

- `ranking.json`: Top N, formula, monthly counts, coverage, and limitations.
- `pilot.duckdb`: `nodes`, deduplicated target-cohort `edges`, and `fetched` status.
- `batch-probe.json`: real probe response and support result.
- `oai-state.json`, `config.json`: resumable harvest and fixed pilot scope.
- `oai/*.xml.gz`, `s2/*.json`: raw responses for audit/reprocessing.

`rank` refuses to publish while OAI pagination is unfinished, any source is
unattempted, or a month has no submissions. API success does not establish
reference completeness: examine monthly S2 missing/empty-reference rates before
interpreting the signal. No assertion of statistical significance is made.

## Tests

```sh
.venv/bin/python -m unittest -v
```

Tests cover v1 selection, CS cross-listing, ID normalization, quarter boundaries,
reference pagination, 429 backoff, deduplication, target filtering, and monthly
normalization including missing S2 sources in the denominator.
# PaperRanking
# PaperRanking
