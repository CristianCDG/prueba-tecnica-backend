import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { GenerateSettlementDto } from './dto/generate-settlement.dto';
import { SettlementsService } from './settlements.service';

@Controller('settlements')
@UseGuards(ApiKeyGuard)
export class SettlementsController {
  constructor(private readonly service: SettlementsService) {}

  @Post('generate')
  generate(@Body() dto: GenerateSettlementDto) {
    return this.service.generate(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }
}
