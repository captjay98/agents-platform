import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export const ROOT = process.cwd()
export const AGENTS_ROOT = path.join(ROOT, '.agents')

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

export function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

export function writeUtf8(filePath, content) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, content, 'utf8')
}

export function removeIfExists(filePath) {
  if (!fs.existsSync(filePath)) return
  fs.rmSync(filePath, { recursive: true, force: true })
}

export function resetDir(dir) {
  removeIfExists(dir)
  ensureDir(dir)
}

export function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => path.join(dir, name))
}

export function listDirectories(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .map((entry) => entry.name)
    .sort()
}

export function resolveProjectName() {
  const pkgPath = path.join(ROOT, 'package.json')
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
      if (pkg.name) return pkg.name.replace(/^@[^/]+\//, '')
    } catch {}
  }
  return path.basename(ROOT)
}

export function titleCase(name) {
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function copyDirectory(src, dest) {
  removeIfExists(dest)
  ensureDir(path.dirname(dest))
  fs.cpSync(src, dest, { recursive: true, dereference: true })
}

export function basenameNoExt(filePath) {
  return path.basename(filePath, path.extname(filePath))
}

function normalizeFrontmatterValue(value) {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  return trimmed
}

export function parseFrontmatter(text) {
  const source = text.replace(/^\uFEFF/, '')
  if (!source.startsWith('---\n')) {
    return { frontmatter: {}, body: source, hasFrontmatter: false }
  }

  const end = source.indexOf('\n---\n', 4)
  if (end === -1) {
    return { frontmatter: {}, body: source, hasFrontmatter: false }
  }

  const rawFrontmatter = source.slice(4, end)
  const body = source.slice(end + '\n---\n'.length)
  const frontmatter = {}

  for (const line of rawFrontmatter.split('\n')) {
    if (!line.trim()) continue
    if (line.trimStart().startsWith('#')) continue
    if (/^\s/.test(line)) continue

    const idx = line.indexOf(':')
    if (idx === -1) continue

    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1)
    if (!key) continue
    frontmatter[key] = normalizeFrontmatterValue(value)
  }

  return { frontmatter, body, hasFrontmatter: true }
}

export function escapeTomlBasicString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/"/g, '\\"')
}

