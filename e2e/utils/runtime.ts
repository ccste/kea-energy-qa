import path from 'node:path'

export const suiteDirectory = path.resolve(__dirname, '..')
export const reportDirectory = path.join(suiteDirectory, 'reports', 'latest')

export function runDirectory(): string {
  const id = process.env.E2E_RUN_ID
  if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) {
    throw new Error('A valid E2E_RUN_ID is required. Run tests through npm test.')
  }
  return path.join(suiteDirectory, '.runtime', id)
}

export function authStatePath(customerId: string): string {
  return path.join(runDirectory(), 'auth', `${customerId}.json`)
}
