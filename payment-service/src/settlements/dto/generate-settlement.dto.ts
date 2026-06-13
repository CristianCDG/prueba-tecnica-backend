import { IsDateString, IsUUID } from 'class-validator';

export class GenerateSettlementDto {
  @IsUUID()
  merchant_id: string;

  @IsDateString()
  period_start: string;

  @IsDateString()
  period_end: string;
}
