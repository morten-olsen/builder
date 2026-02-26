import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getClient } from '../client/client.js';
import { useEventStream } from '../contexts/event-stream.js';

type TerminalInfo = {
  id: string;
  cols: number;
  rows: number;
  shell: string;
  cwd: string;
  createdAt: string;
};

type TerminalExitState = {
  terminalId: string;
  exitCode: number;
};

type UseTerminalResult = {
  terminals: TerminalInfo[];
  isLoading: boolean;
  exitedTerminals: Map<string, number>;
  createTerminal: (id: string, cols?: number, rows?: number) => void;
  killTerminal: (terminalId: string) => void;
  subscribe: (terminalId: string) => void;
  unsubscribe: (terminalId: string) => void;
  write: (terminalId: string, data: string) => void;
  resize: (terminalId: string, cols: number, rows: number) => void;
  onData: (listener: (terminalId: string, data: string) => void) => () => void;
  onExit: (listener: (terminalId: string, exitCode: number) => void) => () => void;
};

const useTerminal = (sessionId: string): UseTerminalResult => {
  const queryClient = useQueryClient();
  const eventStream = useEventStream();
  const [exitedTerminals, setExitedTerminals] = useState<Map<string, number>>(new Map());
  const dataListenersRef = useRef(new Set<(terminalId: string, data: string) => void>());
  const exitListenersRef = useRef(new Set<(terminalId: string, exitCode: number) => void>());

  // Store eventStream in a ref to avoid re-running effects and recreating
  // callbacks every time the context value object changes identity
  const eventStreamRef = useRef(eventStream);
  useEffect(() => { eventStreamRef.current = eventStream; }, [eventStream]);

  const terminalsQuery = useQuery({
    queryKey: ['terminals', sessionId],
    queryFn: async () => {
      const { data, error } = await getClient().api.GET('/api/sessions/{sessionId}/terminals', {
        params: { path: { sessionId } },
      });
      if (error || !data) throw new Error('Failed to load terminals');
      return data as TerminalInfo[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: { id: string; cols?: number; rows?: number }) => {
      const { data, error } = await getClient().api.POST('/api/sessions/{sessionId}/terminals', {
        params: { path: { sessionId } },
        body: input,
      });
      if (error || !data) throw new Error('Failed to create terminal');
      return data as TerminalInfo;
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

  useEffect(() => {
    const es = eventStreamRef.current;

    const removeOutput = es.addTerminalOutputListener((sid, terminalId, data) => {
      if (sid !== sessionId) return;
      for (const listener of dataListenersRef.current) {
        listener(terminalId, data);
      }
    });

    const removeExit = es.addTerminalExitListener((sid, terminalId, exitCode) => {
      if (sid !== sessionId) return;
      setExitedTerminals((prev) => {
        const next = new Map(prev);
        next.set(terminalId, exitCode);
        return next;
      });
      for (const listener of exitListenersRef.current) {
        listener(terminalId, exitCode);
      }
      void queryClient.invalidateQueries({ queryKey: ['terminals', sessionId] });
    });

    return () => {
      removeOutput();
      removeExit();
    };
  }, [sessionId, queryClient]);

  const subscribe = useCallback((terminalId: string): void => {
    eventStreamRef.current.terminalSubscribe(sessionId, terminalId);
  }, [sessionId]);

  const unsubscribe = useCallback((terminalId: string): void => {
    eventStreamRef.current.terminalUnsubscribe(sessionId, terminalId);
  }, [sessionId]);

  const write = useCallback((terminalId: string, data: string): void => {
    eventStreamRef.current.terminalInput(sessionId, terminalId, data);
  }, [sessionId]);

  const resize = useCallback((terminalId: string, cols: number, rows: number): void => {
    eventStreamRef.current.terminalResize(sessionId, terminalId, cols, rows);
  }, [sessionId]);

  const createTerminal = useCallback((id: string, cols?: number, rows?: number): void => {
    createMutation.mutate({ id, cols, rows });
  }, [createMutation]);

  const killTerminal = useCallback((terminalId: string): void => {
    killMutation.mutate(terminalId);
  }, [killMutation]);

  const onData = useCallback((listener: (terminalId: string, data: string) => void): (() => void) => {
    dataListenersRef.current.add(listener);
    return () => {
      dataListenersRef.current.delete(listener);
    };
  }, []);

  const onExit = useCallback((listener: (terminalId: string, exitCode: number) => void): (() => void) => {
    exitListenersRef.current.add(listener);
    return () => {
      exitListenersRef.current.delete(listener);
    };
  }, []);

  return {
    terminals: terminalsQuery.data ?? [],
    isLoading: terminalsQuery.isLoading,
    exitedTerminals,
    createTerminal,
    killTerminal,
    subscribe,
    unsubscribe,
    write,
    resize,
    onData,
    onExit,
  };
};

export type { TerminalInfo, TerminalExitState, UseTerminalResult };
export { useTerminal };
