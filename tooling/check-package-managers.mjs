import fs from 'node:fs'
import path from 'node:path'
import { walkFiles } from './renderers/common.mjs'

const ROOT = process.cwd()
const TARGETS = ['.agents', '.claude', '.gemini', '.kiro', '.opencode', '.factory', 'AGENTS.md', 'opencode.json']
const TEXT_EXTENSIONS = new Set([
  '.md',
  '.json',
  '.toml',
  '.yaml',
  '.yml',
  '.ts',
  '.js',
  '.mjs',
  '.txt',
])
const FORBIDDEN = /\b(npm|pnpm|yarn|npx)\b/g
const EXCLUDED_PREFIXES = ['.agents/plans/', '.agents/legacyplans/', '.agents/reports/', '.kiro/specs/', '.factory/specs/']

let hasError = false

function fail(message) {
  hasError = true
  process.stderr.write(`${message}\n`)
}

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return TEXT_EXTENSIONS.has(ext)
}

function isExcluded(relativePath) {
  if (relativePath.startsWith('node_modules/') || relativePath.includes('/node_modules/')) {
    return true
  }
  return EXCLUDED_PREFIXES.some(
    (prefix) =>
      relativePath === prefix.slice(0, -1) || relativePath.startsWith(prefix),
  )
}

function scanFile(filePath) {
  if (!isTextFile(filePath)) return

  const relativePath = path.relative(ROOT, filePath).replace(/\\/g, '/')
  if (isExcluded(relativePath)) return

  const source = fs.readFileSync(filePath, 'utf8')
  const lines = source.split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const matches = [...line.matchAll(FORBIDDEN)]
    for (const match of matches) {
      fail(
        `check-package-managers: forbidden token '${match[0]}' in ${relativePath}:${index + 1}`,
      )
    }
  }
}

function main() {
  for (const target of TARGETS) {
    const fullPath = path.join(ROOT, target)
    if (!fs.existsSync(fullPath)) continue

    const stat = fs.lstatSync(fullPath)
    if (stat.isDirectory()) {
      for (const filePath of walkFiles(fullPath)) {
        scanFile(filePath)
      }
      continue
    }

    scanFile(fullPath)
  }

  if (hasError) {
    process.exitCode = 1
    return
  }

  process.stdout.write('agents-check-package-managers: ok\n')
}

main()
