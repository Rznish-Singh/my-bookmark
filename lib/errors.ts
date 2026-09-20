export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
export const notFound = (what = "Item") => new AppError(404, "not_found", `${what} not found.`);
export const unauthorized = () => new AppError(401, "unauthorized", "Please sign in to continue.");
export const badRequest = (message: string, details?: Record<string, unknown>) =>
  new AppError(400, "bad_request", message, details);
export const conflict = (message: string, details?: Record<string, unknown>) =>
  new AppError(409, "conflict", message, details);
