import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LotteryDocument = Lottery & Document;

@Schema()
export class Lottery {
  @Prop({ required: true })
  slug: string;

  @Prop({ required: true })
  timestamp: number;

  @Prop({ required: true })
  pda: string;

  @Prop({ required: true })
  token_account: string;

  @Prop()
  participations: {
    transaction_id: string;
    wallet: string;
    amount: number;
    date: number;
  }[];

  @Prop({ required: true })
  status: string;

  @Prop()
  amount_win: number;

  @Prop()
  team_part: number;

  @Prop()
  association_part: number;

  @Prop()
  distribution_transaction_id: string;

  @Prop()
  distribution_date: number;
}

export const LotterySchema = SchemaFactory.createForClass(Lottery);
