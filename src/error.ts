type ErrorType = {
  code: string;
  message: string;
}

export class PayOSError extends Error {
  private code: string;
  constructor({ code, message }: ErrorType) {
    super(message);
    this.code = code;
  }
}