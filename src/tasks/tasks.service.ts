import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Lottery, LotteryDocument } from '../models/mongo/lottery';
import { Model } from 'mongoose';
import * as anchor from '@project-serum/anchor';
import {
  Commitment,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SignatureStatus,
  Signer,
  Transaction,
  TransactionSignature,
} from '@solana/web3.js';
import { InjectDiscordClient } from '@discord-nestjs/core';
import * as Discord from 'discord.js';
import * as bs58 from 'bs58';
import {
  getAssociatedTokenAccount,
  getPDA,
  getProgram,
} from '../lottery/config';
import { Wallet } from '@project-serum/anchor';
import { Account } from '@solana/spl-token';
import {
  LotteryCreationType,
  SaveMemberCreationType,
} from '../lottery/mongo.creation.type';
import { TextChannel } from 'discord.js';
import { createTransferInstruction } from '@solana/spl-token';
import { TeamDocument, Team } from '../models/mongo/team';

interface LotteryDiscordField {
  name: string;
  value: string;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectModel(Lottery.name) private lotteryModel: Model<LotteryDocument>,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectDiscordClient()
    private readonly client: Discord.Client,
  ) {}
  // 8h: '0 0 8 * * *'
  @Cron('0 0 1 * * *', {
    name: 'distribute_and_create_lotteries',
    timeZone: 'Europe/Paris',
  })
  async distributeAndCreateLotteries() {
    const creationTimestamp = new Date().getTime();
    const web3Timestamp = new anchor.BN(creationTimestamp);
    const bufferedTimestamp = web3Timestamp.toBuffer('be', 8);
    const connection = new Connection(process.env.RPC_ENDPOINT);
    const lotteries = ['low', 'medium', 'degen', 'whale'];
    const openedLotteries = await this.lotteryModel.find({ status: 'opened' });

    const createOrDistributeLotteries = async (
      distribution?: boolean,
      timestamp?: number,
    ) => {
      try {
        if (distribution) {
          console.log('Distribution in progress...');
          const lotteriesFields: LotteryDiscordField[] = [];

          for (let i = 0; i < lotteries.length; i++) {
            await updateLotteryStatus(
              this.lotteryModel,
              lotteries[i],
              'opened',
              'distribution',
            );

            if (openedLotteries[i].participations.length > 0) {
              await selectWinnerAndDistributeLottery(
                openedLotteries[i],
                connection,
                0,
                this.lotteryModel,
              );

              await updateLotteryStatus(
                this.lotteryModel,
                lotteries[i],
                'distribution',
                'distributed',
              );

              const lotteryToBeCreated: LotteryCreationType =
                await createLottery(
                  openedLotteries[i].slug,
                  creationTimestamp,
                  bufferedTimestamp,
                  connection,
                );

              const Lottery = new this.lotteryModel(lotteryToBeCreated);
              Lottery.save();

              lotteriesFields.push({
                name: lotteryToBeCreated.slug.toUpperCase() + ' (Nouvelle)',
                value: lotteryToBeCreated.pda,
              });
            } else {
              const getOldTimestamp = await this.lotteryModel.findOne({
                slug: lotteries[i],
                status: 'distribution',
              });

              await this.lotteryModel
                .updateOne(
                  {
                    slug: lotteries[i],
                    status: 'distribution',
                  },
                  {
                    $set: {
                      timestamp,
                      extension_timestamp: getOldTimestamp.extension_timestamp
                        ? getOldTimestamp.extension_timestamp
                        : getOldTimestamp.timestamp,
                      status: 'opened',
                    },
                  },
                )
                .exec();

              lotteriesFields.push({
                name: openedLotteries[i].slug.toUpperCase() + ' (Prolongée)',
                value: openedLotteries[i].pda,
              });
            }
          }
          await sendLotteriesWalletsInDiscord(this.client, lotteriesFields);
          console.log('Distribution finished !...');
        } else {
          this.logger.log('Lotteries creation in progress...');
          const lotteriesFields = [];

          for (const lottery of lotteries) {
            const lotteryToBeCreated: LotteryCreationType = await createLottery(
              lottery,
              creationTimestamp,
              bufferedTimestamp,
              connection,
            );

            const Lottery = new this.lotteryModel(lotteryToBeCreated);
            Lottery.save();

            this.logger.log(
              lotteryToBeCreated.slug.toUpperCase() + ' lottery created!',
            );

            lotteriesFields.push({
              name: lotteryToBeCreated.slug.toUpperCase() + ' (Nouvelle)',
              value: lotteryToBeCreated.pda,
            });
          }

          await sendLotteriesWalletsInDiscord(this.client, lotteriesFields);
          this.logger.log('Lotteries sended to Discord!');
        }
      } catch (e) {
        console.log(e);
        this.logger.error('Error during the creation');
        throw new Error(e.message);
      }
    };

    try {
      if (openedLotteries.length > 0) {
        await createOrDistributeLotteries(true, creationTimestamp);
      } else {
        await createOrDistributeLotteries();
      }
    } catch (e) {
      console.log(e);
    }
  }

  @Cron('0 30 1 * * *', {
    name: 'team_distribution',
    timeZone: 'Europe/Paris',
  })
  async distributeToTheTeam() {
    console.log('Distribution for the team in progress...');
    const team_members = [
      {
        wallet: '9145ttu78U55JtCZLgomQWWXzQP96pZkjcE2ehkMsEbQ',
        gain: 3,
      },
    ];
    const connection = new Connection(process.env.RPC_ENDPOINT);
    const savedTimestamp = new Date().getTime();

    const teamWallet = Keypair.fromSecretKey(
      new Uint8Array(bs58.decode(process.env.CRYPTOLOTTO_TEAM)),
    );

    const team_ATA = await getAssociatedTokenAccount(
      connection,
      teamWallet,
      new PublicKey(process.env.TEAM_PUBLICKEY),
    );

    const team_USDC_balance = Number(team_ATA.amount) / 1e6;

    for (const member of team_members) {
      try {
        const member_ATA = await getAssociatedTokenAccount(
          connection,
          teamWallet,
          new PublicKey(member.wallet),
        );

        const amount_to_transfer = (member.gain * team_USDC_balance) / 100;
        let amount_for_member = amount_to_transfer / team_members.length;

        if (decimalCount(parseFloat(String(amount_for_member)) * 1e6) > 0) {
          amount_for_member = Number(
            parseFloat(String(amount_for_member)).toPrecision(7),
          );
        }

        const transferTrx = new Transaction().add(
          createTransferInstruction(
            team_ATA.address,
            member_ATA.address,
            teamWallet.publicKey,
            amount_for_member * 1e6,
          ),
        );

        const txid = await sendAndConfirmTransaction(
          connection,
          transferTrx,
          [teamWallet],
          { commitment: 'finalized' },
        );

        const saveMemberDistribution: SaveMemberCreationType = {
          type: 'member',
          wallet: member.wallet,
          status: 'distributed',
          amount_distributed: amount_for_member,
          distribution_transaction_id: txid,
          distribution_date: savedTimestamp,
        };

        const TeamDistribution = new this.teamModel(saveMemberDistribution);
        TeamDistribution.save();
      } catch (e) {
        if (e) {
          const saveMemberDistributionError: SaveMemberCreationType = {
            type: 'member',
            wallet: member.wallet,
            status: 'error',
            amount_distributed: 0,
            distribution_transaction_id: 'No transaction',
            distribution_date: savedTimestamp,
            error_message: e.message,
          };

          const TeamDistribution = new this.teamModel(
            saveMemberDistributionError,
          );
          TeamDistribution.save();
        }
      }
    }

    try {
      const team_ATA_with_new_sold = await getAssociatedTokenAccount(
        connection,
        teamWallet,
        new PublicKey(process.env.TEAM_PUBLICKEY),
      );

      let new_team_USDC_balance = Number(team_ATA_with_new_sold.amount) / 1e6;

      const treasury_ATA = await getAssociatedTokenAccount(
        connection,
        teamWallet,
        new PublicKey(process.env.TREASURY_PUBLICKEY),
      );

      if (decimalCount(parseFloat(String(new_team_USDC_balance)) * 1e6) > 0) {
        new_team_USDC_balance = Number(
          parseFloat(String(new_team_USDC_balance)).toPrecision(7),
        );
      }

      const transferTrx = new Transaction().add(
        createTransferInstruction(
          team_ATA.address,
          treasury_ATA.address,
          teamWallet.publicKey,
          new_team_USDC_balance * 1e6,
        ),
      );

      const txid = await sendAndConfirmTransaction(
        connection,
        transferTrx,
        [teamWallet],
        { commitment: 'finalized' },
      );

      const saveMemberDistribution: SaveMemberCreationType = {
        type: 'treasury',
        wallet: process.env.TREASURY_PUBLICKEY,
        status: 'distributed',
        amount_distributed: new_team_USDC_balance,
        distribution_transaction_id: txid,
        distribution_date: savedTimestamp,
      };

      const TeamDistribution = new this.teamModel(saveMemberDistribution);
      TeamDistribution.save();
      console.log('Distribution for the team finished!');
    } catch (e) {
      if (e) {
        const saveMemberDistributionError: SaveMemberCreationType = {
          type: 'treasury',
          wallet: process.env.TREASURY_PUBLICKEY,
          status: 'error',
          amount_distributed: 0,
          distribution_transaction_id: 'No transaction',
          distribution_date: savedTimestamp,
          error_message: e.message,
        };

        const TeamDistribution = new this.teamModel(
          saveMemberDistributionError,
        );
        TeamDistribution.save();
        console.log('Distribution for the team finished with error...');
      }
    }
  }
}

