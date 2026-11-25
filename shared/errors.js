// A typed error that both the server and the browser understand.
// `code` drives the help text the UI shows; `status` is the HTTP status the server uses.
export class AnalysisError extends Error {
  constructor(code, message, { status = 500, retryable = false, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'AnalysisError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

export function isAbortError(err) {
  return err?.name === 'AbortError' || err?.name === 'TimeoutError' || err?.code === 'ABORT_ERR';
}
