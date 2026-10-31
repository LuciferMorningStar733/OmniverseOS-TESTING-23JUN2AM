import { z } from 'zod';

export class ToolRegistry {
  constructor({ signal, permissions = [], maxCalls = 40, observe = () => {} } = {}) {
    this.tools = new Map();
    this.signal = signal;
    this.permissions = new Set(permissions);
    this.maxCalls = maxCalls;
    this.calls = 0;
    this.observe = observe;
  }
  register(tool) {
    for (const key of ['name', 'description', 'input', 'output', 'permissions', 'risk', 'timeout', 'retry', 'idempotent', 'run'])
      if (tool[key] === undefined) throw new Error(`Tool missing ${key}`);
    if (this.tools.has(tool.name)) throw new Error('Duplicate tool');
    this.tools.set(tool.name, tool);
    return this;
  }
  async execute(name, input) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unavailable tool: ${name}`);
    if (tool.permissions.some(p => !this.permissions.has(p))) throw new Error(`Permission denied: ${name}`);
    if (++this.calls > this.maxCalls) throw new Error('Tool-call budget exhausted');
    const parsed = tool.input.parse(input);
    const ctrl = new AbortController();
    let rejectAbort;
    const aborted = new Promise((_, reject) => { rejectAbort = reject; });
    const cancel = () => { ctrl.abort(); rejectAbort(new DOMException('Execution cancelled or timed out', 'AbortError')); };
    this.signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, tool.timeout);
    if (this.signal?.aborted) cancel();
    this.observe({ tool: name, status: 'running' });
    try {
      if (ctrl.signal.aborted) return await aborted;
      const result = tool.output.parse(await Promise.race([tool.run(parsed, ctrl.signal), aborted]));
      this.observe({ tool: name, status: 'observed' });
      return result;
    } catch (error) {
      this.observe({ tool: name, status: 'failed' });
      throw error;
    } finally {
      clearTimeout(timer);
      this.signal?.removeEventListener('abort', cancel);
    }
  }
}
export const schemas = {
  fileInput: z.object({ name: z.string().max(100), content: z.string().max(200000), parent: z.string().max(100), type: z.literal('file'), size: z.number().nonnegative() }).strict(),
  savedFile: z.object({ id: z.string(), name: z.string(), content: z.string(), parent: z.string() }).passthrough(),
  fileList: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
  empty: z.object({}).strict(),
  workspace: z.object({ files: z.array(z.object({ id: z.string(), name: z.string(), content: z.string().optional(), parent: z.string().optional() }).passthrough()), editor: z.object({ code: z.string(), lang: z.string() }).optional() }),
  previewInput: z.object({ files: z.array(z.object({ name: z.string(), content: z.string() }).passthrough()) }),
  previewOutput: z.object({ errors: z.array(z.string()), status: z.string().optional() }),
};
