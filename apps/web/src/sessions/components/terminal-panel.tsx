import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

import { getClient } from '../../client/client.js';
import { useEventStream } from '../../contexts/event-stream.js';
import { Button } from '../../components/ui/button.js';

type TerminalTabProps = {
  sessionId: string;
  terminalId: string;
};

const TerminalTab = ({ sessionId, terminalId }: TerminalTabProps): React.ReactNode => {
  const containerRef = useRef<HTMLDivElement>(null);
  const eventStream = useEventStream();
  const esRef = useRef(eventStream);
  useEffect(() => { esRef.current = eventStream; }, [eventStream]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      theme: {
        background: '#0a0a0a',
        foreground: '#e0e0e0',
        cursor: '#e0e0e0',
        selectionBackground: '#3a3a3a',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);

    requestAnimationFrame(() => {
      fitAddon.fit();
      esRef.current.terminalResize(sessionId, terminalId, term.cols, term.rows);
      term.focus();
    });

    term.onData((data) => {
      esRef.current.terminalInput(sessionId, terminalId, data);
    });

    esRef.current.terminalSubscribe(sessionId, terminalId);

    const removeOutput = esRef.current.addTerminalOutputListener((sid, tid, data) => {
      if (sid === sessionId && tid === terminalId) {
        term.write(data);
      }
    });

    const removeExit = esRef.current.addTerminalExitListener((sid, tid, exitCode) => {
      if (sid === sessionId && tid === terminalId) {
        term.write(`\r\n\x1b[90m[process exited with code ${exitCode}]\x1b[0m\r\n`);
      }
    });

    const handleResize = (): void => {
      fitAddon.fit();
      esRef.current.terminalResize(sessionId, terminalId, term.cols, term.rows);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      removeOutput();
      removeExit();
      esRef.current.terminalUnsubscribe(sessionId, terminalId);
      term.dispose();
    };
  }, [sessionId, terminalId]);

  return <div ref={containerRef} className="h-full w-full" />;
};

type TerminalPanelProps = {
  sessionId: string;
};

const TerminalPanel = ({ sessionId }: TerminalPanelProps): React.ReactNode => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const counterRef = useRef(0);

  const terminalsQuery = useQuery({
    queryKey: ['terminals', sessionId],
    queryFn: async () => {
      const { data, error } = await getClient().api.GET('/api/sessions/{sessionId}/terminals', {
        params: { path: { sessionId } },
      });
      if (error || !data) throw new Error('Failed to load terminals');
      return data;
    },
  });

  const terminals = terminalsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: async (input: { id: string }) => {
      const { data, error } = await getClient().api.POST('/api/sessions/{sessionId}/terminals', {
        params: { path: { sessionId } },
        body: input,
      });
      if (error || !data) throw new Error('Failed to create terminal');
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['terminals', sessionId] });
    },
  });

  const killMutation = useMutation({
    mutationFn: async (terminalId: string) => {
      await getClient().api.DELETE('/api/sessions/{sessionId}/terminals/{terminalId}', {
        params: { path: { sessionId, terminalId } },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['terminals', sessionId] });
    },
  });

  const handleCreate = useCallback((): void => {
    counterRef.current += 1;
    const id = `t${counterRef.current}`;
    createMutation.mutate({ id });
    setActiveTab(id);
  }, [createMutation]);

  // Auto-create first terminal
  useEffect(() => {
    if (!terminalsQuery.isLoading && terminals.length === 0 && counterRef.current === 0) {
      handleCreate();
    }
  }, [terminalsQuery.isLoading, terminals.length, handleCreate]);

  // Set active tab if none set but terminals exist
  useEffect(() => {
    if (activeTab === null && terminals.length > 0) {
      setActiveTab(terminals[0].id);
    }
  }, [activeTab, terminals]);

  // Sync counter to avoid id conflicts with existing terminals
  useEffect(() => {
    for (const t of terminals) {
      const match = /^t(\d+)$/.exec(t.id);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= counterRef.current) {
          counterRef.current = num;
        }
      }
    }
  }, [terminals]);

  const handleKill = useCallback((terminalId: string): void => {
    killMutation.mutate(terminalId);
    setActiveTab((prev) => {
      if (prev !== terminalId) return prev;
      const remaining = terminals.filter((t) => t.id !== terminalId);
      return remaining.length > 0 ? remaining[0].id : null;
    });
  }, [killMutation, terminals]);

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      {/* Tab bar */}
      <div className="flex shrink-0 items-center gap-0 border-b border-border-base bg-surface-1 px-1">
        {terminals.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`group flex items-center gap-1.5 border-b-2 px-3 py-1.5 font-mono text-ui transition-colors ${
              activeTab === t.id
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-accent/60'
            }`}
          >
            <span>{t.id}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleKill(t.id);
              }}
              className={`ml-0.5 rounded px-0.5 text-text-muted/40 hover:text-danger ${
                activeTab === t.id ? 'inline' : 'hidden group-hover:inline'
              }`}
            >
              x
            </span>
          </button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreate}
          className="ml-1 px-2 py-1 font-mono text-ui text-text-muted hover:text-accent"
        >
          +
        </Button>
      </div>

      {/* Terminal area — only render the active tab */}
      <div className="relative flex-1 overflow-hidden p-1">
        {activeTab && terminals.some((t) => t.id === activeTab) && (
          <TerminalTab
            key={activeTab}
            sessionId={sessionId}
            terminalId={activeTab}
          />
        )}
        {terminals.length === 0 && !terminalsQuery.isLoading && (
          <div className="flex h-full items-center justify-center">
            <p className="font-mono text-xs text-text-muted">no terminals</p>
          </div>
        )}
      </div>
    </div>
  );
};

export { TerminalPanel };
