import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { JwtUser } from '../decorators/current-user.decorator';

/**
 * Does not reject unauthenticated requests — sets req.user if a valid
 * Bearer token is present, otherwise leaves req.user undefined.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = JwtUser | null>(
    _err: unknown,
    user: JwtUser | false | null | undefined,
  ): TUser {
    return (user === false ? null : (user ?? null)) as TUser;
  }
}
