import { describe, it, expect, vi } from 'vitest';

import { createTestConfig } from '../config/config.testing.js';

import { Services, destroy } from './container.js';

describe('Services container', () => {
  it('lazily instantiates a service on first .get()', () => {
    const services = new Services(createTestConfig());

    class Dummy {
      value = 42;
      constructor(_services: Services) {}
    }

    const instance = services.get(Dummy);
    expect(instance).toBeInstanceOf(Dummy);
    expect(instance.value).toBe(42);
  });

  it('returns the same instance on subsequent .get() calls', () => {
    const services = new Services(createTestConfig());

    class Dummy {
      constructor(_services: Services) {}
    }

    const a = services.get(Dummy);
    const b = services.get(Dummy);
    expect(a).toBe(b);
  });

  it('allows overriding an instance via .set()', () => {
    const services = new Services(createTestConfig());

    class Dummy {
      constructor(_services: Services) {}
    }

    const override = new Dummy(services);
    services.set(Dummy, override);

    expect(services.get(Dummy)).toBe(override);
  });

  it('calls [destroy] on all destroyable instances during cleanup', async () => {
    const services = new Services(createTestConfig());
    const destroyFn = vi.fn();

    class Destroyable {
      [destroy] = destroyFn;
      constructor(_services: Services) {}
    }

    services.get(Destroyable);
    await services[destroy]();

    expect(destroyFn).toHaveBeenCalledOnce();
  });

  it('skips instances without [destroy] during cleanup', async () => {
    const services = new Services(createTestConfig());

    class Plain {
      constructor(_services: Services) {}
    }

    services.get(Plain);
    // should not throw
    await services[destroy]();
  });

  it('passes the Services container to the constructor', () => {
    const services = new Services(createTestConfig());
    let received: Services | null = null;

    class Inspector {
      constructor(s: Services) {
        received = s;
      }
    }

    services.get(Inspector);
    expect(received).toBe(services);
  });
});
