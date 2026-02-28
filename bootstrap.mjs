#!/usr/bin/env bun
/**
 * bootstrap.mjs — Scaffold a new project with .agents/ structure + tooling.
 *
 * Usage:
 *   node bootstrap.mjs <project-path>
 *   node bootstrap.mjs <project-path> --toolchains kiro,opencode,claude
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCAFFOLD_DIR = path.join(__dirname, 'scaffold')

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const dstPath = path.join(dst, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath)
    } else if (!fs.existsSync(dstPath)) {
      fs.copyFileSync(srcPath, dstPath)
    }
  }
}

function main() {
  const args = process.argv.slice(2)
  const projectPath = args.find((a) => !a.startsWith('--'))
  if (!projectPath) {
    console.error('Usage: node bootstrap.mjs <project-path> [--toolchains kiro,opencode]')
    process.exit(1)
  }

  const target = path.resolve(projectPath)
  if (!fs.existsSync(target)) {
    console.error(`Project path does not exist: ${target}`)
    process.exit(1)
  }

  const agentsDir = path.join(target, '.agents')
  if (fs.existsSync(agentsDir)) {
    console.log('.agents/ already exists — scaffolding missing pieces only')
  }

  // Parse --toolchains
  const tcIdx = args.indexOf('--toolchains')
  if (tcIdx !== -1 && args[tcIdx + 1]) {
    const toolchains = args[tcIdx + 1].split(',').map((t) => t.trim())
    const profilePath = path.join(SCAFFOLD_DIR, '.agents', 'profile.toml')
    const profileContent = fs.readFileSync(profilePath, 'utf8')
    const updated = profileContent.replace(
      /toolchains_default_enabled = \[.*\]/,
      `toolchains_default_enabled = [${toolchains.map((t) => `"${t}"`).join(', ')}]`,
    )
    // Copy scaffold first, then overwrite profile
    copyDir(SCAFFOLD_DIR, target)
    fs.writeFileSync(path.join(target, '.agents', 'profile.toml'), updated)
  } else {
    copyDir(SCAFFOLD_DIR, target)
  }

  console.log('✓ .agents/ scaffold created')

  // Sync tooling
  execFileSync(process.execPath, [path.join(__dirname, 'sync.mjs'), target], {
    stdio: 'inherit',
  })

  console.log(`\n✓ ${path.basename(target)} bootstrapped`)
  console.log('\nNext steps:')
  console.log('  1. Add personas to .agents/personas/')
  console.log('  2. Add steering docs to .agents/steering/')
  console.log('  3. Run: bun .agents/scripts/build.mjs')
}

main()
