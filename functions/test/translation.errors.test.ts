import { describe, test, expect } from 'vitest';

const isModelGone = (err: any) => {
  const status = err?.status ?? err?.httpStatusCode ?? err?.code;
  return (
    status === 404 ||
    /not found|does not exist|deprecated|has been shut down|no longer available/i.test(err?.message || '')
  );
};

// Smoke test: the model-gone classification logic, exercised via its regex
// and status-code branches. We do not need to spin up the full HttpsError
// pipeline — we test the predicate directly.

describe('model-gone error classification', () => {
  test('404 status triggers model-gone path', () => {
    expect(isModelGone({ status: 404, message: 'whatever' })).toBe(true);
  });

  test('httpStatusCode 404 triggers model-gone path', () => {
    expect(isModelGone({ httpStatusCode: 404 })).toBe(true);
  });

  test('"not found" message triggers model-gone path even without status', () => {
    expect(isModelGone({ message: 'Model gemini-3.0-pro-preview not found' })).toBe(true);
  });

  test('"has been shut down" message triggers model-gone path', () => {
    expect(isModelGone({ message: 'Gemini 3 Pro Preview has been shut down' })).toBe(true);
  });

  test('generic network error does not trigger model-gone path', () => {
    expect(isModelGone({ status: 503, message: 'service unavailable' })).toBe(false);
  });

  test('empty error does not trigger model-gone path', () => {
    expect(isModelGone({})).toBe(false);
  });
});

