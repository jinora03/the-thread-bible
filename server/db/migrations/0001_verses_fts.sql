-- Full-text index over verse text (external content: rows live in `verses`).
-- Porter stemming + diacritic folding; the importer rebuilds it after loading text.
CREATE VIRTUAL TABLE `verses_fts` USING fts5(
  `text`,
  content = 'verses',
  content_rowid = 'id',
  tokenize = 'porter unicode61 remove_diacritics 2'
);