const createLottery = async (
  name: string,
  creationTimestamp: number,
  bufferedTimestamp: Buffer,
  connection: Connection,
): Promise<LotteryCreationType> => {
  const cryptolottoWallet = Keypair.fromSecretKey(
    new Uint8Array(bs58.decode(process.env.CRYPTOLOTTO)),
  );

  const program = await getProgram(new Wallet(cryptolottoWallet), connection);
  const _lottery_pda = await getPDA(name, bufferedTimestamp, program.programId);

  const lottery_ATA = await getAssociatedTokenAccount(
    connection,
    cryptolottoWallet,
    _lottery_pda,
    true,
  );

  const lottery: LotteryCreationType = {
    slug: name,
    timestamp: creationTimestamp,
    pda: _lottery_pda.toString(),
    token_account: lottery_ATA.address.toString(),
    status: 'opened',
  };

  return lottery;
};

const selectWinnerAndDistributeLottery = async (
  lottery: LotteryDocument,
  connection: Connection,
  numberTried: number,
  lotteryModel: Model<LotteryDocument>,
) => {
  if (numberTried === 3) {
    throw new Error('Distribution failed');
  }

  try {
    let web3Timestamp;

    if (lottery.extension_timestamp) {
      web3Timestamp = new anchor.BN(lottery.extension_timestamp);
    } else {
      web3Timestamp = new anchor.BN(lottery.timestamp);
    }

    const bufferedTimestamp = web3Timestamp.toBuffer('be', 8);

    const participantsBeforeShuffle: string[] = [];

    for (const participation of lottery.participations) {
      for (let i = 0; i < participation.amount; i++) {
        participantsBeforeShuffle.push(participation.wallet);
      }
    }

    const shuffle = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }

      return arr;
    };

    let shuffledParticipants;

    for (let i = 0; i < 5; i++) {
      shuffledParticipants = shuffle(participantsBeforeShuffle);
    }

    const winner = new PublicKey(
      shuffledParticipants[
        Math.floor(Math.random() * shuffledParticipants.length)
      ],
    );

    const cryptolottoWallet = Keypair.fromSecretKey(
      new Uint8Array(bs58.decode(process.env.CRYPTOLOTTO)),
    );

    const program = await getProgram(new Wallet(cryptolottoWallet), connection);

    const _lottery_pda = await getPDA(
      lottery.slug,
      bufferedTimestamp,
      program.programId,
    );

    const lottery_ATA = await getAssociatedTokenAccount(
      connection,
      cryptolottoWallet,
      _lottery_pda,
      true,
    );

    const winner_ATA = await getAssociatedTokenAccount(
      connection,
      cryptolottoWallet,
      winner,
    );

    const team_ATA = await getAssociatedTokenAccount(
      connection,
      cryptolottoWallet,
      new PublicKey(process.env.TEAM_PUBLICKEY),
    );

    const association_ATA = await getAssociatedTokenAccount(
      connection,
      cryptolottoWallet,
      new PublicKey(process.env.ASSOCIATION_PUBLICKEY),
    );

    const distribution_transaction_id = await distributeInstruction(
      program,
      lottery_ATA,
      winner_ATA,
      team_ATA,
      association_ATA,
      bufferedTimestamp,
      lottery,
      cryptolottoWallet,
      _lottery_pda,
    );

    const confirmation = await awaitTransactionSignatureConfirmation(
      distribution_transaction_id,
      60000,
      connection,
      'finalized',
    );

    if (!confirmation)
      await selectWinnerAndDistributeLottery(
        lottery,
        connection,
        numberTried + 1,
        lotteryModel,
      );

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (confirmation?.err)
      await selectWinnerAndDistributeLottery(
        lottery,
        connection,
        numberTried + 1,
        lotteryModel,
      );

    await lotteryModel
      .updateOne(
        { slug: lottery.slug, pda: lottery.pda },
        {
          $set: {
            amount_win:
              (Number(process.env.WINNER_PART) *
                (Number(lottery_ATA.amount) / 1e6)) /
              100,
            team_part:
              (Number(process.env.TEAM_PART) *
                (Number(lottery_ATA.amount) / 1e6)) /
              100,
            association_part:
              (Number(process.env.ASSOCIATION_PART) *
                (Number(lottery_ATA.amount) / 1e6)) /
              100,
            distribution_transaction_id,
            distribution_date: new Date().getTime(),
            winner: winner.toString(),
          },
        },
      )
      .exec();
  } catch (e) {
    throw new Error(e.message);
  }
};

