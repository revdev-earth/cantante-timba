"use client";

import { Component, useEffect, useState, type ReactNode } from "react";

type LogEntry = { kind: string; text: string; at: number };

const listeners = new Set<(e: LogEntry) => void>();

function pushLog(kind: string, text: string) {
  const entry = { kind, text, at: Date.now() };
  for (const l of listeners) l(entry);
}

/** Error boundary: captura errores de render de React y los muestra. */
export class DebugBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    pushLog(
      "render",
      `${error.message}\n${(info.componentStack ?? "").trim().slice(0, 600)}`,
    );
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="grid min-h-dvh place-items-center p-6 text-center">
          <div>
            <p className="font-display text-2xl text-rosa">se rompió algo</p>
            <p className="mt-2 text-sm text-hueso/60">
              mirá el panel rojo abajo para ver el error
            </p>
            <button
              onClick={() => location.reload()}
              className="mt-4 rounded-full border border-white/20 px-4 py-1.5 text-sm text-hueso/80"
            >
              recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Panel flotante que muestra errores globales y de promesas. */
export function DebugOverlay() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const add = (e: LogEntry) => setLogs((prev) => [...prev.slice(-19), e]);
    listeners.add(add);

    const onError = (event: ErrorEvent) => {
      pushLog(
        "error",
        `${event.message} @ ${event.filename?.split("/").pop() ?? "?"}:${event.lineno}`,
      );
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const r = event.reason;
      pushLog(
        "promise",
        r instanceof Error ? `${r.message}` : String(r),
      );
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      listeners.delete(add);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (logs.length === 0) return null;

  return (
    <div className="fixed inset-x-2 bottom-2 z-[9999] max-h-[45vh] overflow-auto rounded-2xl border border-rosa/60 bg-black/90 p-3 text-[11px] leading-snug text-rosa shadow-[0_0_40px_rgba(0,0,0,0.7)] backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-bold tracking-widest uppercase">
          debug · {logs.length}
        </span>
        <div className="flex gap-3">
          <button onClick={() => setOpen((v) => !v)} className="underline">
            {open ? "ocultar" : "ver"}
          </button>
          <button onClick={() => setLogs([])} className="underline">
            limpiar
          </button>
        </div>
      </div>
      {open && (
        <ol className="space-y-1.5">
          {logs.map((log, i) => (
            <li
              key={`${log.at}-${i}`}
              className="border-t border-rosa/20 pt-1.5 whitespace-pre-wrap break-words text-hueso/85"
            >
              <span className="text-rosa/80">[{log.kind}]</span> {log.text}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
