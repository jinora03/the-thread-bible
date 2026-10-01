import { fileURLToPath } from 'node:url'

const fromRoot = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url))

export const paths = {
  root: fromRoot(''),
  content: fromRoot('content'),
  dataDir: fromRoot('data'),
  sources: fromRoot('data/sources'),
  migrations: fromRoot('server/db/migrations'),
  dist: fromRoot('dist'),
}