const updateLotteryStatus = async (
  lotteryModel: Model<LotteryDocument>,
  slug,
  oldStatus,
  newStatus,
) => {
  await lotteryModel
    .updateOne(
      {
        slug,
        status: oldStatus,
      },
      {
        $set: {
          status: newStatus,
        },
      },
    )
    .exec();
};

const distributeInstruction = async (
  program: any,
  lottery_ATA: Account,
  winner_ATA: Account,
  team_ATA: Account,
  association_ATA: Account,
  bufferedTimestamp: Buffer,
  lottery: LotteryDocument,
  cryptolottoWallet: Signer,
  _lottery_pda: PublicKey,
) => {
  return await program.methods
    .distributeLottery(
      new anchor.BN(Number(lottery_ATA.amount)),
      bufferedTimestamp,
      lottery.slug,
    )
    .accounts({
      signer: cryptolottoWallet.publicKey,
      usdcMint: new PublicKey(process.env.USDC_MINT_ADDRESS),
      lotteryAta: lottery_ATA.address,
      lotteryAtaAuthority: _lottery_pda,
      winnerAta: winner_ATA.address,
      teamAta: team_ATA.address,
      associationAta: association_ATA.address,
    })
    .signers([cryptolottoWallet])
    .rpc();
};

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

async function awaitTransactionSignatureConfirmation(
  txid: TransactionSignature,
  timeout: number,
  connection: Connection,
  commitment: Commitment,
  queryStatus = false,
): Promise<SignatureStatus | null | void> {
  let done = false;
  let status: SignatureStatus | null | void = {
    slot: 0,
    confirmations: 0,
    err: null,
  };
  let subId = 0;
  status = await new Promise(async (resolve, reject) => {
    setTimeout(() => {
      if (done) {
        return;
      }
      done = true;
      console.log('Rejecting for timeout...');
      reject({ timeout: true });
    }, timeout);
    try {
      subId = connection.onSignature(
        txid,
        (result, context) => {
          done = true;
          status = {
            err: result.err,
            slot: context.slot,
            confirmations: 0,
          };
          if (result.err) {
            console.log('Rejected via websocket', result.err);
            reject(status);
          } else {
            console.log('Resolved via websocket', result);
            resolve(status);
          }
        },
        commitment,
      );
    } catch (e) {
      done = true;
      console.error('WS error in setup', txid, e);
    }
    while (!done && queryStatus) {
      // eslint-disable-next-line no-loop-func
      await (async () => {
        try {
          const signatureStatuses = await connection.getSignatureStatuses([
            txid,
          ]);
          status = signatureStatuses && signatureStatuses.value[0];
          if (!done) {
            if (!status) {
              console.log('REST null result for', txid, status);
            } else if (status.err) {
              console.log('REST error for', txid, status);
              done = true;
              reject(status.err);
            } else if (!status.confirmations) {
              console.log('REST no confirmations for', txid, status);
            } else {
              console.log('REST confirmation for', txid, status);
              done = true;
              resolve(status);
            }
          }
        } catch (e) {
          if (!done) {
            console.log('REST connection error: txid', txid, e);
          }
        }
      })();
      await sleep(2000);
    }
  });

  try {
    await connection.removeSignatureListener(subId);
  } catch (e) {
    // ignore
  }
  done = true;
  console.log('Returning status', status);
  return status;
}

const sendLotteriesWalletsInDiscord = async (
  client: Discord.Client,
  lotteriesFields: LotteryDiscordField[],
) => {
  await (
    client.channels.cache.get(process.env.DISCORD_CHANNEL_ID) as TextChannel
  ).bulkDelete(25);

  const description =
    'Voici la liste des loteries du jour ! \n' +
    "N'oubliez pas de bien copier/coller l'addresse pour éviter toute erreur \n" +
    "Rappel: Une transaction au mauvais wallet n'est pas récupérable !";

  const embed = new Discord.MessageEmbed()
    .setColor('#0C6252')
    .setAuthor({
      name: 'Swifty🍦',
      iconURL:
        'https://www.arweave.net/CV9PCop6JTVxQmWiFMu83RjWRKCCnCm_YLUelWf9Ga8?ext=png',
    })
    .setDescription(description)
    .addFields(lotteriesFields)
    .setTimestamp();

  await (
    client.channels.cache.get(process.env.DISCORD_CHANNEL_ID) as TextChannel
  ).send({ embeds: [embed] });
};

const decimalCount = (number) => {
  const numberAsString = number.toString();
  if (numberAsString.includes('.')) {
    return numberAsString.split('.')[1].length;
  }
  return 0;
};
