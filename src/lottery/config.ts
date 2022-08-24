import { PublicKey, Commitment, Connection, Signer } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@project-serum/anchor';
import { Account, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import * as anchor from '@project-serum/anchor';

const preflightCommitment: Commitment = 'confirmed';

/**
 * @param wallet
 * @param connection
 */
const getConnectionProvider = async (
  wallet: Wallet,
  connection: Connection,
) => {
  return new AnchorProvider(connection, wallet, {
    commitment: preflightCommitment,
  });
};

/**
 * @param wallet
 * @param connection
 */
export const getProgram = async (wallet: Wallet, connection: Connection) => {
  const provider = await getConnectionProvider(wallet, connection);
  const idl = await Program.fetchIdl(
    new PublicKey(process.env.CRYPTOLOTTO_PROGRAM_ID),
    provider,
  );
  return new Program(
    idl,
    new PublicKey(process.env.CRYPTOLOTTO_PROGRAM_ID),
    provider,
  );
};

/**
 * @param connection
 * @param wallet
 * @param ownerWallet
 * @param allowOwnerOffCurve
 */
export const getAssociatedTokenAccount = async (
  connection: Connection,
  wallet: Signer,
  ownerWallet: PublicKey,
  allowOwnerOffCurve = false,
): Promise<Account> => {
  return await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    new PublicKey(process.env.USDC_MINT_ADDRESS),
    ownerWallet,
    allowOwnerOffCurve,
  );
};

/**
 *
 * @param key
 * @param bufferedTimestamp
 * @param programId
 */
export const getPDA = async (
  key: string,
  bufferedTimestamp: Buffer,
  programId: PublicKey,
) => {
  const seed = [
    Buffer.from(anchor.utils.bytes.utf8.encode(key)),
    bufferedTimestamp,
  ];

  const [_pda, _] = await PublicKey.findProgramAddress(seed, programId);

  return _pda;
};
