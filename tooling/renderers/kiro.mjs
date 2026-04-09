import fs from 'node:fs'
import path from 'node:path'
import {
  ROOT,
  AGENTS_ROOT,
  copySkills,
  hooksForTool,
  ensureDir,
  readUtf8,
  renderGuide,
  renderMcpConfig,
  resetDir,
  titleCase,
  writeMarkdownSet,
  writeUtf8,
} from './common.mjs'

export const meta = {
  name: 'kiro',
  outputDirs: ['.kiro/agents', '.kiro/prompts', '.kiro/skills', '.kiro/steering', '.kiro/hooks', '.kiro/settings/hooks.json', '.kiro/README.md'],
  mcpCapable: true,
}

const HOOK_EVENT_MAP = {
  session_start: 'agentSpawn',
  before_tool: 'preToolUse',
  after_tool: 'postToolUse',
  prompt_submit: 'userPromptSubmit',
  session_end: 'sessionEnd',
}

function renderKiroAgentMarkdown(persona, template) {
  const description = persona.description || template.description || ''
  const model = template.model || persona.model || 'auto'
  const body = String(persona.body ?? persona.raw ?? '').trimStart()
  const mcpTools = Array.isArray(template.tools)
    ? template.tools.filter((tool) => typeof tool === 'string' && tool.startsWith('@'))
    : []
  const tools = ['@builtin', '@sequential-thinking', ...mcpTools.filter((tool) => tool !== '@builtin' && tool !== '@sequential-thinking')]

  const frontmatter = [
    '---',
    `name: ${persona.id}`,
    `description: ${JSON.stringify(description)}`,
    `tools: ${JSON.stringify(tools)}`,
    `model: ${model}`,
    '---',
    '',
  ].join('\n')

  return `${frontmatter}${body}\n`
}

function renderKiroManualHook(command, projectName) {
  const description = command.frontmatter?.description || `${projectName} ${command.id} workflow`
  const prompt = String(command.body ?? command.raw ?? '').trim()
  const hook = {
    name: command.id,
    description,
    when: { type: 'userTriggered' },
    then: { type: 'askAgent', prompt },
  }
  return JSON.stringify(hook, null, 2) + '\n'
}

function mapHooks(hooks, { strict }) {
  const warnings = []
  const mapped = {
    agentSpawn: [],
    preToolUse: [],
    postToolUse: [],
    userPromptSubmit: [],
    sessionEnd: [],
  }

  for (const hook of hooks) {
    const target = HOOK_EVENT_MAP[hook.event]
    if (!target) {
      const message = `kiro: unsupported hook event '${hook.event}' for hook '${hook.id}'`
      if (strict) throw new Error(message)
      warnings.push(message)
      continue
    }

    if (target === 'agentSpawn' || target === 'userPromptSubmit' || target === 'sessionEnd') {
      mapped[target].push({ command: hook.command })
      continue
    }

    mapped[target].push({ matcher: hook.matcher, command: hook.command })
  }

  const compact = {}
  for (const [key, value] of Object.entries(mapped)) {
    if (value.length) compact[key] = value
  }

  return { hooks: compact, warnings }
}

function defaultTemplateForPersona(persona) {
  return {
    name: persona.id,
    description: persona.description || `${persona.id} subagent`,
    prompt: `file://./${persona.id}.md`,
    tools: ['@builtin', '@sequential-thinking'],
    model: persona.model || 'auto',
  }
}

export function renderKiro(canonical, options = {}) {
  const strict = Boolean(options.strict)
  const projectName = options.projectName || 'Project'
  const prettyName = titleCase(projectName)
  const warnings = []

  const subagents = canonical.personas.filter((persona) => persona.mode === 'subagent')
  const agentDir = path.join(ROOT, '.kiro', 'agents')
  resetDir(agentDir)

  for (const persona of subagents) {
    const templatePath = path.join(AGENTS_ROOT, 'kiro', 'templates', `${persona.id}.json`)
    const hasTemplate = fs.existsSync(templatePath)
    if (!hasTemplate) {
      warnings.push(`kiro: missing template for '${persona.id}', using default template`)
    }

    const template = hasTemplate
      ? JSON.parse(readUtf8(templatePath))
      : defaultTemplateForPersona(persona)
    template.name = persona.id
    template.description = persona.description || template.description
    template.prompt = `file://./${persona.id}.md`

    writeUtf8(path.join(agentDir, `${persona.id}.json`), JSON.stringify(template, null, 2) + '\n')
    writeUtf8(path.join(agentDir, `${persona.id}.md`), renderKiroAgentMarkdown(persona, template))
  }

  writeMarkdownSet(canonical.commands, path.join(ROOT, '.kiro', 'prompts'))
  copySkills(canonical.skills, path.join(ROOT, '.kiro', 'skills'))
  writeMarkdownSet(canonical.steering, path.join(ROOT, '.kiro', 'steering'))

  const hooksDir = path.join(ROOT, '.kiro', 'hooks')
  ensureDir(hooksDir)
  for (const entry of fs.readdirSync(hooksDir)) {
    if (entry.endsWith('.kiro.hook')) {
      fs.rmSync(path.join(hooksDir, entry), { force: true })
    }
  }
  for (const command of canonical.commands) {
    writeUtf8(path.join(hooksDir, `${command.id}.kiro.hook`), renderKiroManualHook(command, prettyName))
  }

  const mapped = mapHooks(hooksForTool(canonical.hooks.hooks, 'kiro'), { strict })
  warnings.push(...mapped.warnings)
  writeUtf8(
    path.join(ROOT, '.kiro', 'settings', 'hooks.json'),
    JSON.stringify({ hooks: mapped.hooks }, null, 2) + '\n',
  )

  writeUtf8(
    path.join(ROOT, '.kiro', 'README.md'),
    renderGuide({
      title: `${prettyName} - Kiro Configuration`,
      subtitle: 'Generated Kiro configuration guide for agents, prompts, skills, steering, and hooks.',
      toolName: 'Kiro CLI',
      canonical,
    }),
  )

  const hasDefinedServers = canonical.mcpServers?.servers && Object.keys(canonical.mcpServers.servers).length > 0
  if (hasDefinedServers) {
    const mcpServers = renderMcpConfig(canonical.mcpServers, 'kiro')
    if (mcpServers) {
      writeUtf8(
        path.join(ROOT, '.kiro', 'settings', 'mcp.json'),
        JSON.stringify({ mcpServers }, null, 2) + '\n',
      )
    }
  }

  return { warnings }
}
