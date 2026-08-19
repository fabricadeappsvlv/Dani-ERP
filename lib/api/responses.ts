import { randomUUID } from 'crypto';

type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RESOURCE_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'DUPLICATE_CORTE'
  | 'CORTE_NOT_EDITABLE'
  | 'COMMENT_REQUIRED_ON_DIFFERENCE'
  | 'EGRESO_MISSING_CUENTA'
  | 'EGRESO_MISSING_PROVEEDOR'
  | 'RESTAURANT_ACCESS_DENIED'
  | 'INTERNAL_ERROR';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  RESOURCE_NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  DUPLICATE_CORTE: 409,
  CORTE_NOT_EDITABLE: 422,
  COMMENT_REQUIRED_ON_DIFFERENCE: 422,
  EGRESO_MISSING_CUENTA: 422,
  EGRESO_MISSING_PROVEEDOR: 422,
  RESTAURANT_ACCESS_DENIED: 403,
  INTERNAL_ERROR: 500,
};

/** Formato de éxito — objeto único (sección 5.1) */
export function ok<T>(data: T, status = 200) {
  return Response.json({ data }, { status });
}

/** Formato de éxito — colección paginada (sección 5.2) */
export function okPaginated<T>(
  data: T[],
  meta: { page: number; perPage: number; totalItems: number }
) {
  const totalPages = Math.max(1, Math.ceil(meta.totalItems / meta.perPage));
  return Response.json({
    data,
    meta: { ...meta, totalPages },
    links: {
      self: `?page=${meta.page}`,
      next: meta.page < totalPages ? `?page=${meta.page + 1}` : null,
      prev: meta.page > 1 ? `?page=${meta.page - 1}` : null,
    },
  });
}

/** Formato de error único en toda la API (sección 5.3) */
export function apiError(
  code: ErrorCode,
  message: string,
  details?: { field: string; issue: string }[]
) {
  return Response.json(
    {
      error: {
        code,
        message,
        details: details ?? [],
        requestId: randomUUID(),
      },
    },
    { status: STATUS_BY_CODE[code] }
  );
}
