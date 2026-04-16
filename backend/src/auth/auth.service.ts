import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

export interface TokenPayload {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<TokenPayload> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email уже используется');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, password: hashedPassword, name },
    });

    return this.buildToken(user);
  }

  async login(email: string, password: string): Promise<TokenPayload> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    return this.buildToken(user);
  }

  async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }): Promise<TokenPayload> {
    let user = await this.usersService.findByGoogleId(profile.googleId);

    if (!user) {
      user = await this.prisma.user.upsert({
        where: { email: profile.email },
        update: { googleId: profile.googleId, avatar: profile.avatar },
        create: {
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar,
          googleId: profile.googleId,
        },
      });
    }

    return this.buildToken(user);
  }

  /**
   * Mobile Google OAuth: verifies a Google access token by calling the
   * Google userinfo endpoint, then finds or creates the local user.
   */
  async googleMobileToken(accessToken: string): Promise<TokenPayload> {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`,
    );

    if (!res.ok) {
      throw new UnauthorizedException('Неверный Google токен');
    }

    const googleUser = (await res.json()) as {
      id: string;
      email: string;
      name: string;
      picture?: string;
    };

    return this.findOrCreateGoogleUser({
      googleId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      avatar: googleUser.picture,
    });
  }

  private buildToken(user: {
    id: string;
    email: string;
    name: string;
    avatar?: string | null;
  }): TokenPayload {
    const token = this.jwtService.sign(
      { sub: user.id, email: user.email, name: user.name },
      {
        secret:
          this.configService.get<string>('JWT_SECRET') ||
          'ai-mechanic-secret-key-change-in-prod',
        expiresIn: '30d',
      },
    );

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar ?? null,
      },
    };
  }
}
