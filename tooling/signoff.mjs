import { spawnSync } from 'node:child_process'
import path from 'node:path'

const ROOT = process.cwd()
const BUN = process.execPath

function run(scriptPath) {
  const result = spawnSync(
    BUN,
    [path.join('.agents', 'scripts', scriptPath)],
    {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
    },
  )
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('build.mjs')
run('lint.mjs')
run('verify.mjs')
run('check-mcp.mjs')
process.stdout.write('agents-signoff: ok\n')
