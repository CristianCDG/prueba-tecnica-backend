import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TransactionsModule } from './transactions/transactions.module';
import { SettlementsModule } from './settlements/settlements.module';

@Module({
  imports: [PrismaModule, TransactionsModule, SettlementsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
