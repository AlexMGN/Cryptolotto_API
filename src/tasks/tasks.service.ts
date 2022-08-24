import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  /*@Cron('0 0 8 * * *', {
    name: 'create_lotteries',
    timeZone: 'Europe/Paris',
  })
  distributeAndCreateLotteries() {
    this.logger.debug('Distribution Time!');

    // Faire une route pour tester avant de passer sur la cron
    // Si pas de loterie opened, on créer, sinon
    // On créer un timestamp
    // On update le status de la loterie en "distribution"
    // On boucle les participations, on ajoute dans un tableau tous les wallets par rapport à leurs nombres
    // Si 100 participations, le wallet est 100 fois dans le tableau
    // Shuffle le tableau
    // Récupération d'un gagnant
    // Ajout du gagnant dans la DB
    // Instruction pour distribuer
    // Sauvegarder la txid si elle est success, recommencer si fail
    // Modifier les colonne amount_win/team_part/association_part
    // 90% / 5% / 5%
    // On ajoute le timestamp pour sauvegarder la date du gain
    // On change le status de la loterie en closed

    // Création des loteries
    // Récupération des PDA
    // Sauvegarder les PDA dans la table lotteries avec le status opened
    // Envoyer les PDA sur discord
  }*/
}
