import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  Param,
} from '@nestjs/common';
import { LotteryService } from './lottery.service';

@Controller('lottery')
export class LotteryController {
  constructor(private readonly lotteryService: LotteryService) {}

  @Get('/')
  async test(@Param('slug') slug: string) {
    return this.lotteryService.getHello();
  }

  @HttpCode(200)
  @Get('/all')
  async allLotteries() {
    const lotteries = await this.lotteryService.findAllLotteries();

    if (!lotteries)
      throw new HttpException({ errors: ['Lotteries not found'] }, 404);
    return lotteries;
  }

  @HttpCode(200)
  @Get('/:slug')
  async details(@Param('slug') slug: string) {
    const lottery = await this.lotteryService.findOpenedLottery(slug);

    if (!lottery)
      throw new HttpException({ errors: ['Lottery not found'] }, 404);
    return lottery;
  }

  @HttpCode(200)
  @Get('/amount/:pda')
  async amountInLottery(@Param('pda') pda: string) {
    const amount = await this.lotteryService.getLotteryUSDCAmount(pda);

    if (isNaN(amount))
      throw new HttpException({ errors: ['No amount found'] }, 404);
    return amount;
  }

  @HttpCode(200)
  @Get('/deposit/:slug/:wallet/:amount')
  async deposit(
    @Param('slug') slug: string,
    @Param('wallet') wallet: string,
    @Param('amount') amount: number,
  ) {
    const tx = await this.lotteryService.depositInLottery(slug, wallet, amount);

    if (!tx) throw new HttpException({ errors: ['Error for deposit'] }, 404);
    return tx;
  }

  @HttpCode(200)
  @Get('/confirmParticipation/:slug/:wallet/:amount/:txid')
  async confirmParticipation(
    @Param('slug') slug: string,
    @Param('wallet') wallet: string,
    @Param('amount') amount: number,
    @Param('txid') txid: string,
  ) {
    if (slug === 'medium') amount = amount / 2;
    if (slug === 'degen') amount = amount / 5;
    if (slug === 'whale') amount = amount / 10;

    const confirmed = await this.lotteryService.confirmParticipation(
      slug,
      wallet,
      amount,
      txid,
    );

    if (!confirmed || confirmed.modifiedCount !== 1)
      throw new HttpException(
        { errors: ['Error for add new participant for the txid:' + txid] },
        404,
      );
    return confirmed;
  }

  @HttpCode(200)
  @Get('/getParticipations/:slug/:wallet')
  async getParticipations(
    @Param('slug') slug: string,
    @Param('wallet') wallet: string,
  ) {
    const participations = await this.lotteryService.getParticipations(
      slug,
      wallet,
    );

    if (isNaN(participations))
      throw new HttpException({ errors: ['No participations found'] }, 404);
    return participations;
  }
}
