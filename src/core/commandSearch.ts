export interface SearchableCommand {
  id: string
  label: string
  keywords?: readonly string[]
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export function filterCommands<T extends SearchableCommand>(commands: readonly T[], query: string): T[] {
  const normalized = normalize(query)
  if (!normalized) return [...commands]
  const tokens = normalized.split(/\s+/).filter(Boolean)
  return commands.filter((command) => {
    const haystack = normalize([command.label, command.id, ...(command.keywords ?? [])].join(' '))
    return tokens.every((token) => haystack.includes(token))
  })
}
