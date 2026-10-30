// Rebuilds added/, patches/ and pack.json from the author's own repository, one commit at a
// time. Every commit of the author's event history that this repository has not replayed yet
// becomes one commit here with the same message, author and dates, and after it the pack
// rebuilds the app exactly as it stood at that commit (assemble.mjs checks the tree hash).
// The dates are the dates the work was done, copied; nothing is back-dated.
//
// Only the author can run it: it reads their full repository, which is not published here.
//
//   node maintainer/make-pack.mjs --dev <the author's repository> --tip <branch or commit>
//        [--base <sha> --url <url>]    first run only: the earlier repository's pinned commit
//                                      and the url assemble.mjs fetches it from
//
// Run it in this repository, after `git init` and with added/, patches/ and pack.json clean.
// A later run replays only the commits after the last one (pack.json names it). The files
// that are not generated (README, CI, LICENSE, the scripts) are committed by hand, after.
//
// Exit 0: done. 2: could not run (a nothing-to-do run is 0 as well).

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

process.exitCode = 2

const PACK = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PACK_JSON = join(PACK, 'pack.json')
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i < 0 ? undefined : process.argv[i + 1]
}
const fail = (message) => {
  throw new Error(message)
}

const DEV = resolve(arg('dev') ?? fail('--dev <the author\'s repository> is required'))
const TIP = arg('tip') ?? fail('--tip <branch or commit> is required')

// Raw bytes out of git; text() trims and decodes.
const git = (cwd, args, opts = {}) =>
  execFileSync('git', args, { cwd, maxBuffer: 1 << 30, stdio: ['pipe', 'pipe', 'inherit'], ...opts })
const text = (cwd, ...args) => git(cwd, args, { encoding: 'utf8' }).trim()

// What differs between the pinned base and `commit`: paths by status, A (new), M (changed)
// and D (removed). A mode other than 100644 would change the tree hash and cannot be rebuilt
// by copying a file, so it stops the run.
function changes(base, commit) {
  const t = git(DEV, ['diff-tree', '-r', '--no-renames', '-z', base, commit], { encoding: 'utf8' }).split('\0')
  t.pop()
  const found = { A: [], M: [], D: [] }
  for (let i = 0; i < t.length; i += 2) {
    const [oldMode, newMode, , , status] = t[i].slice(1).split(' ')
    if (!(status in found)) fail(`${t[i + 1]}: status ${status} is not A, M or D`)
    if ((status !== 'A' && oldMode !== '100644') || (status !== 'D' && newMode !== '100644')) {
      fail(`${t[i + 1]}: mode ${oldMode} -> ${newMode}; the pack handles 100644 only`)
    }
    found[status].push(t[i + 1])
  }
  return found
}

// One patch per changed file, base to commit, as raw bytes (latin1 keeps every byte as it is).
// -U0: no unchanged line of the earlier code is copied in as context; a patch holds the lines the
// event added and the lines it replaced, nothing else. assemble.mjs applies them with --unidiff-zero.
function patches(base, commit, paths) {
  const flags = ['--no-renames', '--diff-filter=M', '--no-color', '--no-ext-diff', '--no-textconv', '--src-prefix=a/', '--dst-prefix=b/', '-U0']
  const raw = git(DEV, ['-c', 'core.quotepath=false', 'diff', ...flags, base, commit], { encoding: 'latin1' })
  const chunks = raw.split(/^(?=diff --git )/m).filter(Boolean)
  if (chunks.length !== paths.length) fail(`${chunks.length} patches for ${paths.length} changed files`)
  return paths.map((p, i) => {
    if (!chunks[i].startsWith(`diff --git a/${p} b/${p}\n`)) fail(`patch ${i} is not the patch for ${p}`)
    // git writes these two lines itself; a line of file content always starts with a space, + or -.
    if (/^(Binary files |GIT binary patch)/m.test(chunks[i])) fail(`${p} is binary: a patch cannot carry it`)
    return Buffer.from(chunks[i], 'latin1')
  })
}

