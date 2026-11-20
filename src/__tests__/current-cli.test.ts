import {
  CodexToolHandler,
  ReviewToolHandler,
  HelpToolHandler,
} from '../tools/handlers.js';
import { InMemorySessionStorage } from '../session/storage.js';
import { executeCommand } from '../utils/command.js';
import { toolDefinitions } from '../tools/definitions.js';

jest.mock('../utils/command.js', () => ({ executeCommand: jest.fn() }));
const execute = jest.mocked(executeCommand);
const codex = new CodexToolHandler(new InMemorySessionStorage());
const review = new ReviewToolHandler();

beforeEach(() => {
  execute.mockReset();
  execute.mockResolvedValue({ stdout: 'ok', stderr: '' });
});

test.each(['max', 'ultra'])(
  'passes current reasoning effort %s',
  async (effort) => {
    await codex.execute({ prompt: 'Analyze', reasoningEffort: effort });
    expect(execute.mock.calls[0][1]).toContain(
      `model_reasoning_effort="${effort}"`
    );
  }
);

test('maps fullAuto to supported sandbox and approval config', async () => {
  await codex.execute({ prompt: 'Update', fullAuto: true });
  const args = execute.mock.calls[0][1] || [];
  expect(args).not.toContain('--full-auto');
  expect(args).toEqual(
    expect.arrayContaining([
      '--sandbox',
      'workspace-write',
      'approval_policy="on-request"',
    ])
  );
});

test('keeps an explicit sandbox with fullAuto', async () => {
  await codex.execute({
    prompt: 'Analyze',
    fullAuto: true,
    sandbox: 'read-only',
  });
  const args = execute.mock.calls[0][1] || [];
  expect(args.filter((arg) => arg === '--sandbox')).toHaveLength(1);
  expect(args[args.indexOf('--sandbox') + 1]).toBe('read-only');
});

test('passes images, search, schema, profile and ephemeral options', async () => {
  await codex.execute({
    prompt: 'Analyze',
    images: ['/tmp/a.png'],
    search: true,
    outputSchema: '/tmp/schema.json',
    profile: 'reviewer',
    ephemeral: true,
  });
  const args = execute.mock.calls[0][1] || [];
  expect(args.slice(0, 2)).toEqual(['--search', 'exec']);
  expect(args).toEqual(
    expect.arrayContaining([
      '--image',
      '/tmp/a.png',
      '--output-schema',
      '/tmp/schema.json',
      '--profile',
      'reviewer',
      '--ephemeral',
    ])
  );
});

test('rejects ephemeral sessions rather than returning an unusable resume id', async () => {
  await expect(
    codex.execute({ prompt: 'Analyze', sessionId: 'test', ephemeral: true })
  ).rejects.toThrow();
  expect(execute).not.toHaveBeenCalled();
});

test.each([{ base: 'main' }, { commit: 'HEAD' }, { uncommitted: true }])(
  'rejects prompt plus target %j before spawning',
  async (target) => {
    await expect(
      review.execute({ prompt: 'Security', ...target })
    ).rejects.toThrow();
    expect(execute).not.toHaveBeenCalled();
  }
);

test.each([
  { base: 'main', commit: 'HEAD' },
  { base: 'main', uncommitted: true },
  { commit: 'HEAD', uncommitted: true },
])('rejects multiple review targets %j', async (target) => {
  await expect(review.execute(target)).rejects.toThrow();
  expect(execute).not.toHaveBeenCalled();
});

test('passes review reasoning effort', async () => {
  await review.execute({ commit: 'HEAD', reasoningEffort: 'ultra' });
  expect(execute.mock.calls[0][1]).toContain('model_reasoning_effort="ultra"');
});

test('exposes version and detailed CLI help', async () => {
  const help = new HelpToolHandler();
  await help.execute({ command: 'version' });
  expect(execute).toHaveBeenLastCalledWith('codex', ['--version']);
  await help.execute({ command: 'resume' });
  expect(execute).toHaveBeenLastCalledWith('codex', [
    'exec',
    'resume',
    '--help',
  ]);
});

test('advertises the new effort values and CLI options to clients', () => {
  const definition = toolDefinitions.find((tool) => tool.name === 'codex');
  expect(definition?.inputSchema.properties.reasoningEffort).toMatchObject({
    enum: expect.arrayContaining(['max', 'ultra']),
  });
  expect(definition?.inputSchema.properties).toHaveProperty('images');
  expect(definition?.inputSchema.properties).toHaveProperty('ephemeral');
});

test('attaches images to the resumed turn without swallowing the id or prompt', async () => {
  const storage = new InMemorySessionStorage();
  storage.ensureSession('images');
  storage.setCodexConversationId('images', 'thread-123');
  await new CodexToolHandler(storage).execute({
    prompt: 'Describe',
    sessionId: 'images',
    images: ['/tmp/a.png'],
    outputSchema: '/tmp/schema.json',
    profile: 'reviewer',
  });
  const args = execute.mock.calls[0][1] || [];
  expect(args.slice(args.indexOf('resume'))).toEqual([
    'resume',
    '--image',
    '/tmp/a.png',
    '--output-schema',
    '/tmp/schema.json',
    '--',
    'thread-123',
    'Describe',
  ]);
  expect(args.indexOf('--profile')).toBeLessThan(args.indexOf('resume'));
});

test('keeps an image-only request prompt as a positional argument', async () => {
  await codex.execute({ prompt: 'Describe', images: ['/tmp/a.png'] });
  const args = execute.mock.calls[0][1] || [];
  expect(args.slice(-4)).toEqual(['--image', '/tmp/a.png', '--', 'Describe']);
});
