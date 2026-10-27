// @vitest-environment node
import { expect, it, vi } from 'vitest';
const { serve } = vi.hoisted(() => ({ serve: vi.fn() }));
vi.mock('@tanstack/react-start/server-entry', () => ({
  default: { fetch: serve },
}));
import staging from '../../staging';

it('blocks serialized paid actions and missing quota policy before provider/framework dispatch', async () => {
  const env = {
    STAGE_SCOPE: 'isolated-staging',
    STAGE_URL: 'https://stage.example',
    STAGE_VERSION: { id: 'fixture' },
  } as Parameters<typeof staging.fetch>[1];
  for (const [path, method] of [
    ['/_serverFn/fixture', 'POST'],
    ['/_serverFn/fixture', 'GET'],
    ['/_stage/check/quota', 'GET'],
  ]) {
    const response = await staging.fetch(
      new Request(`${env.STAGE_URL}${path}`, { method }),
      env,
    );
    expect(response.status).toBe(503);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  }
  expect(serve).not.toHaveBeenCalled();
  const response = await staging.fetch(
    new Request(`${env.STAGE_URL}/_stage/metadata`),
    env,
  );
  expect(await response.json()).toMatchObject({
    execution: 'disabled',
    sharedProductionBindings: false,
  });
});