function put(rel, bytes) {
  const file = join(PACK, rel)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, bytes)
}

function replay(base, url, baseTree, commit) {
  const { A, M, D } = changes(base, commit)
  const diffs = patches(base, commit, M)
  rmSync(join(PACK, 'added'), { recursive: true, force: true })
  rmSync(join(PACK, 'patches'), { recursive: true, force: true })
  for (const p of A) put(`added/${p}`, git(DEV, ['cat-file', 'blob', `${commit}:${p}`]))
  M.forEach((p, i) => put(`patches/${p}.patch`, diffs[i]))
  const pack = {
    base: { url, commit: base, tree: baseTree },
    added: A,
    patched: M,
    removed: D,
    result: { devCommit: commit, tree: text(DEV, 'rev-parse', `${commit}^{tree}`) },
  }
  writeFileSync(PACK_JSON, `${JSON.stringify(pack, null, 2)}\n`)

  const [an, ae, ad, cn, ce, cd] = text(DEV, 'log', '-1', '--format=%an%x00%ae%x00%aI%x00%cn%x00%ce%x00%cI', commit).split('\0')
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: an, GIT_AUTHOR_EMAIL: ae, GIT_AUTHOR_DATE: ad,
    GIT_COMMITTER_NAME: cn, GIT_COMMITTER_EMAIL: ce, GIT_COMMITTER_DATE: cd,
  }
  const paths = ['added', 'patches', 'pack.json'].filter((p) => existsSync(join(PACK, p)))
  git(PACK, ['-c', 'core.autocrlf=false', 'add', '-A', '--', ...paths])
  // --cleanup=verbatim: the message goes in byte for byte (the default would drop lines starting with #).
  git(PACK, ['-c', 'commit.gpgsign=false', 'commit', '-q', '--no-verify', '--cleanup=verbatim', '-F', '-'], {
    input: git(DEV, ['log', '-1', '--format=%B', commit]),
    env,
  })
  return pack
}

function main() {
  git(PACK, ['rev-parse', '--git-dir'])
  git(PACK, ['config', 'core.autocrlf', 'false'])
  if (text(PACK, 'status', '--porcelain', '--', 'added', 'patches', 'pack.json')) {
    fail('added/, patches/ or pack.json has uncommitted changes: commit or discard them first')
  }

  const old = existsSync(PACK_JSON) ? JSON.parse(readFileSync(PACK_JSON, 'utf8')) : null
  const base = old?.base.commit ?? arg('base') ?? fail('first run: --base <sha> and --url <url> are required')
  const url = old?.base.url ?? arg('url') ?? fail('first run: --base <sha> and --url <url> are required')
  const baseTree = text(DEV, 'rev-parse', `${base}^{tree}`)
  const from = old?.result.devCommit ?? base

  for (const [a, b] of [[base, TIP], [from, TIP]]) {
    execFileSync('git', ['merge-base', '--is-ancestor', a, b], { cwd: DEV })
  }
  if (text(DEV, 'rev-list', '--merges', `${base}..${TIP}`)) fail('the history has a merge commit; the replay needs a straight line')
  const todo = text(DEV, 'rev-list', '--reverse', `${from}..${TIP}`).split('\n').filter(Boolean)
  if (!todo.length) {
    console.log(`nothing to replay: ${from.slice(0, 12)} is already ${TIP}`)
    process.exitCode = 0
    return
  }

  todo.forEach((commit, i) => {
    console.log(`${i + 1}/${todo.length} ${text(DEV, 'log', '-1', '--format=%h %s', commit)}`)
    replay(base, url, baseTree, commit)
  })
  const pack = JSON.parse(readFileSync(PACK_JSON, 'utf8'))
  console.log(`replayed ${todo.length} commits; now ${pack.added.length} added, ${pack.patched.length} patched, ${pack.removed.length} removed`)
  console.log(`result tree ${pack.result.tree}`)
  process.exitCode = 0
}

try {
  main()
} catch (e) {
  console.error(`make-pack: ${e.message}`)
}
