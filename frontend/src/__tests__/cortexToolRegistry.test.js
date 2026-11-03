import { z } from 'zod';
import { ToolRegistry } from '../lib/cortexToolRegistry';
const makeTool = run => ({ name: 'inspect', description: 'inspect workspace', input: z.object({}).strict(), output: z.string(), permissions: ['read'], risk: 'read', timeout: 20, retry: 0, idempotent: true, run });
test('denies unknown tools, unauthorized tools and invalid input', async () => {
  const registry = new ToolRegistry();
  registry.register(makeTool(async () => 'ok'));
  await expect(registry.execute('shell', {})).rejects.toThrow('Unavailable');
  await expect(registry.execute('inspect', {})).rejects.toThrow('Permission');
  const allowed = new ToolRegistry({ permissions: ['read'] });
  allowed.register(makeTool(async () => 'ok'));
  await expect(allowed.execute('inspect', { extra: 1 })).rejects.toThrow();
});
test('observes output, validates schemas, and enforces call budget', async () => {
  const observe = jest.fn();
  const registry = new ToolRegistry({ permissions: ['read'], maxCalls: 1, observe });
  registry.register(makeTool(async () => 'ok'));
  expect(await registry.execute('inspect', {})).toBe('ok');
  expect(observe).toHaveBeenCalledWith({ tool: 'inspect', status: 'observed' });
  await expect(registry.execute('inspect', {})).rejects.toThrow('budget');
});
test('times out a hanging implementation and propagates cancellation', async () => {
  const registry = new ToolRegistry({ permissions: ['read'] });
  registry.register(makeTool(() => new Promise(() => {})));
  await expect(registry.execute('inspect', {})).rejects.toMatchObject({ name: 'AbortError' });
  const ctrl = new AbortController();
  const cancelled = new ToolRegistry({ signal: ctrl.signal, permissions: ['read'] });
  cancelled.register(makeTool(() => new Promise(() => {})));
  ctrl.abort();
  await expect(cancelled.execute('inspect', {})).rejects.toMatchObject({ name: 'AbortError' });
});
