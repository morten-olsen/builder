import type { Meta, StoryObj } from '@storybook/react-vite';

import { AssistantMessage } from './assistant-message.js';

const meta: Meta<typeof AssistantMessage> = {
  title: 'Composite/AssistantMessage',
  component: AssistantMessage,
};

type Story = StoryObj<typeof AssistantMessage>;

const SimpleText: Story = {
  args: {
    text: 'I\'ll help you refactor the authentication module. Let me start by reading the existing code.',
  },
};

const WithCodeBlock: Story = {
  args: {
    text: `Here's the updated function:

\`\`\`typescript
const validateToken = async (token: string): Promise<User> => {
  const payload = jwt.verify(token, SECRET);
  const user = await db.users.findById(payload.sub);
  if (!user) throw new AuthError('User not found');
  return user;
};
\`\`\`

This adds proper error handling for missing users.`,
  },
};

const WithHeadings: Story = {
  args: {
    text: `# Summary

I've completed the following changes:

## Authentication
- Added JWT token validation
- Implemented refresh token rotation
- Added rate limiting middleware

## Database
- Created new \`sessions\` table
- Added migration for \`users.last_login\` column

### Notes
Check the [migration guide](https://example.com) for details.`,
  },
};

const WithList: Story = {
  args: {
    text: `Found the following issues:

1. Missing error handling in \`auth.ts\`
2. The \`validateToken\` function doesn't check expiry
3. No rate limiting on login endpoint

Quick fixes:
- Add try/catch around JWT verification
- Use \`expiresIn\` option when signing tokens
- Add express-rate-limit middleware`,
  },
};

const InlineCode: Story = {
  args: {
    text: 'The issue is in the `handleSubmit` function where `event.preventDefault()` is missing. The form submits before `validateForm()` completes.',
  },
};

export default meta;
export { SimpleText, WithCodeBlock, WithHeadings, WithList, InlineCode };
