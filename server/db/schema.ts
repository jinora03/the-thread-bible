import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

// ---------------------------------------------------------------------------
// Scripture (imported, read-only at runtime)
// ---------------------------------------------------------------------------

export const verses = sqliteTable(
  'verses',
  {
    // Integer primary key = SQLite rowid, which the FTS5 index points at.
    id: integer('id').primaryKey(),
    translationId: text('translation_id').notNull(),
    bookId: text('book_id').notNull(),
    bookOrder: integer('book_order').notNull(),
    chapter: integer('chapter').notNull(),
    verse: integer('verse').notNull(),
    text: text('text').notNull(),
    paragraph: integer('paragraph', { mode: 'boolean' }).notNull().default(false),
    poetry: integer('poetry', { mode: 'boolean' }).notNull().default(false),
    heading: text('heading'),
    superscription: text('superscription'),
  },
  (table) => [
    uniqueIndex('verses_location').on(table.translationId, table.bookId, table.chapter, table.verse),
  ],
)

// ---------------------------------------------------------------------------
// Authentication (Better Auth core schema)
// ---------------------------------------------------------------------------

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_user').on(table.userId)],
)

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('account_user').on(table.userId)],
)

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

// ---------------------------------------------------------------------------
// Personal library (synced for signed-in readers)
// ---------------------------------------------------------------------------

// References are stored as columns (queryable) plus a stable key for uniqueness.
const referenceColumns = {
  book: text('book').notNull(),
  chapter: integer('chapter').notNull(),
  verse: integer('verse'),
  endChapter: integer('end_chapter'),
  endVerse: integer('end_verse'),
  referenceKey: text('reference_key').notNull(),
}

export const bookmarks = sqliteTable(
  'bookmarks',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...referenceColumns,
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('bookmarks_user_reference').on(table.userId, table.referenceKey)],
)

export const notes = sqliteTable(
  'notes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...referenceColumns,
    text: text('text').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('notes_user').on(table.userId)],
)

export const readingState = sqliteTable('reading_state', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  lastBook: text('last_book'),
  lastChapter: integer('last_chapter'),
  lastReadAt: text('last_read_at'),
  lastStudyId: text('last_study_id'),
  lastStudySection: text('last_study_section'),
  lastStudyAt: text('last_study_at'),
})
