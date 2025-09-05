export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    // You might add a status code property here if needed for HTTP responses
    // Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
    // Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class InternalServerError extends Error {
  constructor(message: string = 'An internal server error occurred.') {
    super(message);
    this.name = 'InternalServerError';
    // Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

// Add other custom error types as needed (e.g., UnauthorizedError, ForbiddenError)
