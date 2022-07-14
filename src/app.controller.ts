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
  // Vérifier que la loterie est bien "opened" et non closed/distribution
  // Vérifie le status de la transaction
  // Push dans "participations" le wallet avec l'amount et la date (timestamp) + update global amount
  // Si utilisateur est déjà dans participations, modifier juste amount avec l'ancier + le nouveau

  // Route pour récupérer toutes les participations de la loterie en question, loterie: string (l'addresse)

  // Route pour récupérer tous les winners de toutes les loteries avec le montant gagné
}
