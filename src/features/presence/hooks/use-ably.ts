"use client";

import { useEffect, useRef, useState } from "react";
import * as Ably from "ably";

interface UseAblyOptions {
  onConnected?: () => void;
  onDisconnected?: () => void;
}

/**
 * Hook to manage Ably realtime connection
 */
export function useAbly(options: UseAblyOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<Ably.Realtime | null>(null);

  useEffect(() => {
    const initAbly = async () => {
      try {
        // Create Ably client with token authentication
        const client = new Ably.Realtime({
          authUrl: "/api/ably/token",
          authMethod: "POST",
        });

        client.connection.on("connected", () => {
          setIsConnected(true);
          setError(null);
          options.onConnected?.();
        });

        client.connection.on("disconnected", () => {
          setIsConnected(false);
          options.onDisconnected?.();
        });

        client.connection.on("failed", (stateChange) => {
          setError(stateChange.reason?.message || "Connection failed");
          setIsConnected(false);
        });

        clientRef.current = client;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize");
      }
    };

    initAbly();

    return () => {
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
      }
    };
  }, [options.onConnected, options.onDisconnected]);

  return {
    client: clientRef.current,
    isConnected,
    error,
  };
}
