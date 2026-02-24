import { join } from 'node:path';

const frontendPath = join(import.meta.dirname, './dist');

export { frontendPath };