function normalizeNewlines(value) {
  return String(value ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function renderTomlMultilineString(value) {
  const normalized = normalizeNewlines(value).replace(/\n$/, '')

  // Prefer literal multi-line strings to avoid having to escape `\` sequences in prompts.
  // Fall back to basic multi-line strings if the content contains the literal delimiter.
  if (!normalized.includes("'''")) {
    return `'''\n${normalized}\n'''`
  }

  // Basic multi-line strings interpret escape sequences, so we must escape all backslashes.
  // Also escape the delimiter `"""` by escaping the first quote.
  const escaped = normalized.replace(/\\/g, '\\\\').replace(/"""/g, '\\"""')
  return `\"\"\"\n${escaped}\n\"\"\"`
}

export function renderGeminiCommandToml({ description, prompt }) {
  const desc = escapeTomlBasicString(description)
  return `description = "${desc}"\n\nprompt = ${renderTomlMultilineString(prompt)}\n`
}

export function expandIncludes(text, chain = []) {
  const includePattern = /\{\{include:([^}]+)\}\}/g

  return text.replace(includePattern, (_, includeRefRaw) => {
    const includeRef = includeRefRaw.trim().replace(/^\/+/, '')
    const includePath = path.join(AGENTS_ROOT, 'includes', includeRef)

    if (chain.includes(includePath)) {
      throw new Error(`Include cycle detected: ${[...chain, includePath].join(' -> ')}`)
    }

    if (!fs.existsSync(includePath)) {
      throw new Error(`Missing include file: ${includePath}`)
    }

    const included = readUtf8(includePath)
    return expandIncludes(included, [...chain, includePath])
  })
}

export function parseHooks() {
  const jsonPath = path.join(AGENTS_ROOT, 'hooks', 'hooks.json')
  const yamlPath = path.join(AGENTS_ROOT, 'hooks', 'hooks.yaml')
  const hooksPath = fs.existsSync(jsonPath) ? jsonPath : yamlPath

  if (!fs.existsSync(hooksPath)) {
    return { version: 1, hooks: [] }
  }

  const raw = readUtf8(hooksPath).trim()
  if (!raw) return { version: 1, hooks: [] }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error(`hooks.json parse error: ${error.message}`)
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('hooks.json must decode to an object')
  }

  if (!Array.isArray(parsed.hooks)) {
    throw new Error('hooks.json must contain hooks[]')
  }

  return {
    version: Number(parsed.version ?? 1),
    hooks: parsed.hooks,
  }
}

export function hooksForTool(allHooks, tool) {
  return allHooks.filter((hook) => Array.isArray(hook.tools) && hook.tools.includes(tool))
}

function loadMarkdownCollection(dir) {
  const files = listMarkdownFiles(dir)
  return files.map((filePath) => {
    const id = basenameNoExt(filePath)
    const raw = readUtf8(filePath)
    const expanded = expandIncludes(raw)
    const parsed = parseFrontmatter(expanded)

    return {
      id,
      filePath,
      raw: expanded,
      frontmatter: parsed.frontmatter,
      body: parsed.body,
      hasFrontmatter: parsed.hasFrontmatter,
    }
  })
}

export function loadCanonical() {
  const personas = loadMarkdownCollection(path.join(AGENTS_ROOT, 'personas')).map((item) => ({
    ...item,
    mode: String(item.frontmatter.mode ?? 'agent'),
    description: String(item.frontmatter.description ?? ''),
    model: String(item.frontmatter.model ?? 'inherit'),
  }))

  const commands = loadMarkdownCollection(path.join(AGENTS_ROOT, 'commands')).map((item) => ({
    ...item,
    description: String(item.frontmatter.description ?? ''),
  }))

  const rules = loadMarkdownCollection(path.join(AGENTS_ROOT, 'rules'))
  const steering = loadMarkdownCollection(path.join(AGENTS_ROOT, 'steering'))

  const skillsRoot = path.join(AGENTS_ROOT, 'skills')
  const skillDirs = listDirectories(skillsRoot).map((name) => {
    const skillPath = path.join(skillsRoot, name)
    const entrypoint = path.join(skillPath, 'SKILL.md')
    const raw = fs.existsSync(entrypoint) ? readUtf8(entrypoint) : ''
    const parsed = raw ? parseFrontmatter(raw) : { frontmatter: {}, hasFrontmatter: false }

    return {
      id: name,
      dirPath: skillPath,
      entrypoint,
      hasEntrypoint: fs.existsSync(entrypoint),
      frontmatter: parsed.frontmatter,
      hasFrontmatter: parsed.hasFrontmatter,
      description: String(parsed.frontmatter.description ?? ''),
    }
  })

  const memoryPath = path.join(AGENTS_ROOT, 'memory', 'project-memory.md')
  const memory = fs.existsSync(memoryPath) ? readUtf8(memoryPath) : ''

  const mcpServersPath = path.join(AGENTS_ROOT, 'mcp', 'servers.json')
  let mcpServers = null
  if (fs.existsSync(mcpServersPath)) {
    try {
      mcpServers = JSON.parse(readUtf8(mcpServersPath))
    } catch (error) {
      throw new Error(`Failed to parse MCP servers.json: ${error.message}`)
    }
  }

  return {
    personas,
    commands,
    rules,
    steering,
    skills: skillDirs,
    hooks: parseHooks(),
    memory,
    memoryPath,
    mcpServers,
  }
}

export function hashString(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function walkFiles(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []

  function visit(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        visit(fullPath)
      } else {
        out.push(fullPath)
      }
    }
  }

  visit(dir)
  return out
}

export function relativeFromRoot(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/')
}

export function renderGuide({ title, subtitle, toolName, canonical }) {
  const subagents = canonical.personas.filter((persona) => persona.mode === 'subagent').length

  const criticalPath = path.join(AGENTS_ROOT, 'guide-header.md')
  const criticalSection = fs.existsSync(criticalPath) ? fs.readFileSync(criticalPath, 'utf8').trim() : ''
  const criticalBlock = criticalSection ? `\n\n${criticalSection}` : ''

  return `# ${title}\n\n${subtitle}\n\n## Canonical Source\n\nThis file is generated from \`.agents\` by \`bun .agents/scripts/build.mjs\`.\n\n## Inventory\n\n- Personas: ${canonical.personas.length}\n- Subagents: ${subagents}\n- Commands: ${canonical.commands.length}\n- Skills: ${canonical.skills.length}\n- Rules: ${canonical.rules.length}\n- Steering docs: ${canonical.steering.length}${criticalBlock}\n\n## Tool Surface (${toolName})\n\n- Agents/subagents\n- Commands/prompts\n- Skills\n- Hooks\n- Project steering/rules\n\n## Regeneration\n\nRun:\n\n\`\`\`bash\nbun .agents/scripts/build.mjs\n\`\`\`\n\nStrict check:\n\n\`\`\`bash\nAGENTS_STRICT=1 bun .agents/scripts/build.mjs && bun .agents/scripts/lint.mjs && bun .agents/scripts/verify.mjs\n\`\`\`\n\nSign-off gate:\n\n\`\`\`bash\nbun .agents/scripts/signoff.mjs\n\`\`\`\n`
}

