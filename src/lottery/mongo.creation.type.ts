export interface LotteryCreationType {
  slug: string;
  timestamp: number;
  pda: string;
  token_account: string;
  status: string;
}

export interface SaveMemberCreationType {
  type: string;
  wallet: string;
  status: string;
  amount_distributed: number;
  distribution_transaction_id: string;
  distribution_date: number;
  error_message?: string;
}
