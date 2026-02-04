import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchScreenerData, fetchMetadata, setParams, triggerRefresh } from '@/api/screener';
import { fetchMonitorData } from '@/api/monitor';
import { useFilterStore } from '@/stores/filterStore';
import { useEffect } from 'react';

export function useScreenerQuery() {
  return useQuery({
    queryKey: ['screener'],
    queryFn: fetchScreenerData,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useMonitorQuery() {
  const setExcludeList = useFilterStore((s) => s.setExcludeList);

  const query = useQuery({
    queryKey: ['monitor'],
    queryFn: fetchMonitorData,
    staleTime: 1000 * 60, // 1 minute
  });

  // Update exclude list when monitor data changes
  useEffect(() => {
    if (query.data?.positions) {
      const symbols = query.data.positions.map((p) => p.symbol);
      setExcludeList(symbols);
    }
  }, [query.data, setExcludeList]);

  return query;
}

export function useMetadataQuery() {
  const setExpiry = useFilterStore((s) => s.setExpiry);
  const setRor = useFilterStore((s) => s.setRor);

  const query = useQuery({
    queryKey: ['metadata'],
    queryFn: fetchMetadata,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Initialize filter state from metadata
  useEffect(() => {
    if (query.data) {
      if (query.data.expiry) {
        setExpiry(query.data.expiry);
      }
      if (query.data.ror) {
        setRor(query.data.ror);
      }
    }
  }, [query.data, setExpiry, setRor]);

  return query;
}

export function useSetParamsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setParams,
    onSuccess: () => {
      // Invalidate queries to refetch with new params
      queryClient.invalidateQueries({ queryKey: ['screener'] });
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
    },
  });
}

export function useRefreshMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: triggerRefresh,
    onSuccess: () => {
      // Invalidate all data queries
      queryClient.invalidateQueries({ queryKey: ['screener'] });
      queryClient.invalidateQueries({ queryKey: ['monitor'] });
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
    },
  });
}
