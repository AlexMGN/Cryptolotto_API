import { Model } from 'mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { LotteryDocument, Lottery } from '../models/mongo/lottery';
import * as anchor from '@project-serum/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import * as bs58 from 'bs58';
import { getProgram } from './config';
import * as Discord from 'discord.js';
import { InjectDiscordClient, Once } from '@discord-nestjs/core';
import { getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import { Wallet } from '@project-serum/anchor';
import { TeamDocument, Team } from '../models/mongo/team';

@Injectable()
export class LotteryService {
  private readonly logger = new Logger(LotteryService.name);

  constructor(
    @InjectModel(Lottery.name) private lotteryModel: Model<LotteryDocument>,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectDiscordClient()
    private readonly client: Discord.Client,
  ) {}

  @Once('ready')
  async onReady() {
    this.logger.debug('🤖 Bot connected to Discord server');
  }

  async getKaffeine() {
    return 'Route to the anti sleep Heroku by taking a dose of kaffeine. Nothing to see here';
  }

  async findAllLotteries(): Promise<LotteryDocument[] | null> {
    const lotteries = await this.lotteryModel.find({}, ['-_id'].join(' '));

    return lotteries ? lotteries : null;
  }

  async findAllDonations(): Promise<TeamDocument[] | null> {
    const donations = await this.teamModel.find(
      { type: 'association', status: 'distributed' },
      ['-_id'].join(' '),
    );

    return donations ? donations : null;
  }

  async findOpenedLottery(slug: string): Promise<LotteryDocument | null> {
    const lottery = await this.lotteryModel.findOne(
      {
        slug,
        status: 'opened',
      },
      ['-_id'].join(' '),
    );

    return lottery ? lottery : null;
  }

  async getLotteryUSDCAmount(pda: string): Promise<number> {
    const cryptolottoWallet = Keypair.fromSecretKey(
      new Uint8Array(bs58.decode(process.env.CRYPTOLOTTO)),
    );
    const connection = new anchor.web3.Connection(process.env.RPC_ENDPOINT);

    const Lottery_USDC_ATA = await getOrCreateAssociatedTokenAccount(
      connection,
      cryptolottoWallet,
      new PublicKey(process.env.USDC_MINT_ADDRESS),
      new PublicKey(pda),
      true,
    );

    const lottery_account_ata = (await connection.getParsedAccountInfo(
      Lottery_USDC_ATA.address,
    )) as any;

    const USDC_Amount =
      lottery_account_ata.value.data.parsed.info.tokenAmount.amount;

    return Number(USDC_Amount) / 1e6;
  }

  async depositInLottery(
    slug: string,
    wallet: string,
    amount: number,
  ): Promise<any> {
    const lottery = await this.findOpenedLottery(slug);

    if (lottery.status !== 'opened') {
      throw new Error(
        "You can't participate to this lottery because she is not opened",
      );
    }

    const cryptolottoWallet = Keypair.fromSecretKey(
      new Uint8Array(bs58.decode(process.env.CRYPTOLOTTO)),
    );
    const connection = new anchor.web3.Connection(process.env.RPC_ENDPOINT);
    const program = await getProgram(new Wallet(cryptolottoWallet), connection);

    const Lottery_USDC_ATA = await getOrCreateAssociatedTokenAccount(
      connection,
      cryptolottoWallet,
      new PublicKey(process.env.USDC_MINT_ADDRESS),
      new PublicKey(lottery.pda),
      true,
    );

    const Participant_ATA = await getOrCreateAssociatedTokenAccount(
      connection,
      cryptolottoWallet,
      new PublicKey(process.env.USDC_MINT_ADDRESS),
      new PublicKey(wallet),
    );

    const tx = await program.methods
      .deposit(new anchor.BN(amount * 1e6))
      .accounts({
        signer: new PublicKey(wallet),
        usdcMint: new PublicKey(process.env.USDC_MINT_ADDRESS),
        lotteryAta: Lottery_USDC_ATA.address,
        participantAta: Participant_ATA.address,
      })
      .transaction();

    const { blockhash } = await connection.getLatestBlockhash('finalized');

    tx.recentBlockhash = blockhash;
    tx.feePayer = new PublicKey(wallet);

    return tx.serialize({ requireAllSignatures: false });
  }

  async confirmParticipation(
    slug: string,
    wallet: string,
    amount: number,
    txid: string,
  ): Promise<any> {
    try {
      const lottery = await this.findOpenedLottery(slug);

      return await this.lotteryModel.updateOne(
        {
          pda: lottery.pda,
        },
        {
          $push: {
            participations: {
              transaction_id: txid,
              wallet,
              amount,
              date: new Date().getTime(),
            },
          },
        },
      );
    } catch (e) {
      throw new Error(e);
    }
  }

  async getParticipations(slug: string, wallet: string): Promise<number> {
    try {
      const lottery = await this.findOpenedLottery(slug);

      let userParticipations = 0;

      for (const participation of lottery.participations) {
        if (participation.wallet === wallet) {
          userParticipations += Number(participation.amount);
        }
      }

      return userParticipations;
    } catch (e) {
      throw new Error(e);
    }
  }
}
