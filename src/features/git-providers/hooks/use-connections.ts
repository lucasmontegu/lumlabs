"use client";

import useSWR from "swr";

interface ProviderConnection {
  provider: string;
  connected: boolean;
  username: string | null;
  connectedAt: string | null;
}

interface ConnectionsResponse {
  connections: Record<
    string,
    { connected: boolean; username: string | null; connectedAt: string }
  >;
  providers: ProviderConnection[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useConnections() {
  const { data, error, isLoading, mutate } = useSWR<ConnectionsResponse>(
    "/api/git/connections",
    fetcher
  );

  const disconnect = async (provider: string) => {
    await fetch(`/api/git/connections/${provider}`, {
      method: "DELETE",
    });
    mutate();
  };

  return {
    connections: data?.connections || {},
    providers: data?.providers || [],
    isLoading,
    error,
    refresh: mutate,
    disconnect,
  };
}
