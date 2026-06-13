import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { Merchant } from '@prisma/client';

export interface RequestWithMerchant extends Request {
  merchant: Merchant;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithMerchant>();

    const apiKey = request.headers['x-api-key'];

    if (!apiKey || Array.isArray(apiKey)) {
      throw new UnauthorizedException('Se requiere una API key valida');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: {
        apiKey,
      },
    });

    if (!merchant) {
      throw new UnauthorizedException('La API key es invalida');
    }

    if (merchant.status === 'inactive') {
      throw new ForbiddenException('Merchant inactivo');
    }

    request.merchant = merchant;

    return true;
  }
}
