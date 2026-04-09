#!/usr/bin/env bun
/**
 * update-skills.mjs — Re-fetch external skills from their upstream sources.
 *
 * Usage:
 *   bun update-skills.mjs --all              # update all skills
 *   bun update-skills.mjs --skill shadcn     # update one skill
 *   bun update-skills.mjs --list             # show manifest
 *   bun update-skills.mjs --dry-run --all    # preview
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SHARED_DIR = path.join(__dirname, 'shared', '.agents')
const MANIFEST_PATH = path.join(SHARED_DIR, 'skills-manifest.json')

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) { console.error('No skills-manifest.json found'); process.exit(1) }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n')
}

function resolveTargetDir(target) {
  if (target === 'shared') return path.join(SHARED_DIR, 'skills')
  return path.join(SHARED_DIR, target, 'skills')
}

function updateSkill(name, entry, { dryRun = false } = {}) {
  const targetDir = resolveTargetDir(entry.target)
  const skillDir = path.join(targetDir, name)
  const tmpDir = path.join(__dirname, '.tmp-skill-update')

  console.log(`  ↻ ${name} (${entry.source})`)
  if (dryRun) return true

  try {
    // Fetch to temp dir
    fs.rmSync(tmpDir, { recursive: true, force: true })
    fs.mkdirSync(tmpDir, { recursive: true })
    execSync(`npx skills add ${entry.source} -s ${entry.skill} --yes`, {
      stdio: 'pipe', timeout: 90_000, cwd: tmpDir
    })

    // npx skills installs to .agents/skills/<name> relative to cwd
    const installed = path.join(tmpDir, '.agents', 'skills', name)
    if (!fs.existsSync(installed)) {
      console.log(`    ⚠ skill not found in download, skipping`)
      return false
    }

    // Replace existing
    fs.rmSync(skillDir, { recursive: true, force: true })
    fs.cpSync(installed, skillDir, { recursive: true })
    console.log(`    ✓ updated`)
    return true
  } catch (e) {
    console.log(`    ✗ failed: ${e.message?.split('\n')[0] ?? e}`)
    return false
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const manifest = loadManifest()
  const skills = manifest.skills

  if (args.includes('--list')) {
    for (const [name, entry] of Object.entries(skills)) {
      console.log(`  ${name} — ${entry.source} → ${entry.target} (${entry.installed})`)
    }
    console.log(`\n  ${Object.keys(skills).length} skills tracked`)
    return
  }

  const skillIdx = args.indexOf('--skill')
  const targets = skillIdx !== -1
    ? [args[skillIdx + 1]]
    : args.includes('--all') ? Object.keys(skills) : []

  if (!targets.length) {
    console.error('Usage: bun update-skills.mjs --all | --skill <name> | --list [--dry-run]')
    process.exit(1)
  }

  console.log(`Updating ${targets.length} skill(s)${dryRun ? ' (dry-run)' : ''}...\n`)

  let updated = 0, failed = 0
  for (const name of targets) {
    if (!skills[name]) { console.log(`  ⚠ "${name}" not in manifest, skipping`); continue }
    if (updateSkill(name, skills[name], { dryRun })) {
      if (!dryRun) {
        skills[name].installed = new Date().toISOString().slice(0, 10)
        updated++
      }
    } else { failed++ }
  }

  if (!dryRun && updated > 0) {
    saveManifest(manifest)
    console.log(`\n✓ ${updated} updated, ${failed} failed`)
    console.log('Run `bun sync.mjs --all` to push updates to projects')
  }
}

main()
