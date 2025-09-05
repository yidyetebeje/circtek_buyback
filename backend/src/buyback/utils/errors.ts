export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string = "Resource not found") {
    super(message);
  }
}

export class BadRequestError extends BaseError {
  constructor(message: string = "Bad request") {
    super(message);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string = "Forbidden") {
    super(message);
  }
} 