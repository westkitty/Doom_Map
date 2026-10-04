export type ScenarioMigration = (input: Record<string, unknown>) => Record<string, unknown>

export class ScenarioMigrationRegistry {
  private readonly migrations = new Map<number, ScenarioMigration>()

  register(fromVersion: number, migration: ScenarioMigration): void {
    if (!Number.isSafeInteger(fromVersion) || fromVersion < 1) throw new RangeError('Migration version must be a positive integer.')
    if (this.migrations.has(fromVersion)) throw new Error(`Migration already registered for version ${fromVersion}.`)
    this.migrations.set(fromVersion, migration)
  }

  migrate(input: Record<string, unknown>, targetVersion: number): Record<string, unknown> {
    const rawVersion = input.schemaVersion
    if (!Number.isSafeInteger(rawVersion) || (rawVersion as number) < 1) throw new Error('Scenario schemaVersion must be a positive integer.')
    if (!Number.isSafeInteger(targetVersion) || targetVersion < (rawVersion as number)) throw new RangeError('Target version must not go backwards.')

    let current = { ...input }
    let version = rawVersion as number
    while (version < targetVersion) {
      const migration = this.migrations.get(version)
      if (!migration) throw new Error(`No migration registered from schema version ${version}.`)
      current = migration(current)
      version += 1
      current.schemaVersion = version
    }
    return current
  }
}
