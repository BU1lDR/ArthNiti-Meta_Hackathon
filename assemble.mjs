// Rebuilds the whole app from this repository.
//
// This repository holds only what was built during the Meta Global AI Developer
// Hackathon (26 Oct to 4 Nov 2026): the files that are new, in full, under added/,
// and the changes to files that already existed, as patches under patches/. The code
// those changes sit on is the author's earlier repository, which pack.json names and
// pins to one commit. This script puts the two together:
//
//   1. fetch that one commit of the earlier repository into <target>,
//   2. apply every patch,
//   3. copy added/ over it and delete the files the event removed,
//   4. check that the result is byte for byte the author's tree (the git tree hash).
//
//   node assemble.mjs [target]            default target: ./app next to this file
//   node assemble.mjs --base <url|path>   fetch the earlier repository from there
//                                         instead of from the url in pack.json
//
// Exit 0: rebuilt and verified. 1: rebuilt, but the tree is not the author's (a wrong
// base, or a patch or file changed after it was made). 2: could not run.

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

process.exitCode = 2

const HERE = dirname(fileURLToPath(import.meta.url))
const pack = JSON.parse(readFileSync(join(HERE, 'pack.json'), 'utf8'))

const args = process.argv.slice(2)
const at = args.indexOf('--base')
const baseUrl = at < 0 ? pack.base.url : args.splice(at, 2)[1]
const target = resolve(args[0] ?? join(HERE, 'app'))

const git = (cwd, ...a) =>
  execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()

// Every file under dir as a '/'-separated path relative to it, sorted.
function files(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`]))
    .sort()
}

// A file on disk that pack.json does not list, or the reverse, is a damaged copy.
function matches(found, listed, what) {
  const extra = found.filter((p) => !listed.includes(p))
  const missing = listed.filter((p) => !found.includes(p))
  if (extra.length || missing.length) {
    throw new Error(`${what} does not match pack.json (extra: ${extra.join(', ') || 'none'}; missing: ${missing.join(', ') || 'none'})`)
  }
}

function main() {
  matches(files(join(HERE, 'added')), pack.added, 'added/')
  matches(files(join(HERE, 'patches')).map((p) => p.replace(/\.patch$/, '')), pack.patched, 'patches/')
  for (const p of pack.removed) {
    if (isAbsolute(p) || p.split('/').includes('..')) throw new Error(`pack.json removes a path outside the app: ${p}`)
  }
  if (existsSync(target) && readdirSync(target).length) {
    throw new Error(`${target} already holds files: delete it yourself, or name another folder`)
  }
  mkdirSync(target, { recursive: true })

  git(target, '-c', 'init.defaultBranch=main', 'init', '-q')
  // LF in every file whatever this machine's setting: the patches and the hash below are LF.
  git(target, 'config', 'core.autocrlf', 'false')
  console.log(`fetching ${pack.base.commit.slice(0, 12)} from ${baseUrl}`)
  git(target, 'fetch', '-q', '--depth', '1', baseUrl, pack.base.commit)
  git(target, 'checkout', '-q', '--detach', 'FETCH_HEAD')
  if (git(target, 'rev-parse', 'HEAD') !== pack.base.commit) throw new Error('fetched a commit other than the one pack.json names')

  console.log(`applying ${pack.patched.length} patches`)
  const patch = Buffer.concat(pack.patched.map((p) => readFileSync(join(HERE, 'patches', `${p}.patch`))))
  execFileSync('git', ['apply', '--whitespace=nowarn', '--unidiff-zero', '-'], { cwd: target, input: patch, stdio: ['pipe', 'inherit', 'inherit'] })

  console.log(`copying ${pack.added.length} added files, removing ${pack.removed.length}`)
  cpSync(join(HERE, 'added'), target, { recursive: true })
  for (const p of pack.removed) rmSync(join(target, p), { force: true })

  git(target, 'add', '-A')
  const tree = git(target, 'write-tree')
  if (tree !== pack.result.tree) {
    console.error(`MISMATCH: the rebuilt tree is ${tree}, the author's is ${pack.result.tree}`)
    console.error(`left in ${target} to inspect`)
    process.exitCode = 1
    return
  }
  console.log(`ok: ${target} is byte for byte the author's tree ${tree}`)
  console.log(`'git -C ${target} diff --cached --stat' lists everything the event added or changed; README.md there says how to run it`)
  process.exitCode = 0
}

try {
  main()
} catch (e) {
  console.error(`assemble: ${e.message}`)
}
