import type { Config } from "../config/config.js";

const destroy = Symbol('destroy');

type ServiceConstructor<T> = new (services: Services) => T;

class Services {
  #config: Config;
  #instances = new Map<ServiceConstructor<unknown>, unknown>();

  constructor(config: Config) {
    this.#config = config;
  }

  get config() {
    return this.#config;
  }

  get = <T>(Service: ServiceConstructor<T>): T => {
    let instance = this.#instances.get(Service as ServiceConstructor<unknown>);
    if (!instance) {
      instance = new Service(this);
      this.#instances.set(Service as ServiceConstructor<unknown>, instance);
    }
    return instance as T;
  };

  set = <T>(Service: ServiceConstructor<T>, instance: T): void => {
    this.#instances.set(Service as ServiceConstructor<unknown>, instance);
  };

  [destroy] = async (): Promise<void> => {
    for (const instance of this.#instances.values()) {
      const destroyable = instance as Record<typeof destroy, (() => Promise<void>) | undefined>;
      if (typeof destroyable[destroy] === 'function') {
        await destroyable[destroy]();
      }
    }
    this.#instances.clear();
  };
}

export type { ServiceConstructor };
export { Services, destroy };
