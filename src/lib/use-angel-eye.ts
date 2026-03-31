"use client";

/**
 * useAngelEye — Web Serial API hook for Angel Eye II-EX shoe
 *
 * Connects to the Angel Eye baccarat shoe directly from the browser.
 * No bridge script, no exe — just Chrome + USB/COM port.
 *
 * Requirements:
 *   - Chromium-based browser (Chrome, Edge)
 *   - HTTPS or localhost
 *   - User grants serial port permission via browser dialog
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { AngelEyeParser, type AngelEyeEvent } from "./angel-eye-parser";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error" | "unsupported";

export interface UseAngelEyeReturn {
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether Web Serial API is available in this browser */
  isSupported: boolean;
  /** Request port and connect to the Angel Eye shoe */
  connect: () => Promise<void>;
  /** Disconnect from the shoe */
  disconnect: () => Promise<void>;
  /** Last error message */
  error: string | null;
  /** Subscribe to Angel Eye events */
  onEvent: (handler: (event: AngelEyeEvent) => void) => () => void;
}

const BAUD_RATE = 4800; // Angel Eye II-EX uses 4800 baud RS-232C

export function useAngelEye(): UseAngelEyeReturn {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);

  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const parserRef = useRef(new AngelEyeParser());
  const readingRef = useRef(false);
  const handlersRef = useRef<Set<(event: AngelEyeEvent) => void>>(new Set());

  const isSupported = typeof navigator !== "undefined" && "serial" in navigator;

  // Emit event to all subscribers
  const emit = useCallback((event: AngelEyeEvent) => {
    for (const handler of handlersRef.current) {
      try {
        handler(event);
      } catch {
        // Don't let one handler break others
      }
    }
  }, []);

  // Read loop — continuously reads bytes from serial port
  const readLoop = useCallback(async () => {
    if (!portRef.current?.readable) return;
    readingRef.current = true;

    while (readingRef.current && portRef.current?.readable) {
      try {
        const reader = portRef.current.readable.getReader();
        readerRef.current = reader;

        while (readingRef.current) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            const events = parserRef.current.feed(value);
            for (const event of events) {
              emit(event);
            }
          }
        }

        reader.releaseLock();
      } catch (err) {
        // Port disconnected or read error
        if (readingRef.current) {
          setError(err instanceof Error ? err.message : "Read error");
          setStatus("error");
        }
        break;
      }
    }

    readerRef.current = null;
  }, [emit]);

  const connect = useCallback(async () => {
    if (!isSupported) {
      setStatus("unsupported");
      setError("Web Serial API not supported. Use Chrome or Edge.");
      return;
    }

    try {
      setStatus("connecting");
      setError(null);

      // Browser shows port picker dialog
      const port = await navigator.serial.requestPort();
      await port.open({
        baudRate: BAUD_RATE,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
      });

      portRef.current = port;
      parserRef.current.reset();
      setStatus("connected");

      // Start reading
      readLoop();

      // Handle unexpected disconnect
      port.addEventListener("disconnect", () => {
        readingRef.current = false;
        portRef.current = null;
        setStatus("disconnected");
        setError("Shoe disconnected");
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotFoundError") {
        // User cancelled the port picker — not an error
        setStatus("disconnected");
        return;
      }
      setError(err instanceof Error ? err.message : "Connection failed");
      setStatus("error");
    }
  }, [isSupported, readLoop]);

  const disconnect = useCallback(async () => {
    readingRef.current = false;

    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch {
        // Ignore cancel errors
      }
      readerRef.current = null;
    }

    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch {
        // Ignore close errors
      }
      portRef.current = null;
    }

    parserRef.current.reset();
    setStatus("disconnected");
    setError(null);
  }, []);

  // Subscribe to events
  const onEvent = useCallback((handler: (event: AngelEyeEvent) => void) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      readingRef.current = false;
      readerRef.current?.cancel().catch(() => {});
      portRef.current?.close().catch(() => {});
    };
  }, []);

  return {
    status,
    isSupported,
    connect,
    disconnect,
    error,
    onEvent,
  };
}
