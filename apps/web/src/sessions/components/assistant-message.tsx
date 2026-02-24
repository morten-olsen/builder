import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

type AssistantMessageProps = {
  text: string;
};

const customStyle: Record<string, React.CSSProperties> = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...(oneDark['pre[class*="language-"]'] as React.CSSProperties | undefined),
    background: '#1a1a1a',
    margin: 0,
    borderRadius: '0.375rem',
    fontSize: '0.75rem',
    lineHeight: '1.625',
  },
  'code[class*="language-"]': {
    ...(oneDark['code[class*="language-"]'] as React.CSSProperties | undefined),
    background: 'transparent',
    fontSize: '0.75rem',
  },
};

const AssistantMessage = ({ text }: AssistantMessageProps): React.ReactNode => (
  <div className="prose-invert max-w-none px-4 py-2.5 font-mono text-xs leading-relaxed text-text-base [&_a]:text-accent [&_a]:underline [&_code]:rounded [&_code]:bg-surface-3 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-ui [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-sm [&_h1]:font-medium [&_h1]:text-text-bright [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-xs [&_h2]:font-medium [&_h2]:text-text-bright [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-xs [&_h3]:font-medium [&_h3]:text-text-bright [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:pl-5 [&_p]:my-1 [&_pre]:my-2 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className ?? '');
          const code = String(children).replace(/\n$/, '');
          if (match) {
            return (
              <SyntaxHighlighter
                style={customStyle}
                language={match[1]}
                PreTag="div"
              >
                {code}
              </SyntaxHighlighter>
            );
          }
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {text}
    </Markdown>
  </div>
);

export { AssistantMessage };
