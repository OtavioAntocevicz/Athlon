import type { UseQueryResult } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/api";

export function useAdminListQuery<T>(query: UseQueryResult<T, Error>, fallback = "Erro ao carregar.") {
  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage: getErrorMessage(query.error, fallback),
    retry: () => void query.refetch(),
  };
}
