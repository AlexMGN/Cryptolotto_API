import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  @Cron('0 2 * * * *', {
    name: 'create_lotteries',
    timeZone: 'Europe/Paris',
  })
  createLotteries() {
    this.logger.debug('Il est 2 heures du matin');
  }
}
