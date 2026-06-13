import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';

const VALID_TRANSITIONS: Partial<
  Record<TransactionStatus, TransactionStatus[]>
> = {
  pending: ['approved', 'rejected', 'failed'],
  approved: ['completed', 'failed'],
};

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  private generateReference(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const random = Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');
    return `TXN-${date}-${random}`;
  }

  async create(dto: CreateTransactionDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: dto.merchant_id },
      select: { id: true },
    });

    if (!merchant) {
      throw new NotFoundException(
        `Merchant '${dto.merchant_id}' no encontrado`,
      );
    }

    let reference = this.generateReference();

    let exists = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    while (exists) {
      reference = this.generateReference();
      exists = await this.prisma.transaction.findUnique({
        where: { reference },
      });
    }

    return this.prisma.transaction.create({
      data: {
        merchantId: dto.merchant_id,
        amount: dto.amount,
        currency: dto.currency,
        type: dto.type,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        reference,
      },
    });
  }

  async findAll(merchantId: string, filters: ListTransactionsDto) {
    const { page, limit, status, type, date_from, date_to } = filters;

    const where: Prisma.TransactionWhereInput = {
      merchantId,
      ...(status && { status }),
      ...(type && { type }),
      ...((date_from ?? date_to) && {
        createdAt: {
          ...(date_from && { gte: new Date(date_from) }),
          ...(date_to && { lte: new Date(date_to) }),
        },
      }),
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, merchantId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id, merchantId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaccion '${id}' no encontrada`);
    }

    return transaction;
  }

  async updateStatus(
    id: string,
    merchantId: string,
    dto: UpdateTransactionStatusDto,
  ) {
    const transaction = await this.findOne(id, merchantId);

    const allowed = VALID_TRANSITIONS[transaction.status] ?? [];

    if (!allowed.includes(dto.status)) {
      throw new UnprocessableEntityException(
        `Transicion de estado invalida: no se puede cambiar de '${transaction.status}' a '${dto.status}'`,
      );
    }

    return this.prisma.transaction.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
