import { useCallback, useMemo, useState } from 'react'
import { DEFAULT_WSOL, utils } from '@senswap/sen-js'
import { useSelector } from 'react-redux'
import { useWallet } from '@senhub/providers'

import { Button } from 'antd'

import { AppState } from 'app/model'
import { explorer } from 'shared/util'
import useAccountBalance from 'shared/hooks/useAccountBalance'
import usePriceImpact from 'app/hooks/usePriceImpact'
import { PriceImpact } from 'app/constant/swap'
import { useWrapSol } from './useWrapSol'

const DECIMALS = BigInt(1000000000)

const SwapButton = ({
  onCallback = () => {},
  forceSwap = false,
}: {
  onCallback?: () => void
  forceSwap?: boolean
}) => {
  const [loading, setLoading] = useState(false)
  const {
    route: { best },
    bid: {
      amount: _bidAmount,
      mintInfo: { address: bidMintAddress, decimals: bidMintDecimals },
      accountAddress: bidAccountAddress,
    },
    ask: {
      amount: _askAmount,
      mintInfo: { decimals: askMintDecimals },
    },
    settings: { slippage, advanced },
  } = useSelector((state: AppState) => state)
  const {
    wallet: { address: walletAddress, lamports },
  } = useWallet()
  const { amount: bidBalance } = useAccountBalance(bidAccountAddress)
  const priceImpact = usePriceImpact()
  const { wrapAmount, wrapSol } = useWrapSol()

  const availableBid = useMemo((): string => {
    if (bidMintAddress !== DEFAULT_WSOL)
      return utils.undecimalize(bidBalance, bidMintDecimals)
    // So estimate max = 0.01 fee -> multi transaction.
    const estimateFee = utils.decimalize(0.01, bidMintDecimals)
    const max = lamports + bidBalance - estimateFee
    if (max <= bidBalance)
      return utils.undecimalize(bidBalance, bidMintDecimals)
    return utils.undecimalize(max, bidMintDecimals)
  }, [bidBalance, bidMintAddress, bidMintDecimals, lamports])

  const handleSwap = useCallback(async () => {
    const { swap, splt, wallet } = window.sentre
    if (!wallet) throw new Error('Wallet is not connected')
    // Synthetize routings
    const routingAddresses = await Promise.all(
      best.map(
        async ({
          srcMintAddress,
          dstMintAddress,
          poolData: { address: poolAddress },
        }) => {
          const srcAddress = await splt.deriveAssociatedAddress(
            walletAddress,
            srcMintAddress,
          )
          const dstAddress = await splt.deriveAssociatedAddress(
            walletAddress,
            dstMintAddress,
          )
          return {
            poolAddress: poolAddress,
            srcAddress: srcAddress,
            dstAddress: dstAddress,
          }
        },
      ),
    )
    // Compute limit
    const bidAmount = utils.decimalize(_bidAmount, bidMintDecimals)
    const askAmount = utils.decimalize(_askAmount, askMintDecimals)
    const limit =
      (askAmount * (DECIMALS - utils.decimalize(slippage, 9))) / DECIMALS
    // Execute swap
    return await swap.route(bidAmount, limit, routingAddresses, wallet)
  }, [
    best,
    bidMintDecimals,
    askMintDecimals,
    slippage,
    walletAddress,
    _bidAmount,
    _askAmount,
  ])

  const onSwap = async () => {
    try {
      setLoading(true)
      // check wrap sol
      if (wrapAmount) await wrapSol()

      const { txId } = await handleSwap()
      window.notify({
        type: 'success',
        description: 'Swap successfully. Click to view details.',
        onClick: () => window.open(explorer(txId), '_blank'),
      })
      return onCallback()
    } catch (er: any) {
      return window.notify({ type: 'error', description: er.message })
    } finally {
      return setLoading(false)
    }
  }

  const tooHighImpact =
    !advanced && priceImpact > PriceImpact.acceptableSwap && !forceSwap
  const disabled =
    tooHighImpact ||
    !best.length ||
    !Number(_bidAmount) ||
    !Number(_askAmount) ||
    Number(_bidAmount) > Number(availableBid)
  return (
    <Button
      type="primary"
      onClick={onSwap}
      disabled={disabled}
      loading={loading}
      block
    >
      {tooHighImpact
        ? 'Too High Price Impact'
        : forceSwap
        ? 'Swap Anyway'
        : 'Swap'}
    </Button>
  )
}

export default SwapButton
