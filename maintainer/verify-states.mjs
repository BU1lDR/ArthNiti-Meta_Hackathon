// Checks that every commit of this repository rebuilds the app as it stood at the matching
// commit of the author's repository. For each commit that holds a pack.json it exports the
// commit, runs assemble.mjs on it (the current one: the replayed commits do not hold a copy),
// and compares the rebuilt tree with the tree of the author's commit that pack.json names,
// read from the author's repository, not from pack.json.
//
//   node maintainer/verify-states.mjs --dev <the author's repository> [--base <url|path>]
//
// --base is passed to assemble.mjs; give the author's repository to avoid fetching from
// GitHub once per commit. Only the author can run it (it reads their full repository).
//
// Exit 0: every state rebuilt and matches. 1: a state does not. 2: could not run.

import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

process.exitCode = 2

const PACK = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i < 0 ? undefined : process.argv[i + 1]
}
const DEV = arg('dev') ? resolve(arg('dev')) : null
const BASE = arg('base')
if (!DEV) throw new Error('--dev <the author\'s repository> is required')

const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()

function main() {
  const states = git(PACK, 'rev-list', '--reverse', 'HEAD')
    .split('\n')
    .filter((c) => spawnSync('git', ['cat-file', '-e', `${c}:pack.json`], { cwd: PACK }).status === 0)
  let bad = 0
  states.forEach((commit, i) => {
    const dir = mkdtempSync(join(tmpdir(), 'state-'))
    try {
      // The commit's files with no line-ending conversion: a private index, then checkout-index.
      const env = { ...process.env, GIT_INDEX_FILE: join(dir, 'index') }
      execFileSync('git', ['-c', 'core.autocrlf=false', 'read-tree', commit], { cwd: PACK, env })
      execFileSync('git', ['-c', 'core.autocrlf=false', 'checkout-index', '-a', '-f', `--prefix=${dir}/src/`], { cwd: PACK, env })
      const src = join(dir, 'src')
      cpSync(join(PACK, 'assemble.mjs'), join(src, 'assemble.mjs'))
      const pack = JSON.parse(readFileSync(join(src, 'pack.json'), 'utf8'))
      const app = join(dir, 'app')
      const run = spawnSync(process.execPath, [join(src, 'assemble.mjs'), app, ...(BASE ? ['--base', BASE] : [])], { encoding: 'utf8' })
      const rebuilt = existsSync(join(app, '.git')) ? git(app, 'write-tree') : '(not built)'
      const authors = git(DEV, 'rev-parse', `${pack.result.devCommit}^{tree}`)
      const ok = run.status === 0 && rebuilt === authors && rebuilt === pack.result.tree
      if (!ok) bad++
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${i + 1}/${states.length} ${commit.slice(0, 7)} <- ${pack.result.devCommit.slice(0, 7)} tree ${rebuilt.slice(0, 12)}${ok ? '' : ` (author's ${authors.slice(0, 12)}, exit ${run.status})`}`)
      if (!ok) console.log(`${run.stdout}${run.stderr}`)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
  console.log(bad ? `${bad} of ${states.length} states do not match` : `all ${states.length} states rebuild the author's tree`)
  process.exitCode = bad ? 1 : 0
}

try {
  main()
} catch (e) {
  console.error(`verify-states: ${e.message}`)
}
