import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, open, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { reportDirectory, suiteDirectory } from '../utils/runtime'

type Project = 'chromium' | 'settings' | 'ai'
type ListedSuite = {
  specs: { tests: { projectName: string }[] }[]
  suites: ListedSuite[]
}

const cli = require.resolve('@playwright/test/cli')
const input = process.argv.slice(2)
const includeAi = input.includes('--include-ai')
const aiOnly = input.includes('--ai-only')
const args = input.filter((arg) => !['--include-ai', '--ai-only', '--list'].includes(arg))
const projects: Project[] = aiOnly ? ['ai'] : ['chromium', 'settings', ...(includeAi ? ['ai' as const] : [])]
const env = { ...process.env, E2E_RUN_ID: randomUUID(), E2E_PHASE: 'collection' }
let activeChild: ChildProcess | undefined
let interrupted = false

function command(args: string[], phase: string): Promise<number> {
  return new Promise((resolve, reject) => {
    activeChild = spawn(process.execPath, [cli, ...args], {
      cwd: suiteDirectory,
      env: { ...env, E2E_PHASE: phase },
      stdio: 'inherit',
    })
    activeChild.once('error', reject)
    activeChild.once('exit', (code) => { activeChild = undefined; resolve(code ?? 1) })
  })
}

function collectProjects(suites: ListedSuite[], found = new Set<string>()): Set<string> {
  for (const suite of suites) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) found.add(test.projectName)
    }
    collectProjects(suite.suites ?? [], found)
  }
  return found
}

async function main(): Promise<number> {
  // Report destinations, phase selection and dependencies belong to this runner.
  const reserved = ['--project', '--no-deps', '--config', '-c', '--reporter', '--output', '--shard', '--repeat-each']
  if (args.some((arg) => /^-c./.test(arg) || reserved.some((option) => arg === option || arg.startsWith(`${option}=`)))) {
    throw new Error('Select tests by file or --grep. Project, report and repeat options are managed by the runner.')
  }
  if (args.some((arg) => /^-j/.test(arg))) throw new Error('Use --workers with an integer from 1 to 4.')
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--workers' || args[index].startsWith('--workers=')) {
      const value = args[index].includes('=') ? args[index].split('=')[1] : args[index + 1]
      if (!/^[1-4]$/.test(value ?? '')) throw new Error('--workers must be an integer from 1 to 4.')
    }
  }
  const selection = projects.flatMap((project) => ['--project', project])
  if (input.includes('--list')) {
    return command(['test', ...args, ...selection, '--no-deps', '--list', '--reporter=list'], 'collection')
  }

  // Discover locally before resetting the shared site. Empty selections must not look green.
  const listed = spawnSync(process.execPath, [cli, 'test', ...args, ...selection,
    '--no-deps', '--list', '--reporter=json', '--pass-with-no-tests'], {
    cwd: suiteDirectory, env, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
  })
  if (listed.error) throw listed.error
  if (listed.status !== 0) {
    process.stderr.write(listed.stderr || listed.stdout)
    return listed.status ?? 1
  }
  const found = collectProjects(JSON.parse(listed.stdout).suites)
  const selected = projects.filter((project) => found.has(project))
  if (!selected.length) throw new Error('No tests matched. Use npm run test:list to inspect the available cases.')

  const runtimeRoot = path.join(suiteDirectory, '.runtime')
  await mkdir(runtimeRoot, { recursive: true, mode: 0o700 })
  const lockPath = path.join(runtimeRoot, 'run.lock')
  const lock = await open(lockPath, 'wx', 0o600).catch(() => {
    throw new Error('Another run holds .runtime/run.lock. If it was interrupted, confirm it has stopped before removing the lock.')
  })
  const runPath = path.join(runtimeRoot, env.E2E_RUN_ID)
  await lock.writeFile(String(process.pid))
  await lock.close()

  try {
    await mkdir(runPath, { mode: 0o700 })
    await rm(reportDirectory, { recursive: true, force: true })
    await mkdir(reportDirectory, { recursive: true })
    const results: Record<string, number> = {}

    if (interrupted) return 1
    console.log('\nPreparing the deployed site and fresh account states (once per run).')
    results.setup = await command(['test', '--project', 'setup', '--no-deps'], 'setup')
    if (results.setup === 0 && !interrupted) {
      for (const project of selected) {
        console.log(`\nRunning ${project}.`)
        // Product failures remain red but do not prevent the next isolated phase.
        results[project] = await command(['test', ...args, '--project', project, '--no-deps'], project)
        if (interrupted) break
      }
    }

    const merged = await command(['merge-reports', '--config', 'playwright.config.ts',
      path.join(reportDirectory, 'blob')], 'report')
    await writeFile(path.join(reportDirectory, 'run-summary.json'), JSON.stringify({
      target: process.env.BASE_URL ?? 'https://13.54.25.80',
      phases: results,
      reportExitCode: merged,
      interrupted,
    }, null, 2))
    console.log('\nReports: reports/latest/html, reports/latest/allure-results, reports/latest/junit.xml')
    return interrupted || merged !== 0 || Object.values(results).some((code) => code !== 0) ? 1 : 0
  } finally {
    // Saved sessions are useful only to the phases of this run.
    await rm(runPath, { recursive: true, force: true })
    await rm(lockPath, { force: true })
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => { interrupted = true; activeChild?.kill(signal) })
}

main().then((code) => { process.exitCode = code }).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'The test run could not complete.')
  process.exitCode = 1
})
