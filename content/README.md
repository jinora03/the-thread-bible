# Content

Everything the library says about Scripture lives here, one YAML file per entry. **Read [GUIDELINES.md](GUIDELINES.md) first:** it is the editorial philosophy every file is written to, and it explains each field. The API validates these files when it starts. Run `npm run content:check` to validate them yourself; it lists every problem with its file and field.

## Folders

| Folder | Holds | URL |
| --- | --- | --- |
| `doctrines/`, `prophecies/`, `studies/` | long-form pages | `/explore/doctrines/<file>`, `/studies/<file>` |
| `themes/`, `typology/`, `people/`, `places/`, `events/`, `covenants/`, `promises/` | library entries | `/explore/<folder>/<file>` |
| `connections/` | links between passages and entries, grouped by source book | shown on both ends |
| `chapter-notes/` | the reader's context panel for a chapter (`book`, `chapter`) | `/bible/<book>/<chapter>` |
| `threads/` | ordered passage sequences, such as From Promise to Fulfillment | home page, studies |
| `site/home.yaml` | what the home page features | `/` |

The file name is the URL, so use lowercase letters, digits, and hyphens.

## Writing

- **Never paste Scripture text.** Write references instead, for example `Isaiah 52:13–53:12`, `John 1:29`, or `Isaiah 52–53`. The text is shown in whichever translation the reader chooses.
- **Links in prose** are written as tokens:
  - `[[John 1:29]]` or `[[John 1:29|the Lamb]]` becomes a passage preview.
  - `[[theme:covenant]]` or `[[doctrine:resurrection|the resurrection]]` becomes a link to an entry. Entry ids are `<kind>:<file name>`.
- **Each connection has a `basis`**, so readers can tell what Scripture states from what is offered more cautiously:
  - `stated`: Scripture quotes or explicitly identifies the link.
  - `supported`: a clear echo or recurring pattern that several passages support.
  - `suggested`: suggestive rather than established; described cautiously.
- **Let Scripture explain Scripture.** Lead with passages and keep commentary short. Competing interpretations are not a standard section; an optional `interpretationNote` covers the rare case where a disagreement changes a passage's meaning.

## Review workflow

Every file has a `review` block:

```yaml
review:
  status: in-review          # draft → in-review → published
  authors: [The Thread Bible editors]
  reviewers:                 # required before publishing
    - name: A. Reviewer
      role: theological      # theological | editorial | historical
      date: 2026-09-01
  note: Optional note shown to readers while the entry is unreviewed.
```

- `draft` and `in-review` entries are served only when `CONTENT_STAGE=preview`, and are labeled as unreviewed in the UI.
- An entry can be `published` only once it records at least one completed review.
- With `CONTENT_STAGE=published` (the production default), unpublished entries are hidden, and connections to them are dropped.
