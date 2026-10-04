import { describe, expect, it } from 'vitest'
import { filterCommands } from '../src/core/commandSearch'
const commands = [{ id:'north-up',label:'North up',keywords:['orientation','camera'] },{ id:'copy-target',label:'Copy selected coordinates',keywords:['target'] },{ id:'diagnostics',label:'Copy diagnostics',keywords:['performance','renderer'] }]
describe('command search', () => {
  it('matches labels, ids, and keywords', () => { expect(filterCommands(commands,'north')).toHaveLength(1); expect(filterCommands(commands,'selected target')[0]?.id).toBe('copy-target'); expect(filterCommands(commands,'renderer performance')[0]?.id).toBe('diagnostics') })
  it('returns all commands for an empty query', () => { expect(filterCommands(commands,'')).toHaveLength(commands.length) })
})
