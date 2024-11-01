import {
  Keypair,
  Connection,
  SystemProgram,
  VersionedTransaction,
  TransactionInstruction,
  TransactionMessage,
  ComputeBudgetProgram,
  Transaction,
  Commitment
} from '@solana/web3.js'
import {
  BUY_LOWER_PERCENT,
  DISTRIBUTE_WALLET_NUM,
  PRIVATE_KEY,
  RPC_ENDPOINT,
  RPC_WEBSOCKET_ENDPOINT,
  JITO_MODE,
} from './constants'
import { Data, readJson, saveDataToFile, sleep } from './utils'
import base58 from 'bs58'
import { execute } from './executor/legacy'
import { executeJitoTx } from './executor/jito'

export const solanaConnection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment: "confirmed"
})

export const mainKp = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY))
const distritbutionNum = DISTRIBUTE_WALLET_NUM > 20 ? 20 : DISTRIBUTE_WALLET_NUM
const jitoCommitment: Commitment = "confirmed"

const main = async () => {

  const solBalance = await solanaConnection.getBalance(mainKp.publicKey)

  let data: {
    kp: Keypair;
    buyAmount: number;
  }[] | null = null

  if (solBalance < (BUY_LOWER_PERCENT + 0.002) * distritbutionNum) {
    console.log("Sol balance is not enough for distribution")
  }

  data = await distributeSol(solanaConnection, mainKp, distritbutionNum)
  if (data == null || data.length == 0) {
    console.log("Distribution failed")
    return
  }

}

const distributeSol = async (connection: Connection, mainKp: Keypair, distritbutionNum: number) => {
  const data: Data[] = []
  const wallets = []
  try {
    const sendSolTx: TransactionInstruction[] = []
    sendSolTx.push(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 250_000 })
    )
    const mainSolBal = await connection.getBalance(mainKp.publicKey)
    if (mainSolBal <= 4 * 10 ** 6) {
      console.log("Main wallet balance is not enough")
      return []
    }
    let solAmount = Math.floor(mainSolBal / distritbutionNum - 5 * 10 ** 6)

    for (let i = 0; i < distritbutionNum; i++) {

      const wallet = Keypair.generate()
      wallets.push({ kp: wallet, buyAmount: solAmount })

      sendSolTx.push(
        SystemProgram.transfer({
          fromPubkey: mainKp.publicKey,
          toPubkey: wallet.publicKey,
          lamports: solAmount
        })
      )
    }

    let index = 0
    while (true) {
      try {
        if (index > 5) {
          console.log("Error in distribution")
          return null
        }
        const siTx = new Transaction().add(...sendSolTx)
        const latestBlockhash = await solanaConnection.getLatestBlockhash()
        siTx.feePayer = mainKp.publicKey
        siTx.recentBlockhash = latestBlockhash.blockhash
        const messageV0 = new TransactionMessage({
          payerKey: mainKp.publicKey,
          recentBlockhash: latestBlockhash.blockhash,
          instructions: sendSolTx,
        }).compileToV0Message()
        const transaction = new VersionedTransaction(messageV0)
        transaction.sign([mainKp])
        let txSig
        if (JITO_MODE) {
          txSig = await executeJitoTx([transaction], mainKp, jitoCommitment)
        } else {
          txSig = await execute(transaction, latestBlockhash, 1)
        }
        if (txSig) {
          const distibuteTx = txSig ? `https://solscan.io/tx/${txSig}` : ''
          console.log("SOL distributed ", distibuteTx)
          break
        }
        index++
      } catch (error) {
        index++
      }
    }

    wallets.map((wallet) => {
      data.push({
        privateKey: base58.encode(wallet.kp.secretKey),
        pubkey: wallet.kp.publicKey.toBase58(),
      })
    })
    try {
      saveDataToFile(data)
    } catch (error) {

    }
    console.log("Success in distribution")
    return wallets
  } catch (error) {
    console.log(`Failed to transfer SOL`)
    return null
  }
}

const buy = async (newWallet: Keypair, baseMint: PublicKey, buyAmount: number) => {
  let solBalance: number = 0
  try {
    solBalance = await solanaConnection.getBalance(newWallet.publicKey)
  } catch (error) {
    console.log("Error getting balance of wallet")
    return null
  }
  if (solBalance == 0) {
    return null
  }
  try {
    let buyTx = await getBuyTxWithJupiter(newWallet, baseMint, buyAmount)
    if (buyTx == null) {
      console.log(`Error getting buy transaction`)
      return null
    }
    // console.log(await solanaConnection.simulateTransaction(buyTx))
    let txSig
    if (JITO_MODE) {
      txSig = await executeJitoTx([buyTx], mainKp, jitoCommitment)
    } else {
      const latestBlockhash = await solanaConnection.getLatestBlockhash()
      txSig = await execute(buyTx, latestBlockhash, 1)
    }
    if (txSig) {
      const tokenBuyTx = txSig ? `https://solscan.io/tx/${txSig}` : ''
      console.log("Success in buy transaction: ", tokenBuyTx)
      return tokenBuyTx
    } else {
      return null
    }
  } catch (error) {
    return null
  }
}

const sell = async (baseMint: PublicKey, wallet: Keypair) => {
  try {
    const data: Data[] = readJson()
    if (data.length == 0) {
      await sleep(1000)
      return null
    }

    const tokenAta = await getAssociatedTokenAddress(baseMint, wallet.publicKey)
    const tokenBalInfo = await solanaConnection.getTokenAccountBalance(tokenAta)
    if (!tokenBalInfo) {
      console.log("Balance incorrect")
      return null
    }
    const tokenBalance = tokenBalInfo.value.amount

    try {
      let sellTx = await getSellTxWithJupiter(wallet, baseMint, tokenBalance)

      if (sellTx == null) {
        console.log(`Error getting buy transaction`)
        return null
      }
      // console.log(await solanaConnection.simulateTransaction(sellTx))
      let txSig
      if (JITO_MODE) {
        txSig = await executeJitoTx([sellTx], mainKp, jitoCommitment)
      } else {
        const latestBlockhash = await solanaConnection.getLatestBlockhash()
        txSig = await execute(sellTx, latestBlockhash, 1)
      }
      if (txSig) {
        const tokenSellTx = txSig ? `https://solscan.io/tx/${txSig}` : ''
        console.log("Success in sell transaction: ", tokenSellTx)
        return tokenSellTx
      } else {
        return null
      }
    } catch (error) {
      return null
    }
  } catch (error) {
    return null
  }
}

main()
