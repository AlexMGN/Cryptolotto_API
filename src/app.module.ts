import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LotteryController } from './lottery/lottery.controller';
import { LotteryService } from './lottery/lottery.service';
import { TasksService } from './tasks/tasks.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LotterySchema, Lottery } from './models/mongo/lottery';
import { DiscordModule } from '@discord-nestjs/core';
import { Intents } from 'discord.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: Lottery.name, schema: LotterySchema }]),
    DiscordModule.forRootAsync({
      useFactory: () => ({
        token: process.env.DISCORD_BOT_TOKEN,
        discordClientOptions: {
          intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.DIRECT_MESSAGES,
          ],
        },
      }),
    }),
  ],
  controllers: [LotteryController],
  providers: [LotteryService, TasksService],
})
export class AppModule {}
