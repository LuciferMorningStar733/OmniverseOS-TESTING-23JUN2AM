/** @jest-environment jsdom */
import { isCodeTask, parseProject, previewDocument, requestCode, executeCodeTask } from '../lib/cortexExecution';
import { aiApi, crud } from '../lib/api';
jest.mock('../lib/api', () => ({ aiApi: { chatStreamResilient: jest.fn() }, crud: jest.fn(), getPreferredProvider: () => 'auto', getAuthToken: () => 'test-account' }));
beforeAll(() => { Object.defineProperty(global, 'crypto', { value: { randomUUID: () => Math.random().toString(36) }, configurable: true }); });
beforeEach(() => jest.clearAllMocks());
test('execution intent takes priority over opening; explanations remain chat', () => {
  expect(isCodeTask('Open Code and build Flappy Bird game')).toBe(true);
  expect(isCodeTask('Open Code and start building me a Flappy Bird game')).toBe(true);
  expect(isCodeTask('Explain how to build a game')).toBe(false);
  expect(isCodeTask('Open Code')).toBe(false);
});
test.each(['../x.html', '/index.html', 'x.exe'])('reject unsafe filename %s', name => {
  expect(() => parseProject(JSON.stringify({ files: [{ name, content: 'x' }] }))).toThrow();
});
test('reject duplicate names and missing entry', () => {
  expect(() => parseProject(JSON.stringify({ files: [{ name: 'x.js', content: '' }] }))).toThrow();
  expect(() => parseProject(JSON.stringify({ files: [{ name: 'index.html', content: '' }, { name: 'index.html', content: '' }] }))).toThrow();
});
test('inline project files and restrict network in preview', () => {
  const html = previewDocument([{ name: 'index.html', content: '<script src="game.js"></script>' }, { name: 'game.js', content: 'console.log(1)' }]);
  expect(html).toContain('connect-src');
  expect(html).toContain('console.log(1)');
  expect(() => previewDocument([{ name: 'index.html', content: '<script src="https://evil.test/x.js"></script>' }])).toThrow('Missing local script');
});
test('missing editor times out instead of reporting success', async () => {
  await expect(requestCode('inspect', {}, undefined, 5)).rejects.toThrow('timed out');
});
test('cancel bridge request', async () => {
  const ctrl = new AbortController();
  const promise = requestCode('inspect', {}, ctrl.signal);
  ctrl.abort();
  await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
});
test('saves real files, reads them back, and delivers an unverified runtime result', async () => {
  let saved = [];
  crud.mockReturnValue({ create: jest.fn(async f => { const record = { ...f, id: 'file1' }; saved.push(record); return record; }), list: jest.fn(async () => saved) });
  aiApi.chatStreamResilient.mockImplementation(async (_, delta) => delta(JSON.stringify({ files: [{ name: 'index.html', content: '<h1>Game</h1>' }] })));
  const handler = e => window.dispatchEvent(new CustomEvent('cortex:code:result', { detail: {
    id: e.detail.id, result: e.detail.action === 'inspect' ? { files: [] } : { errors: [] },
  } }));
  window.addEventListener('cortex:code:request', handler);
  try {
    const result = await executeCodeTask('Build a game', { openApp: jest.fn() });
    expect(saved).toHaveLength(1);
    expect(result.status).toBe('needs_verification');
    expect(result.content).toContain('independent browser verification');
  } finally { window.removeEventListener('cortex:code:request', handler); }
});
test('malformed provider output stops after bounded corrections', async () => {
  aiApi.chatStreamResilient.mockImplementation(async (_, delta) => delta('not JSON'));
  const handler = e => window.dispatchEvent(new CustomEvent('cortex:code:result', { detail: { id: e.detail.id, result: { files: [] } } }));
  window.addEventListener('cortex:code:request', handler);
  try {
    await expect(executeCodeTask('Build a game', { openApp: jest.fn() })).rejects.toThrow('3 attempts');
    expect(aiApi.chatStreamResilient).toHaveBeenCalledTimes(3);
  } finally { window.removeEventListener('cortex:code:request', handler); }
});
test('preserves an unsaved buffer before replacing the editor', async () => {
  const saved = [];
  crud.mockReturnValue({ create: jest.fn(async f => { const record = { ...f, id: String(saved.length) }; saved.push(record); return record; }), list: jest.fn(async () => saved) });
  aiApi.chatStreamResilient.mockImplementation(async (_, delta) => delta(JSON.stringify({ files: [{ name: 'index.html', content: '<h1>New</h1>' }] })));
  const handler = e => window.dispatchEvent(new CustomEvent('cortex:code:result', { detail: {
    id: e.detail.id, result: e.detail.action === 'inspect' ? { files: [], editor: { code: 'valuable unsaved code', lang: 'javascript' } } : { errors: [] },
  } }));
  window.addEventListener('cortex:code:request', handler);
  try {
    await executeCodeTask('Build a game', { openApp: jest.fn() });
    expect(saved[0].content).toBe('valuable unsaved code');
    expect(saved[0].parent).toMatch(/^cortex-backup-/);
    expect(saved[1].name).toBe('index.html');
  } finally { window.removeEventListener('cortex:code:request', handler); }
});
test('cannot report saved output when readback is missing', async () => {
  crud.mockReturnValue({ create: jest.fn(async f => ({ ...f, id: 'missing' })), list: jest.fn(async () => []) });
  aiApi.chatStreamResilient.mockImplementation(async (_, delta) => delta(JSON.stringify({ files: [{ name: 'index.html', content: '<h1>New</h1>' }] })));
  const handler = e => window.dispatchEvent(new CustomEvent('cortex:code:result', { detail: { id: e.detail.id, result: { files: [] } } }));
  window.addEventListener('cortex:code:request', handler);
  try {
    await expect(executeCodeTask('Build a game', { openApp: jest.fn() })).rejects.toThrow('Save verification failed');
  } finally { window.removeEventListener('cortex:code:request', handler); }
});
