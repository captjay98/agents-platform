#!/usr/bin/env bun
/**
 * agents-platform CLI
 *
 * Usage:
 *   agents-platform init <path> [--toolchains kiro,claude]
 *   agents-platform sync [--all] [--dry-run] [--tooling-only]
 *   agents-platform build
 *   agents-platform lint
 *   agents-platform signoff
 *   agents-platform validate
 *   agents-platform add-stack <name> [--community]
 *   agents-platform list-stacks
 *   agents-platform list-projects
 *   agents-platform list-renderers
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const [command, ...args] = process.argv.slice(2)
const flags = new Set(args.filter(a => a.startsWith('--')))
const positional = args.filter(a => !a.startsWith('--'))

function run(script, extraArgs = [], { cwd } = {}) {
  const result = spawnSync('bun', [path.join(ROOT, script), ...extraArgs], {
    cwd: cwd || process.cwd(),
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function runInProject(scriptName) {
  const scripts = path.join(process.cwd(), '.agents', 'scripts')
  if (!fs.existsSync(path.join(scripts, scriptName))) {
    console.error(`Not in an agents-platform project (missing .agents/scripts/${scriptName})`)
    process.exit(1)
  }
  const result = spawnSync('bun', [path.join(scripts, scriptName)], { cwd: process.cwd(), stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const commands = {
  init() {
    const target = positional[0]
    if (!target) { console.error('Usage: agents-platform init <path> [--toolchains kiro,claude]'); process.exit(1) }
    const extraArgs = [target]
    const tcFlag = args.indexOf('--toolchains')
    if (tcFlag !== -1 && args[tcFlag + 1]) extraArgs.push('--toolchains', args[tcFlag + 1])
    run('bootstrap.mjs', extraArgs)
  },

  setup() {
    const extraArgs = positional[0] ? [positional[0]] : []
    run('interactive-init.mjs', extraArgs)
  },

  sync() {
    const extraArgs = []
    if (flags.has('--all')) extraArgs.push('--all')
    if (flags.has('--dry-run')) extraArgs.push('--dry-run')
    if (flags.has('--tooling-only')) extraArgs.push('--tooling-only')
    if (!flags.has('--all') && positional[0]) extraArgs.push(positional[0])
    if (!extraArgs.length || (extraArgs.every(a => a.startsWith('--')))) extraArgs.push('--all')
    run('sync.mjs', extraArgs)
  },

  build() { runInProject('build.mjs') },
  lint() { runInProject('lint.mjs') },
  signoff() { runInProject('signoff.mjs') },

  validate: async () => {
    const { loadProjects, readProjectStacks, listAllStacks } = await import(path.join(ROOT, 'sync.mjs'))
    const projects = loadProjects()
    if (!projects.length) { console.log('No projects in projects.json'); return }

    const allStacks = new Map(listAllStacks().map(s => [s.name, s]))
    let issues = 0

    for (const p of projects) {
      const name = path.basename(p.path)
      const agentsDir = path.join(p.path, '.agents')
      if (!fs.existsSync(agentsDir)) { console.error(`✗ ${name}: .agents/ missing`); issues++; continue }

      const stacks = readProjectStacks(p.path)
      for (const stack of stacks) {
        const info = allStacks.get(stack)
        if (!info) { console.warn(`  ⚠ ${name}: stack "${stack}" not found`); issues++; continue }
        for (const dep of info.requires) {
          if (!stacks.includes(dep)) { console.warn(`  ⚠ ${name}: stack "${stack}" requires "${dep}"`); issues++ }
        }
      }

      // Check for unfilled placeholders
      const scanDirs = ['personas', 'commands', 'steering', 'skills'].map(d => path.join(agentsDir, d))
      let placeholders = 0
      for (const dir of scanDirs) {
        if (!fs.existsSync(dir)) continue
        const files = fs.readdirSync(dir, { recursive: true }).filter(f => String(f).endsWith('.md') && !String(f).includes('_TEMPLATE'))
        for (const f of files) {
          const content = fs.readFileSync(path.join(dir, String(f)), 'utf8')
          const matches = content.match(/<!--\s*PROJECT:/g)
          if (matches) placeholders += matches.length
        }
      }

      const status = placeholders ? `⚠ ${placeholders} placeholder(s)` : '✓'
      console.log(`${status} ${name} — ${stacks.length} stacks`)
    }

    if (issues === 0) console.log('\nAll projects valid')
    else { console.log(`\n${issues} issue(s) found`); process.exit(1) }
  },

  'add-stack'() {
    const name = positional[0]
    if (!name) { console.error('Usage: agents-platform add-stack <name> [--community]'); process.exit(1) }
    const base = path.join(ROOT, 'shared', '.agents', 'stacks', name)

    if (fs.existsSync(base)) { console.error(`Stack "${name}" already exists at ${base}`); process.exit(1) }

    const category = flags.has('--community') ? 'community' : 'core'
    fs.mkdirSync(path.join(base, 'skills'), { recursive: true })
    fs.mkdirSync(path.join(base, 'rules'), { recursive: true })
    fs.writeFileSync(path.join(base, 'stack.toml'), `[stack]\nname = "${name}"\ndescription = ""\ncategory = "${category}"\nrequires = []\n`)
    console.log(`Created stack skeleton: ${path.relative(ROOT, base)}/`)
    console.log('Next: add skills and rules, then update profile.toml in your project')
  },

  'list-stacks': async () => {
    const { listAllStacks } = await import(path.join(ROOT, 'sync.mjs'))
    const stacks = listAllStacks()
    const maxName = Math.max(...stacks.map(s => s.name.length), 4)
    const maxCat = 9 // 'community'.length

    console.log(`${'Name'.padEnd(maxName)}  ${'Category'.padEnd(maxCat)}  ${'Requires'.padEnd(20)}  Description`)
    console.log(`${'─'.repeat(maxName)}  ${'─'.repeat(maxCat)}  ${'─'.repeat(20)}  ${'─'.repeat(40)}`)
    for (const s of stacks) {
      const req = s.requires.length ? s.requires.join(', ') : '—'
      console.log(`${s.name.padEnd(maxName)}  ${s.category.padEnd(maxCat)}  ${req.padEnd(20)}  ${s.description}`)
    }
    console.log(`\n${stacks.length} stacks (${stacks.filter(s => s.category === 'core').length} core, ${stacks.filter(s => s.category === 'community').length} community)`)
  },

  'list-projects': async () => {
    const { loadProjects, readProjectStacks } = await import(path.join(ROOT, 'sync.mjs'))
    const projects = loadProjects()
    if (!projects.length) { console.log('No projects in projects.json'); return }
    for (const p of projects) {
      const name = path.basename(p.path)
      const stacks = readProjectStacks(p.path)
      console.log(`${name} — ${stacks.join(', ') || '(no stacks)'}`)
    }
  },

  status: async () => {
    const { loadProjects, readProjectStacks, listAllStacks } = await import(path.join(ROOT, 'sync.mjs'))
    const projects = loadProjects()
    if (!projects.length) { console.log('No projects in projects.json'); return }

    const STACKS_DIR = path.join(ROOT, 'shared', '.agents', 'stacks')
    const SKILLS_DIR = path.join(ROOT, 'shared', '.agents', 'skills')
    const manifestPath = path.join(ROOT, 'shared', '.agents', 'skills-manifest.json')
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { skills: {} }

    // Platform totals
    let totalSkills = 0, upstream = 0, custom = 0
    for (const dir of [SKILLS_DIR, ...fs.readdirSync(STACKS_DIR).map(s => path.join(STACKS_DIR, s, 'skills'))]) {
      if (!fs.existsSync(dir)) continue
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        if (fs.existsSync(path.join(dir, entry.name, 'SKILL.md'))) {
          totalSkills++
          if (manifest.skills[entry.name]) upstream++; else custom++
        }
      }
    }

    console.log(`\n  Platform: ${totalSkills} skills (${upstream} upstream + ${custom} custom)`)
    console.log(`  Stacks:   ${fs.readdirSync(STACKS_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).length}`)
    console.log(`  Upstream: ${Object.keys(manifest.skills).length} tracked\n`)

    console.log(`  ${'Project'.padEnd(16)} ${'Stacks'.padEnd(8)} ${'Skills'.padEnd(8)} ${'Local'.padEnd(8)} Status`)
    console.log(`  ${'─'.repeat(16)} ${'─'.repeat(8)} ${'─'.repeat(8)} ${'─'.repeat(8)} ${'─'.repeat(20)}`)

    for (const p of projects) {
      const name = path.basename(p.path)
      const agentsDir = path.join(p.path, '.agents')
      if (!fs.existsSync(agentsDir)) { console.log(`  ${name.padEnd(16)} —        —        —        .agents/ missing`); continue }

      const stacks = readProjectStacks(p.path)
      const skillsDir = path.join(agentsDir, 'skills')
      let totalProjectSkills = 0, localOnly = 0
      if (fs.existsSync(skillsDir)) {
        for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
          if (!entry.isDirectory() || entry.name === '_TEMPLATE') continue
          if (!fs.existsSync(path.join(skillsDir, entry.name, 'SKILL.md'))) continue
          totalProjectSkills++
          // Check if it's local-only
          let inPlatform = false
          if (fs.existsSync(path.join(SKILLS_DIR, entry.name))) inPlatform = true
          for (const s of fs.readdirSync(STACKS_DIR)) {
            if (fs.existsSync(path.join(STACKS_DIR, s, 'skills', entry.name))) { inPlatform = true; break }
          }
          if (!inPlatform) localOnly++
        }
      }

      console.log(`  ${name.padEnd(16)} ${String(stacks.length).padEnd(8)} ${String(totalProjectSkills).padEnd(8)} ${String(localOnly).padEnd(8)} ✓`)
    }
    console.log()
  },

  'list-renderers': async () => {
    const { renderers } = await import(path.join(ROOT, 'tooling', 'toolchains.mjs'))
    console.log(`${'Name'.padEnd(12)}  ${'MCP'.padEnd(5)}  Output Dirs`)
    console.log(`${'─'.repeat(12)}  ${'─'.repeat(5)}  ${'─'.repeat(50)}`)
    for (const r of renderers) {
      console.log(`${r.meta.name.padEnd(12)}  ${(r.meta.mcpCapable ? 'yes' : 'no').padEnd(5)}  ${r.meta.outputDirs.join(', ')}`)
    }
    console.log(`\n${renderers.length} renderers`)
  },
}

if (!command || command === '--help' || command === '-h') {
  console.log(`agents-platform — AI agent configuration system

Commands:
  setup [<path>]       Interactive project setup with stack auto-detection
  init <path>          Bootstrap a new project (non-interactive)
  sync [--all]         Sync tooling and stacks to projects [--dry-run] [--tooling-only]
  build                Build AGENTS.md and tool configs (run in project dir)
  lint                 Lint .agents/ content (run in project dir)
  signoff              Full quality gate: build + lint + verify + check-mcp
  validate             Check all projects for issues (deps, placeholders)
  status               Show platform and project health overview
  add-stack <name>     Create a new stack skeleton [--community]
  list-stacks          Show all available stacks
  list-projects        Show registered projects and their stacks
  list-renderers       Show available AI tool renderers`)
  process.exit(0)
}

const handler = commands[command]
if (!handler) {
  console.error(`Unknown command: ${command}\nRun agents-platform --help for usage`)
  process.exit(1)
}

await handler()
