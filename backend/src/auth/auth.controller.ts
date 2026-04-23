import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { successResponse } from '../common/response.util';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtUser } from './decorators/current-user.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@ApiBearerAuth('access-token')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @ApiOperation({ summary: 'Регистрация по email и паролю' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'name'],
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'securepassword' },
        name: { type: 'string', example: 'Иван Иванов' },
      },
    },
  })
  @Post('register')
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('name') name: string,
  ) {
    if (!email || !password || !name) {
      throw new BadRequestException('Email, пароль и имя обязательны');
    }
    return successResponse(
      await this.authService.register(email, password, name),
    );
  }

  @ApiOperation({ summary: 'Вход по email и паролю' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'securepassword' },
      },
    },
  })
  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    if (!email || !password) {
      throw new BadRequestException('Email и пароль обязательны');
    }
    return successResponse(await this.authService.login(email, password));
  }

  @ApiOperation({ summary: 'Вход через Google (мобильный токен)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['accessToken'],
      properties: { accessToken: { type: 'string' } },
    },
  })
  @Post('google')
  async googleMobile(@Body('accessToken') accessToken: string) {
    if (!accessToken) {
      throw new BadRequestException('accessToken обязателен');
    }
    return successResponse(
      await this.authService.googleMobileToken(accessToken),
    );
  }

  @ApiOperation({ summary: 'Перенаправление на Google OAuth (веб)' })
  @Get('google/web')
  @UseGuards(GoogleAuthGuard)
  googleWebRedirect() {
    // Passport redirects automatically
  }

  @ApiOperation({ summary: 'Callback Google OAuth (веб)' })
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const result = req.user as { access_token: string; user: { id: string } };
    // Redirect mobile deep-link or return JSON for web
    res.redirect(`aimechanic://auth?token=${result.access_token}`);
  }

  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: JwtUser) {
    return successResponse(await this.usersService.findById(user.id));
  }

  @ApiOperation({ summary: 'Обновить профиль (имя, аватар)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        avatar: { type: 'string' },
      },
    },
  })
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: JwtUser,
    @Body('name') name?: string,
    @Body('avatar') avatar?: string,
  ) {
    return successResponse(
      await this.usersService.update(user.id, { name, avatar }),
    );
  }
}