export function writeMarkdownSet(entries, targetDir, key = 'raw') {
  resetDir(targetDir)
  for (const entry of entries) {
    writeUtf8(path.join(targetDir, `${entry.id}.md`), String(entry[key] ?? entry.raw ?? ''))
  }
}

export function copySkills(skills, targetDir) {
  resetDir(targetDir)
  for (const skill of skills) {
    if (!skill.hasEntrypoint) continue
    copyDirectory(skill.dirPath, path.join(targetDir, skill.id))
  }
}

export function writeManifest(manifest) {
  writeUtf8(path.join(AGENTS_ROOT, 'render-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
}

function replaceProjectRootPlaceholder(value) {
  return String(value).replaceAll('${PROJECT_ROOT}', ROOT)
}

function normalizeServerForRender(config) {
  const server = { ...config }
  if (Array.isArray(server.args)) {
    server.args = server.args.map((arg) => replaceProjectRootPlaceholder(arg))
  }
  if (server.env && typeof server.env === 'object' && !Array.isArray(server.env)) {
    const nextEnv = {}
    for (const [key, value] of Object.entries(server.env)) {
      nextEnv[key] = replaceProjectRootPlaceholder(value)
    }
    server.env = nextEnv
  }
  return server
}

export function renderMcpConfig(mcpServers, format = 'kiro') {
  if (!mcpServers || !mcpServers.servers || typeof mcpServers.servers !== 'object') {
    return null
  }

  const servers = {}

  for (const [name, config] of Object.entries(mcpServers.servers)) {
    const server = normalizeServerForRender(config)

    if (format === 'kiro' || format === 'factory' || format === 'claude') {
      const { type, ...rest } = server
      servers[name] = rest
      continue
    }

    if (format === 'gemini') {
      const { disabled, autoApprove, type, ...rest } = server
      servers[name] = rest
      continue
    }

    if (format === 'opencode') {
      const { type, disabled, autoApprove, command, args, env, ...rest } = server
      const commandParts = [command, ...(Array.isArray(args) ? args : [])]
      const mapped = {
        type: type || 'local',
        command: commandParts,
        enabled: !disabled,
        ...rest,
      }
      if (env && typeof env === 'object' && !Array.isArray(env)) {
        mapped.environment = env
      }
      servers[name] = mapped
      continue
    }

    servers[name] = server
  }

  return servers
}

/**
 * Canonical list of generated file/directory targets.
 * Shared between build.mjs (manifest collection) and verify.mjs (manifest verification).
 * If the build writes a file, it must be in this list. If it's not build-managed, don't add it.
 */
export const GENERATED_FILE_TARGETS = [
  'AGENTS.md',
  '.mcp.json',
  '.claude/agents',
  '.claude/commands',
  '.claude/skills',
  '.claude/CLAUDE.md',
  '.claude/settings.json',
  '.gemini/agents',
  '.gemini/commands',
  '.gemini/GEMINI.md',
  '.gemini/hooks.json',
  '.gemini/settings.json',
  '.kiro/agents',
  '.kiro/prompts',
  '.kiro/skills',
  '.kiro/steering',
  '.kiro/hooks',
  '.kiro/settings/hooks.json',
  '.kiro/settings/mcp.json',
  '.kiro/README.md',
  '.factory/droids',
  '.factory/commands',
  '.factory/skills',
  '.factory/rules',
  '.factory/memories.md',
  '.factory/settings.json',
  '.factory/mcp.json',
  '.factory/FACTORY.md',
  '.opencode/agents',
  '.opencode/commands',
  '.opencode/skills',
  '.opencode/RULES.md',
  '.opencode/plugins/hooks.generated.ts',
  'opencode.json',
]
