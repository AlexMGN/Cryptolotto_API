import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Route pour ajouter les participations
  // Attend le wallet: string, la loterie: string, le nombre de participations: number
  // la txid: string
  // Vérifie le status de la transaction
}
