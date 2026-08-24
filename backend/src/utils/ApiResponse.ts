export class ApiResponse {
  static success<T>(data: T, message: string = "Success") {
    return {
      success: true,
      message,
      data,
    };
  }

  static error(message: string, code: string, details?: any) {
    return {
      success: false,
      message,
      error: {
        code,
        details: details || {},
      },
    };
  }
}
