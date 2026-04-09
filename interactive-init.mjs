#!/usr/bin/env bun
/**
 * interactive-init.mjs — Interactive project setup with stack auto-detection.
 *
 * Usage:
 *   bun interactive-init.mjs <project-path>
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as p from '@clack/prompts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = __dirname
const STACKS_DIR = path.join(ROOT, 'shared', '.agents', 'stacks')

function detectStacks(projectPath) {
  const detected = []

  // package.json
  const pkgPath = path.join(projectPath, 'package.json')
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
    const has = (name) => name in allDeps

    if (has('@tanstack/react-start')) detected.push('tanstack-fullstack')
    else if (has('@tanstack/react-router')) detected.push('tanstack-frontend')
    if (has('next')) detected.push('nextjs')
    if (has('@nestjs/core')) detected.push('nestjs')
    if (has('tailwindcss')) detected.push('tailwind')
    if (has('better-auth')) detected.push('better-auth')
    if (has('kysely')) detected.push('neon-kysely')
    if (has('typeorm') || has('@nestjs/typeorm')) detected.push('typeorm')
    if (has('bullmq') || has('@nestjs/bullmq')) detected.push('bullmq')
    if (has('zustand')) detected.push('zustand')
    if (has('tiptap') || has('@tiptap/react')) detected.push('tiptap')
    if (has('next-cloudinary')) detected.push('cloudinary')
    if (has('resend')) detected.push('resend')
    if (has('@sentry/react') || has('@sentry/nextjs') || has('@sentry/cloudflare') || has('@sentry/node')) detected.push('sentry')
  }

  // Check subdirectories for monorepos
  for (const sub of ['frontend', 'backend', 'api', 'server']) {
    const subPkg = path.join(projectPath, sub, 'package.json')
    if (fs.existsSync(subPkg)) {
      const pkg = JSON.parse(fs.readFileSync(subPkg, 'utf8'))
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
      const has = (name) => name in allDeps

      if (has('@tanstack/react-start')) detected.push('tanstack-fullstack')
      else if (has('@tanstack/react-router')) detected.push('tanstack-frontend')
      if (has('next')) detected.push('nextjs')
      if (has('@nestjs/core')) detected.push('nestjs')
      if (has('tailwindcss')) detected.push('tailwind')
      if (has('@sentry/react') || has('@sentry/nextjs') || has('@sentry/node')) detected.push('sentry')
    }
  }

  // composer.json (Laravel)
  const composerPath = path.join(projectPath, 'composer.json')
  const backendComposer = path.join(projectPath, 'backend', 'composer.json')
  for (const cp of [composerPath, backendComposer]) {
    if (fs.existsSync(cp)) {
      const composer = JSON.parse(fs.readFileSync(cp, 'utf8'))
      const req = { ...composer.require, ...composer['require-dev'] }
      if ('laravel/framework' in req) detected.push('laravel-api')
      if ('silber/bouncer' in req) detected.push('bouncer')
      if ('spatie/laravel-permission' in req || 'spatie/laravel-medialibrary' in req || 'spatie/laravel-activitylog' in req) detected.push('spatie')
      if ('laravel/horizon' in req) detected.push('laravel-horizon')
      if ('laravel/reverb' in req) detected.push('laravel-reverb')
      if ('meilisearch/meilisearch-php' in req) detected.push('meilisearch')
      if ('sentry/sentry-laravel' in req) detected.push('sentry')
    }
  }

  // pubspec.yaml (Flutter)
  const pubspecPath = path.join(projectPath, 'pubspec.yaml')
  const mobilePubspec = path.join(projectPath, 'mobile', 'pubspec.yaml')
  for (const pp of [pubspecPath, mobilePubspec]) {
    if (fs.existsSync(pp)) detected.push('flutter')
  }

  // wrangler.toml (Cloudflare)
  if (fs.existsSync(path.join(projectPath, 'wrangler.toml')) ||
      fs.existsSync(path.join(projectPath, 'frontend', 'wrangler.toml'))) {
    detected.push('cloudflare')
  }

  return [...new Set(detected)]
}

function listAvailableStacks() {
  if (!fs.existsSync(STACKS_DIR)) return []
  return fs.readdirSync(STACKS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort()
}

async function main() {
  const projectPath = process.argv[2]
  const autoMode = process.argv.includes('--auto')

  if (autoMode) {
    // Agent-friendly: no prompts, use detected stacks
    const resolved = path.resolve(projectPath)
    if (!fs.existsSync(resolved)) { console.error(`Path not found: ${resolved}`); process.exit(1) }

    const detected = detectStacks(resolved)
    const name = path.basename(resolved)
    console.log(`Detected stacks: ${detected.join(', ') || 'none'}`)

    const { spawnSync } = await import('node:child_process')
    spawnSync('bun', [path.join(ROOT, 'bootstrap.mjs'), resolved, '--toolchains', 'kiro,claude'], { stdio: 'pipe' })

    const profilePath = path.join(resolved, '.agents', 'profile.toml')
    fs.writeFileSync(profilePath, `[project]\nname = "${name}"\n\n[toolchains]\nenabled = ["kiro", "claude"]\n\nstacks = [${detected.map(s => `"${s}"`).join(', ')}]\n`)

    spawnSync('bun', [path.join(ROOT, 'sync.mjs'), resolved], { stdio: 'inherit' })
    spawnSync('bun', [path.join(resolved, '.agents', 'scripts', 'build.mjs')], { cwd: resolved, stdio: 'inherit' })

    const skillCount = fs.readdirSync(path.join(resolved, '.agents', 'skills'), { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== '_TEMPLATE').length
    console.log(`Done: ${name} — ${skillCount} skills, ${detected.length} stacks`)
    return
  }

  p.intro('agents-platform setup')

  const target = projectPath || await p.text({
    message: 'Project path:',
    placeholder: '~/projects/my-app',
    validate: (v) => !v ? 'Required' : undefined,
  })

  if (p.isCancel(target)) { p.cancel('Cancelled'); process.exit(0) }

  const resolved = path.resolve(String(target))
  if (!fs.existsSync(resolved)) {
    p.cancel(`Path not found: ${resolved}`)
    process.exit(1)
  }

  const s = p.spinner()
  s.start('Scanning project...')
  const detected = detectStacks(resolved)
  s.stop(`Found ${detected.length} stack(s): ${detected.join(', ') || 'none'}`)

  const allStacks = listAvailableStacks()
  const remaining = allStacks.filter(s => !detected.includes(s))

  const additional = await p.multiselect({
    message: 'Select additional stacks (detected stacks are pre-selected):',
    options: [
      ...detected.map(s => ({ value: s, label: `${s} (detected)`, hint: 'auto-detected' })),
      ...remaining.map(s => ({ value: s, label: s })),
    ],
    initialValues: detected,
    required: false,
  })

  if (p.isCancel(additional)) { p.cancel('Cancelled'); process.exit(0) }

  const stacks = additional

  const toolchains = await p.multiselect({
    message: 'Which AI tools do you use?',
    options: [
      { value: 'kiro', label: 'Kiro' },
      { value: 'claude', label: 'Claude Code' },
      { value: 'opencode', label: 'OpenCode' },
      { value: 'gemini', label: 'Gemini' },
      { value: 'factory', label: 'Factory' },
    ],
    initialValues: ['kiro', 'claude'],
    required: true,
  })

  if (p.isCancel(toolchains)) { p.cancel('Cancelled'); process.exit(0) }

  const projectName = await p.text({
    message: 'Project name:',
    initialValue: path.basename(resolved),
  })

  if (p.isCancel(projectName)) { p.cancel('Cancelled'); process.exit(0) }

  // Summary
  p.note(
    `Path: ${resolved}\nStacks: ${stacks.join(', ')}\nToolchains: ${toolchains.join(', ')}`,
    'Setup Summary'
  )

  const confirm = await p.confirm({ message: 'Proceed?' })
  if (p.isCancel(confirm) || !confirm) { p.cancel('Cancelled'); process.exit(0) }

  // Bootstrap
  const s2 = p.spinner()
  s2.start('Bootstrapping project...')

  const { spawnSync } = await import('node:child_process')
  spawnSync('bun', [path.join(ROOT, 'bootstrap.mjs'), resolved, '--toolchains', toolchains.join(',')], { stdio: 'pipe' })

  // Write profile.toml
  const profilePath = path.join(resolved, '.agents', 'profile.toml')
  const profileContent = `[project]\nname = "${projectName}"\n\n[toolchains]\nenabled = [${toolchains.map(t => `"${t}"`).join(', ')}]\n\nstacks = [${stacks.map(s => `"${s}"`).join(', ')}]\n`
  fs.writeFileSync(profilePath, profileContent)

  s2.stop('Project bootstrapped')

  // Sync
  const s3 = p.spinner()
  s3.start('Syncing skills...')
  const syncResult = spawnSync('bun', [path.join(ROOT, 'sync.mjs'), resolved], { stdio: 'pipe' })
  const skillCount = fs.readdirSync(path.join(resolved, '.agents', 'skills'), { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== '_TEMPLATE').length
  s3.stop(`Synced ${skillCount} skills`)

  // Build
  const s4 = p.spinner()
  s4.start('Building tool configs...')
  spawnSync('bun', [path.join(resolved, '.agents', 'scripts', 'build.mjs')], { cwd: resolved, stdio: 'pipe' })
  s4.stop('Tool configs generated')

  p.outro(`Done! ${projectName} is ready with ${skillCount} skills across ${stacks.length} stacks.`)
}

main().catch(console.error)
