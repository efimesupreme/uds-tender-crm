export function getRequestDetailsHref(requestId: string) {
  return `/requests?selectedRequestId=${encodeURIComponent(requestId)}`;
}
