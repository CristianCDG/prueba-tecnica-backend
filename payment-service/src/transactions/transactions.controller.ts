import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Merchant } from '@prisma/client';
import { CurrentMerchant } from '../common/decorators/current-merchant.decorator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
@UseGuards(ApiKeyGuard)
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post()
  // merchant_id se recibe en el body para cumplir el requisito de validacion con
  // class-validator (existencia en BD). Opcion alternativa: omitir merchant_id del
  // body y usar el merchant inyectado por el guard:
  // create(@Body() dto: CreateTransactionDto, @CurrentMerchant() merchant: Merchant) {
  //   return this.service.create(dto, merchant.id);
  // }
  create(@Body() dto: CreateTransactionDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query() filters: ListTransactionsDto,
    @CurrentMerchant() merchant: Merchant,
  ) {
    return this.service.findAll(merchant.id, filters);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentMerchant() merchant: Merchant,
  ) {
    return this.service.findOne(id, merchant.id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionStatusDto,
    @CurrentMerchant() merchant: Merchant,
  ) {
    return this.service.updateStatus(id, merchant.id, dto);
  }
}
