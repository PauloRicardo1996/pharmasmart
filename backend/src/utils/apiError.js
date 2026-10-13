export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFound(code, message) {
  return new ApiError(404, code, message);
}

export function conflict(code, message) {
  return new ApiError(409, code, message);
}

