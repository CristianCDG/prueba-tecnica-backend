import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('transactions')
export class TransactionsController {
  @Get('test')
  @UseGuards(ApiKeyGuard)
  test() {
    return {
      message: 'Authenticated',
    };
  }
}
