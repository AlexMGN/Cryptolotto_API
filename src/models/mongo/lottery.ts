import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LotteryDocument = Lottery & Document;

@Schema()
export class Lottery {
  @Prop({ required: true })
  slug: string;

  @Prop({ required: true })
  timestamp: number;

  @Prop({ required: false })
  extension_timestamp: number;

  @Prop({ required: true })
  pda: string;

  @Prop({ required: true })
  token_account: string;

  @Prop({ required: false })
  participations: {
    transaction_id: string;
    wallet: string;
    amount: number;
    date: number;
  }[];

  @Prop({ required: true })
  status: string;

  @Prop({ required: false })
  amount_win: number;

  @Prop({ required: false })
  team_part: number;

  @Prop({ required: false })
  association_part: number;

  @Prop({ required: false })
  distribution_transaction_id: string;

  @Prop({ required: false })
  distribution_date: number;

  @Prop({ required: false })
  winner: string;
}

export const LotterySchema = SchemaFactory.createForClass(Lottery);
