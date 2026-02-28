import fs from 'node:fs'
import path from 'node:path'
import {
  ROOT,
  hooksForTool,
  readUtf8,
  removeIfExists,
  renderMcpConfig,
  renderGeminiCommandToml,
  renderGuide,
  resetDir,
  titleCase,
  writeMarkdownSet,
  writeUtf8,
} from './common.mjs'

export const meta = {
  name: 'gemini',
  outputDirs: ['.gemini/agents', '.gemini/commands', '.gemini/GEMINI.md', '.gemini/hooks.json', '.gemini/settings.json'],
  mcpCapable: true,
}

const HOOK_EVENT_MAP = {
  session_start: 'sessionStart',
  before_tool: 'preToolCall',
  after_tool: 'postToolCall',
  session_end: 'sessionEnd',
}

function mapHooks(hooks, { strict }) {
  const warnings = []
  const mapped = {
    sessionStart: [],
    preToolCall: [],
    postToolCall: [],
    sessionEnd: [],
  }

  for (const hook of hooks) {
    const target = HOOK_EVENT_MAP[hook.event]
    if (!target) {
      const message = `gemini: unsupported hook event '${hook.event}' for hook '${hook.id}'`
      if (strict) throw new Error(message)
      warnings.push(message)
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

export function renderGemini(canonical, options = {}) {
  const strict = Boolean(options.strict)
  const prettyName = titleCase(options.projectName || 'Project')
  const warnings = []

  writeMarkdownSet(canonical.personas, path.join(ROOT, '.gemini', 'agents'))

  const commandDir = path.join(ROOT, '.gemini', 'commands')
  resetDir(commandDir)
  for (const command of canonical.commands) {
    const description = String(command.description || command.frontmatter.description || '')
    writeUtf8(
      path.join(commandDir, `${command.id}.toml`),
      renderGeminiCommandToml({ description, prompt: command.raw }),
    )
  }

  removeIfExists(path.join(ROOT, '.gemini', 'skills'))

  const mapped = mapHooks(hooksForTool(canonical.hooks.hooks, 'gemini'), { strict })
  warnings.push(...mapped.warnings)

  writeUtf8(
    path.join(ROOT, '.gemini', 'hooks.json'),
    JSON.stringify({ hooks: mapped.hooks }, null, 2) + '\n',
  )

  writeUtf8(
    path.join(ROOT, '.gemini', 'GEMINI.md'),
    renderGuide({
      title: `${prettyName} - Gemini Context`,
      subtitle: 'Generated Gemini guide for agents, commands, skills, and hooks.',
      toolName: 'Gemini CLI',
      canonical,
    }),
  )

  if (canonical.mcpServers) {
    const mcpServers = renderMcpConfig(canonical.mcpServers, 'gemini')
    if (mcpServers) {
      const settingsPath = path.join(ROOT, '.gemini', 'settings.json')
      let settings = {}
      if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(readUtf8(settingsPath))
      }
      settings.experimental = { subagents: true, ...(settings.experimental ?? {}) }
      settings.mcpServers = mcpServers
      writeUtf8(settingsPath, JSON.stringify(settings, null, 2) + '\n')
    }
  }

  return { warnings }
}
