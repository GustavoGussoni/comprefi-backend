import { Module } from '@nestjs/common';
import { DataCrazyService } from './datacrazy.service';

@Module({
  providers: [DataCrazyService],
  exports: [DataCrazyService],
})
export class CrmModule {}
