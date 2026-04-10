export function successResponse<T>(data: T) {
  return {
    success: true,
    data,
  };
}

export function errorResponse(error: string, data: unknown = null) {
  return {
    success: false,
    data,
    error,
  };
}
