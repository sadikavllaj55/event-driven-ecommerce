import { AxiosError } from 'axios';

// Extracts a user-friendly error message from an API error.
// Handles the { error: string } shape our gateway returns.
export function getErrorMessage(
  err: unknown,
  fallback = 'Something went wrong',
): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.error ?? fallback;
  }
  return fallback;
}
