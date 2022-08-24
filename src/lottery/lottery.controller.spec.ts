import { Test, TestingModule } from '@nestjs/testing';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { LotteryController } from './app.controller';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { LotteryService } from './app.service';

describe('AppController', () => {
  let appController: LotteryController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [LotteryController],
      providers: [LotteryService],
    }).compile();

    appController = app.get<LotteryController>(LotteryController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
