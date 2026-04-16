import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { errorResponse } from './response.util';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? this.getHttpMessage(exception)
        : 'Internal server error';

    response.status(status).json(errorResponse(message));
  }

  private getHttpMessage(exception: HttpException) {
    const payload = exception.getResponse();

    if (typeof payload === 'string') {
      return payload;
    }

    if (typeof payload === 'object' && payload && 'message' in payload) {
      const message = (payload as { message?: string | string[] }).message;
      return Array.isArray(message)
        ? message.join(', ')
        : (message ?? exception.message);
    }

    return exception.message;
  }
}
