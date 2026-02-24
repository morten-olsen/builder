type MessageQueue<T> = AsyncIterable<T> & {
  push: (value: T) => void;
  end: () => void;
};

const createMessageQueue = <T>(): MessageQueue<T> => {
  const buffer: T[] = [];
  let resolve: ((value: IteratorResult<T>) => void) | null = null;
  let done = false;

  const push = (value: T): void => {
    if (done) return;
    if (resolve) {
      const r = resolve;
      resolve = null;
      r({ value, done: false });
    } else {
      buffer.push(value);
    }
  };

  const end = (): void => {
    done = true;
    if (resolve) {
      const r = resolve;
      resolve = null;
      r({ value: undefined as unknown as T, done: true });
    }
  };

  const iterator: AsyncIterator<T> = {
    next: (): Promise<IteratorResult<T>> => {
      if (buffer.length > 0) {
        const value = buffer.shift() as T;
        return Promise.resolve({ value, done: false });
      }
      if (done) {
        return Promise.resolve({ value: undefined as unknown as T, done: true });
      }
      return new Promise<IteratorResult<T>>((r) => {
        resolve = r;
      });
    },
  };

  return {
    push,
    end,
    [Symbol.asyncIterator]: () => iterator,
  };
};

export type { MessageQueue };
export { createMessageQueue };
