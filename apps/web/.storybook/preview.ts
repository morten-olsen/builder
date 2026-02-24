import type { Preview } from 'storybook';
import '../src/app.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0c0c0c' },
        { name: 'surface-1', value: '#141414' },
      ],
    },
  },
};

export default preview;
