import { Module } from '@nestjs/common';
import { CaptureController } from './capture.controller';
import { DataCrazyService } from './datacrazy.service';

@Module({
  controllers: [CaptureController],
  providers: [DataCrazyService],
  exports: [DataCrazyService],
})
export class CrmModule {}
