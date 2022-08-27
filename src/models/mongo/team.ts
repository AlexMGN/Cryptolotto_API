import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TeamDocument = Team & Document;

@Schema()
export class Team {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  wallet: string;

  @Prop({ required: true })
  status: string;

  @Prop({ required: true })
  amount_distributed: number;

  @Prop({ required: true })
  distribution_transaction_id: string;

  @Prop({ required: true })
  distribution_date: number;

  @Prop({ required: false })
  error_message: string;
}

export const TeamSchema = SchemaFactory.createForClass(Team);
