import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateSettlementDto } from './dto/generate-settlement.dto';

@Injectable()
export class SettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(dto: GenerateSettlementDto) {
    return this.prisma.$transaction(async (tx) => {
      const transactions = await tx.transaction.findMany({
        where: {
          merchantId: dto.merchant_id,
          status: 'approved',
          createdAt: {
            gte: new Date(dto.period_start),
            lte: new Date(dto.period_end),
          },
          settlementTransaction: { is: null },
        },
        select: { id: true, amount: true },
      });

      if (transactions.length === 0) {
        throw new NotFoundException(
          'No hay transacciones aprobadas elegibles para liquidar en el periodo indicado',
        );
      }

      const totalAmount = transactions.reduce(
        (sum, t) => sum.add(t.amount),
        new Prisma.Decimal(0),
      );

      return tx.settlement.create({
        data: {
          merchantId: dto.merchant_id,
          totalAmount,
          transactionCount: transactions.length,
          periodStart: new Date(dto.period_start),
          periodEnd: new Date(dto.period_end),
          settlementTransactions: {
            create: transactions.map((t) => ({ transactionId: t.id })),
          },
        },
        include: {
          settlementTransactions: {
            include: { transaction: true },
          },
        },
      });
    });
  }

  async findOne(id: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      include: {
        settlementTransactions: {
          include: { transaction: true },
        },
      },
    });

    if (!settlement) {
      throw new NotFoundException(`Liquidacion '${id}' no encontrada`);
    }

    return settlement;
  }
}
