import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithMerchant } from '../guards/api-key.guard';

export const CurrentMerchant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithMerchant>();

    return request.merchant;
  },
);
