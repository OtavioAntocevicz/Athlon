import type { UseQueryResult } from "@tanstack/react-query";

export function useQueryPageState<T>(query: UseQueryResult<T, Error>) {
  const { isLoading, isError, error, refetch, data } = query;
  return {
    data,
    isLoading,
    isError,
    errorMessage: error?.message,
    retry: () => void refetch(),
  };
}
