#!/usr/bin/env bun
/**
 * sync.mjs — Push canonical tooling scripts and shared content to consumer projects.
 *
 * Usage:
 *   bun sync.mjs <project-path>          # sync one project
 *   bun sync.mjs --all                   # sync all known projects
 *   bun sync.mjs --list                  # show known projects
 *   bun sync.mjs --dry-run <project>     # preview without writing
 *   bun sync.mjs --tooling-only --all    # skip shared content
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseToml } from './tooling/config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOOLING_DIR = path.join(__dirname, 'tooling')
const SHARED_DIR = path.join(__dirname, 'shared', '.agents')
const STACKS_DIR = path.join(SHARED_DIR, 'stacks')
const GLOBAL_SKILLS_DIR = path.join(__dirname, 'global', '.agents', 'skills')
const PROJECTS_FILE = path.join(__dirname, 'projects.json')

export function loadProjects() {
  if (!fs.existsSync(PROJECTS_FILE)) return []
  const raw = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'))
  return raw.map((entry) => {
    if (typeof entry === 'string') {
      const resolved = entry.startsWith('/') ? entry : path.resolve(__dirname, entry)
      return { path: resolved }
    }
    const resolved = entry.path.startsWith('/') ? entry.path : path.resolve(__dirname, entry.path)
    return { ...entry, path: resolved }
  })
}

function collectFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return []
  const entries = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      entries.push(...collectFiles(full, base))
    } else {
      entries.push(path.relative(base, full))
    }
  }
  return entries
}

function syncFiles(srcDir, dstDir, files, { dryRun = false, label = '', skipExisting = false, trackedFiles = null } = {}) {
  let changed = 0
  for (const rel of files) {
    const src = path.join(srcDir, rel)
    const dst = path.join(dstDir, rel)

    if (skipExisting && fs.existsSync(dst)) {
      if (trackedFiles) trackedFiles.add(rel)
      continue
    }

    const srcContent = fs.readFileSync(src)
    let needsWrite = true
    if (fs.existsSync(dst)) {
      needsWrite = !srcContent.equals(fs.readFileSync(dst))
    }

    if (needsWrite) {
      if (dryRun) {
        console.log(`  would write${label}: ${rel}`)
      } else {
        fs.mkdirSync(path.dirname(dst), { recursive: true })
        fs.writeFileSync(dst, srcContent)
        console.log(`  updated${label}: ${rel}`)
      }
      changed++
    }
    if (trackedFiles) trackedFiles.add(rel)
  }
  return changed
}

function removeStaleFiles(projectPath, previousFiles, currentFiles, { dryRun = false } = {}) {
  const agentsDir = path.join(projectPath, '.agents')
  const stale = previousFiles.filter(f => !currentFiles.has(f))
  let removed = 0
  for (const rel of stale) {
    const full = path.join(agentsDir, rel)
    if (!fs.existsSync(full)) continue
    if (dryRun) {
      console.log(`  would remove: ${rel}`)
    } else {
      fs.unlinkSync(full)
      console.log(`  removed: ${rel}`)
    }
    removed++
    // Clean empty parent dirs up to .agents/
    let dir = path.dirname(full)
    while (dir !== agentsDir && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir)
      dir = path.dirname(dir)
    }
  }
  return removed
}

function lockPayload(projectPath, { toolingOnly = false, syncedFiles = [] } = {}) {
  return {
    version: 2,
    source: 'agents-platform',
    scripts_dir: '.agents/scripts',
    tooling_only: Boolean(toolingOnly),
    stacks: readProjectStacks(projectPath),
    synced_files: syncedFiles.sort(),
  }
}

function readLockFile(projectPath) {
  const lockPath = path.join(projectPath, '.agents', 'lock.json')
  if (!fs.existsSync(lockPath)) return null
  try { return JSON.parse(fs.readFileSync(lockPath, 'utf8')) } catch { return null }
}

function writeLockFile(projectPath, { dryRun = false, toolingOnly = false, syncedFiles = [] } = {}) {
  const lockPath = path.join(projectPath, '.agents', 'lock.json')
  const content = JSON.stringify(lockPayload(projectPath, { toolingOnly, syncedFiles }), null, 2) + '\n'

  if (fs.existsSync(lockPath) && fs.readFileSync(lockPath, 'utf8') === content) {
    return 0
  }

  if (dryRun) {
    console.log('  would write [lock]: lock.json')
    return 1
  }

  fs.mkdirSync(path.dirname(lockPath), { recursive: true })
  fs.writeFileSync(lockPath, content)
  console.log('  updated [lock]: lock.json')
  return 1
}

export function readProjectStacks(projectPath) {
  const profilePath = path.join(projectPath, '.agents', 'profile.toml')
  if (!fs.existsSync(profilePath)) return []
  const parsed = parseToml(fs.readFileSync(profilePath, 'utf8'))
  return parsed.selection?.stacks ?? parsed.stacks ?? []
}

function resolveStackDir(stackName) {
  const dir = path.join(STACKS_DIR, stackName)
  return fs.existsSync(dir) ? dir : null
}

function readStackToml(stackDir) {
  const tomlPath = path.join(stackDir, 'stack.toml')
  if (!fs.existsSync(tomlPath)) return null
  return parseToml(fs.readFileSync(tomlPath, 'utf8'))
}

export function syncGlobalSkills({ dryRun = false } = {}) {
  const targetDir = path.join(os.homedir(), '.agents', 'skills')
  if (!fs.existsSync(GLOBAL_SKILLS_DIR)) return
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })

  const platformSkills = fs.readdirSync(GLOBAL_SKILLS_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
  let changed = 0

  for (const skill of platformSkills) {
    const target = path.join(targetDir, skill)
    const source = path.join(GLOBAL_SKILLS_DIR, skill)

    if (fs.existsSync(target)) {
      const stat = fs.lstatSync(target)
      if (stat.isSymbolicLink()) {
        if (fs.readlinkSync(target) === source) continue
        if (dryRun) { console.log(`  would relink: ~/.agents/skills/${skill}`); changed++; continue }
        fs.unlinkSync(target)
      } else {
        // Real directory — user owns it, skip
        continue
      }
    }

    if (dryRun) { console.log(`  would link: ~/.agents/skills/${skill}`); changed++; continue }
    fs.symlinkSync(source, target)
    console.log(`  linked: ~/.agents/skills/${skill}`)
    changed++
  }

  // Remove stale symlinks pointing into our global dir
  for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
    const full = path.join(targetDir, entry.name)
    if (!fs.lstatSync(full).isSymbolicLink()) continue
    const linkTarget = fs.readlinkSync(full)
    if (linkTarget.startsWith(GLOBAL_SKILLS_DIR) && !fs.existsSync(linkTarget)) {
      if (dryRun) { console.log(`  would unlink stale: ~/.agents/skills/${entry.name}`); continue }
      fs.unlinkSync(full)
      console.log(`  unlinked stale: ~/.agents/skills/${entry.name}`)
    }
  }

  // Mirror ~/.agents/skills/ to each tool's global skills dir
  const toolDirs = ['.kiro/skills', '.claude/skills', '.factory/skills', '.opencode/skills']
    .map(d => path.join(os.homedir(), d))
    .filter(d => fs.existsSync(path.dirname(d)))

  for (const toolDir of toolDirs) {
    if (!fs.existsSync(toolDir)) fs.mkdirSync(toolDir, { recursive: true })

    // Sync: create symlinks from tool dir → ~/.agents/skills/<name>
    for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const agentsSkill = path.join(targetDir, entry.name)
      const toolSkill = path.join(toolDir, entry.name)
      if (fs.existsSync(toolSkill)) {
        const stat = fs.lstatSync(toolSkill)
        if (stat.isSymbolicLink()) {
          if (fs.readlinkSync(toolSkill) === agentsSkill) continue
          if (!dryRun) fs.unlinkSync(toolSkill)
        } else continue // Real dir — user owns it
      }
      if (!dryRun) fs.symlinkSync(agentsSkill, toolSkill)
    }

    // Clean stale symlinks pointing to ~/.agents/skills/
    for (const entry of fs.readdirSync(toolDir, { withFileTypes: true })) {
      const full = path.join(toolDir, entry.name)
      if (!fs.lstatSync(full).isSymbolicLink()) continue
      const linkTarget = fs.readlinkSync(full)
      if (linkTarget.startsWith(targetDir) && !fs.existsSync(linkTarget)) {
        if (!dryRun) fs.unlinkSync(full)
      }
    }
  }

  if (changed === 0 && !dryRun) console.log('  global skills up to date')
}

const GLOBAL_MCP_PATH = path.join(__dirname, 'global', '.agents', 'mcp', 'servers.json')

// Tool-specific global MCP config locations and formats
const MCP_TARGETS = [
  { name: 'kiro', path: () => path.join(os.homedir(), '.kiro', 'settings', 'mcp.json'), key: 'mcpServers', preserve: ['powers'] },
  { name: 'gemini', path: () => path.join(os.homedir(), '.gemini', 'settings.json'), key: 'mcpServers', preserve: ['experimental'] },
  { name: 'opencode', path: () => path.join(os.homedir(), '.config', 'opencode', 'opencode.json'), key: 'mcp', preserve: ['$schema', 'instructions'] },
  { name: 'claude', path: () => path.join(os.homedir(), 'claude', 'mcp.json'), key: 'mcpServers', preserve: [] },
  { name: 'factory', path: () => path.join(os.homedir(), '.factory', 'mcp.json'), key: 'mcpServers', preserve: [] },
]

// Transform server config to OpenCode's expected format
function toOpenCodeFormat(server) {
  const { command, args, disabled, autoApprove, env, ...rest } = server
  const mapped = { type: 'local', command: [command, ...(Array.isArray(args) ? args : [])], enabled: !disabled, ...rest }
  if (env && typeof env === 'object') mapped.environment = env
  return mapped
}

// Resolve $VAR and ${VAR} references in MCP env fields from process.env
function resolveEnvVars(servers) {
  const resolved = JSON.parse(JSON.stringify(servers))
  for (const server of Object.values(resolved)) {
    const envObj = server.env || server.environment
    if (!envObj) continue
    for (const [key, val] of Object.entries(envObj)) {
      if (typeof val !== 'string') continue
      const m = val.match(/^\$\{?([A-Z_][A-Z0-9_]*)\}?$/)
      if (m && process.env[m[1]]) envObj[key] = process.env[m[1]]
    }
  }
  return resolved
}

export function syncGlobalMcp({ dryRun = false } = {}) {
  if (!fs.existsSync(GLOBAL_MCP_PATH)) return
  const source = JSON.parse(fs.readFileSync(GLOBAL_MCP_PATH, 'utf8'))
  const platformServers = source.servers || {}
  const platformNames = new Set(Object.keys(platformServers))
  let changed = 0

  for (const target of MCP_TARGETS) {
    const configPath = target.path()
    const configDir = path.dirname(configPath)
    if (!fs.existsSync(configDir)) continue

    let config = {}
    if (fs.existsSync(configPath)) {
      try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')) } catch { config = {} }
    }

    const existing = config[target.key] || {}

    // Merge: platform servers overwrite, user servers preserved
    const merged = { ...existing }
    for (const [name, server] of Object.entries(platformServers)) {
      if (target.name === 'opencode') merged[name] = toOpenCodeFormat(server)
      else if (target.name === 'gemini') { const { disabled, autoApprove, type, ...rest } = server; merged[name] = rest }
      else { const { type, ...rest } = server; merged[name] = rest }
    }

    // Remove servers that were previously platform-managed but no longer in source
    // (We only remove servers that exactly match a platform definition)
    for (const name of Object.keys(merged)) {
      if (!platformNames.has(name) && !Object.prototype.hasOwnProperty.call(existing, name)) {
        delete merged[name]
      }
    }

    // Check if anything changed (compare against resolved values)
    const resolvedMerged = resolveEnvVars(merged)
    if (JSON.stringify(existing) === JSON.stringify(resolvedMerged)) continue

    if (dryRun) {
      console.log(`  would update: ${target.name}`)
      changed++
      continue
    }

    config[target.key] = resolvedMerged
    fs.mkdirSync(configDir, { recursive: true })
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
    console.log(`  updated: ${target.name}`)
    changed++
  }

  if (changed === 0 && !dryRun) console.log('  global mcp up to date')
}

export function listAllStacks() {
  const stacks = []
  if (!fs.existsSync(STACKS_DIR)) return stacks
  for (const name of fs.readdirSync(STACKS_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)) {
    const toml = readStackToml(path.join(STACKS_DIR, name))
    stacks.push({ name, category: toml?.stack?.category ?? 'core', description: toml?.stack?.description ?? '', requires: toml?.stack?.requires ?? [] })
  }
  return stacks.sort((a, b) => a.name.localeCompare(b.name))
}

export function syncTo(projectPath, { dryRun = false, toolingOnly = false } = {}) {
  if (!fs.existsSync(projectPath)) {
    console.error(`skip: ${projectPath} does not exist`)
    return false
  }

  const trackedFiles = new Set()

  const toolingFiles = collectFiles(TOOLING_DIR)
  const toolingTarget = path.join(projectPath, '.agents', 'scripts')
  const toolingChanged = syncFiles(TOOLING_DIR, toolingTarget, toolingFiles, { dryRun })

  let sharedChanged = 0
  if (!toolingOnly && fs.existsSync(SHARED_DIR)) {
    const agentsTarget = path.join(projectPath, '.agents')

    // Scaffold (skipExisting — project copy wins)
    const scaffoldDir = path.join(__dirname, 'scaffold', '.agents')
    if (fs.existsSync(scaffoldDir)) {
      const scaffoldFiles = collectFiles(scaffoldDir)
      if (scaffoldFiles.length) {
        sharedChanged += syncFiles(scaffoldDir, agentsTarget, scaffoldFiles, { dryRun, label: ' [scaffold]', skipExisting: true, trackedFiles })
      }
    }

    // Shared universal (skip stacks/, skipExisting — project wins)
    const sharedFiles = collectFiles(SHARED_DIR).filter(f => !f.startsWith('stacks/') && !f.startsWith('stacks\\'))
    if (sharedFiles.length) {
      sharedChanged += syncFiles(SHARED_DIR, agentsTarget, sharedFiles, { dryRun, label: ' [shared]', skipExisting: true, trackedFiles })
    }

    // Stacks (no skipExisting — platform canonical)
    const stacks = readProjectStacks(projectPath)

    // Validate stack dependencies
    for (const stack of stacks) {
      const stackDir = resolveStackDir(stack)
      if (!stackDir) {
        console.warn(`  ⚠ stack "${stack}" not found`)
        continue
      }
      const toml = readStackToml(stackDir)
      const requires = toml?.stack?.requires ?? []
      for (const dep of requires) {
        if (!stacks.includes(dep)) {
          console.warn(`  ⚠ stack "${stack}" requires "${dep}" which is not declared in profile.toml`)
        }
      }
    }

    for (const stack of stacks) {
      const stackDir = resolveStackDir(stack)
      if (!stackDir) continue
      // Skills and rules: always overwrite (platform canonical)
      const stackFiles = collectFiles(stackDir).filter(f => f !== 'stack.toml' && !f.startsWith('commands/') && !f.startsWith('commands\\'))
      if (stackFiles.length) {
        sharedChanged += syncFiles(stackDir, agentsTarget, stackFiles, { dryRun, label: ` [stack:${stack}]`, trackedFiles })
      }
      // Commands: skipExisting (project customizations win)
      const commandFiles = collectFiles(stackDir).filter(f => f.startsWith('commands/') || f.startsWith('commands\\'))
      if (commandFiles.length) {
        sharedChanged += syncFiles(stackDir, agentsTarget, commandFiles, { dryRun, label: ` [stack:${stack}]`, skipExisting: true, trackedFiles })
      }
    }

    // Remove stale files from previous sync
    const prevLock = readLockFile(projectPath)
    const previousFiles = prevLock?.synced_files ?? []
    if (previousFiles.length) {
      sharedChanged += removeStaleFiles(projectPath, previousFiles, trackedFiles, { dryRun })
    }
  }

  const syncedFiles = [...trackedFiles]
  const lockChanged = writeLockFile(projectPath, { dryRun, toolingOnly, syncedFiles })
  const total = toolingChanged + sharedChanged + lockChanged
  if (total === 0) console.log('  already up to date')
  return true
}

function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const toolingOnly = args.includes('--tooling-only')
  const filtered = args.filter((a) => !a.startsWith('--'))

  if (args.includes('--list')) {
    const projects = loadProjects()
    if (!projects.length) {
      console.log('No projects registered. Add paths to projects.json.')
      return
    }
    for (const p of projects) console.log(`${p.path}${p.name ? ` (${p.name})` : ''}`)
    return
  }

  if (args.includes('--all')) {
    const projects = loadProjects()
    if (!projects.length) {
      console.error('No projects in projects.json')
      process.exit(1)
    }
    console.log('\n→ global skills')
    syncGlobalSkills({ dryRun })
    console.log('\n→ global mcp')
    syncGlobalMcp({ dryRun })
    for (const p of projects) {
      console.log(`\n→ ${p.path}`)
      syncTo(p.path, { dryRun, toolingOnly })
    }
    return
  }

  if (!filtered.length) {
    console.error('Usage: bun sync.mjs <project-path> | --all | --list [--dry-run] [--tooling-only]')
    process.exit(1)
  }

  const target = path.resolve(filtered[0])
  console.log(`→ ${target}`)
  syncTo(target, { dryRun, toolingOnly })
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
if (isDirectRun) main()
