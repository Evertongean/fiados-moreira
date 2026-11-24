const ROUTE_ID_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,127})$/;

export function getRouteId(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return ROUTE_ID_PATTERN.test(normalized) ? normalized : null;
}

export function canAccessDevelopmentRoutes(isDevelopment: boolean): boolean {
  return isDevelopment;
}
