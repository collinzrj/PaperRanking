# arXiv CS Citation Rankings

Explore citation activity among arXiv computer-science papers using exact publication and citation date windows.

**[Leaderboard](https://collinzrj.github.io/PaperRanking/)** · **[Individual paper lookup](https://collinzrj.github.io/PaperRanking/paper.html)**

The website opens in English. Use the **中文 / English** button on either page to switch languages; your preference is saved in your browser. Paper titles remain in their original language.

## Features

- A global Top 100 across the selected publication window.
- Independent publication and citation date filters, including quick date presets.
- Case-insensitive title-phrase and arXiv ID search.
- Individual paper rank against **all** papers in the publication window, with exact neighboring ranks. Papers outside the window are clearly identified.
- Responsive paper cards on narrow screens and tables on larger screens.
- JSON export from the leaderboard and daily citation details.
- Compressed data downloaded once per snapshot, checked using SHA-256, and stored in browser Cache Storage. If storage is unavailable, loading still works. A small manifest identifies data updates.

## Data and interpretation

[dataset.json](dataset.json) records the published snapshot's timestamp, latest v1 submission date, corpus size, and citation edge count. The website also displays the actual data range and refresh timestamp.

- **Nodes and dates:** arXiv OAI-PMH `arXivRaw`; first-submission (`v1`) dates in UTC. Include papers with any `cs.*` category, including cross-listings. The historical corpus starts on September 1, 2021.
- **Edges:** Semantic Scholar Graph API references. Retain only references with an `externalIds.ArXiv` identifier, remove version suffixes, and keep CS targets present in the corpus. Deduplicate each source–target pair and exclude same-ID self-edges. Author self-citations are not removed.
- **Citation date:** the citing paper's arXiv v1 date. S2 may include references introduced in later revisions; this is an approximation of when a citation occurred.
- **Score:** sum of `daily citations / all arXiv CS submissions that day × 1,000` over the inclusive citation window. The date-level explorer uses daily normalization. Ties are resolved by raw citation count, then arXiv ID.
- **Incremental refresh:** harvest changed OAI records and fetch references for newly discovered sources. Previously cached references are retained, so this does not refresh every historical S2 record.
- **Coverage:** missing S2 records, ID mismatches, empty reference lists, and unresolved requests can lower counts. The 919 previously skipped sources remain excluded. New per-source reference requests that still return HTTP 429 after five attempts with exponential backoff are explicitly marked unresolved; entire failed batches are never skipped. The manifest and website report the current unresolved total. Recent dates are especially subject to indexing delays. This ranks citation activity; it does not directly measure acceleration.

A refresh requested in Asia/Shanghai can fall on the previous UTC date. arXiv also has publication delays. The latest v1 date is shown explicitly; a refresh does not imply that every submission from the current day is already public or indexed.

## Static hosting

The GitHub Pages publishing source is **main / root**. The repository root is the deployed site:

```text
index.html                    Leaderboard
paper.html                    Individual paper lookup
app.js, paper.js, common.js    Browser code and English/Chinese strings
style.css                     Shared responsive styles
dataset.json                  Snapshot metadata and content hash
ranking-data-daily.json.gz     Compressed dataset
scripts/                      Incremental refresh and publishing utilities
```

`PaperRanking/` is a synchronized compatibility copy of the static site. Update the root files first; `scripts/publish_snapshot.py` synchronizes this directory.

To serve locally (data loading requires HTTP, not a `file://` URL):

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`. The site needs a modern browser with gzip `DecompressionStream` support. It uses no server-side database, external JavaScript CDN, or browser API keys.

## Refreshing the dataset

The incremental updater uses only Python's standard library. It requires the existing local acquisition cache in `data/five-years/`, which is deliberately not committed. The public compressed snapshot alone does not contain raw source reference lists and cannot reconstruct that cache.

Provide a Semantic Scholar key through `SEMANTIC_SCHOLAR_API_KEY` or an untracked `.env` file. Never commit credentials. If no key is available, the updater can use the shared public API at a conservative rate; this is subject to throttling. Requests honor rate limits and use exponential backoff for HTTP 429 and transient server errors.

```bash
python3 scripts/update_data.py metadata --through 2026-11-06
python3 scripts/update_data.py references --through 2026-11-06
python3 scripts/update_data.py build --through 2026-11-06
python3 scripts/publish_snapshot.py
```

Use the desired refresh date in `--through`. Each acquisition stage is resumable. New source batches are cached as they complete; already excluded sources are not retried. The build refuses to publish if any sources still require references (apart from the explicit prior exclusion list). It checks daily coverage and preserves a metadata backup before updating.

Reference requests include `references.externalIds`, `references.title`, and `references.year` in the same batch response; there is no second lookup for target dates. Truncated batches are split or paginated as needed. If a batch omits a response slot, results are aligned only when every returned arXiv ID proves unique membership in the request; omitted sources are then fetched individually. The specific S2 batch error `No valid paper ids given` is recorded as not found when all requested arXiv IDs have been validated; other HTTP 400 errors still trigger splitting or individual retrieval. No Semantic Scholar full dataset downloads are used.

After publishing locally, commit the static assets and manifest and push `main`. GitHub Pages rebuilds automatically. The manifest's new hash makes browsers load the new dataset while retaining the cache for unchanged snapshots. When changing shared browser code, also bump its version in module imports and HTML script/style URLs.
