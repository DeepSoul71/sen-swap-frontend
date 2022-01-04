import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { account, utils } from '@senswap/sen-js'

import { Button, Col, Row } from 'antd'
import IonIcon from 'shared/antd/ionicon'
import Ask from '../ask'
import Bid from '../bid'

import {
  buildPoolGraph,
  findAllRoute,
  findBestRouteFromAsk,
  findBestRouteFromBid,
  RouteTrace,
} from 'app/helper/router'
import { AppDispatch, AppState } from 'app/model'
import { updateAskData } from 'app/model/ask.controller'
import { updateBidData } from 'app/model/bid.controller'
import { RouteInfo, updateRoute } from 'app/model/route.controller'
import { usePool } from 'senhub/providers'
import { SenLpState } from 'app/constant/senLpState'

const SwapAction = ({ spacing = 12 }: { spacing?: number }) => {
  const dispatch = useDispatch<AppDispatch>()
  const [bestRoute, setBestRoute] = useState<RouteInfo>({
    hops: [],
    amounts: [],
    amount: BigInt(0),
  })
  const { bid: bidData, ask: askData } = useSelector((state: AppState) => state)
  const { pools } = usePool()
  const { state } = useLocation<SenLpState>()
  const poolAdress = state?.poolAddress
  const originalRoute = state?.originalRoute

  /**
   * Switch tokens
   */
  const onSwitch = useCallback(async () => {
    const { amount: bidAmount, priority: bidPriority, ...bidRest } = bidData
    const { amount: askAmount, priority: askPriority, ...askRest } = askData
    const amount = bidPriority > askPriority ? bidAmount : askAmount
    const updateData = bidPriority > askPriority ? updateAskData : updateBidData
    await dispatch(updateBidData({ ...askRest, amount: '', reset: true }))
    await dispatch(updateAskData({ ...bidRest, amount: '', reset: true }))
    await dispatch(updateData({ amount, prioritized: true }))
  }, [dispatch, askData, bidData])

  /**
   * Find optimal route
   */
  const findRoute = useCallback(async () => {
    const {
      poolAddresses: bidPoolAddresses,
      mintInfo: { address: bidMintAddress },
      amount: bidAmount,
      priority: bidPriority,
    } = bidData
    const {
      poolAddresses: askPoolAddresses,
      mintInfo: { address: askMintAddress },
      amount: askAmount,
      priority: askPriority,
    } = askData

    const bidPools = bidPoolAddresses.map((address) => ({
      address,
      ...pools[address],
    }))
    const askPools = askPoolAddresses.map((address) => ({
      address,
      ...pools[address],
    }))

    // Initialize an instance for the best route
    // The best route return a route that user can receive maximum ask amount when swap
    let bestRoute: RouteInfo = { hops: [], amounts: [], amount: BigInt(0) }
    // Return empty default
    if (
      (!Number(bidAmount) && !Number(askAmount)) ||
      !account.isAddress(bidMintAddress) ||
      !account.isAddress(askMintAddress) ||
      !bidPools.length ||
      !askPools.length
    )
      return setBestRoute(bestRoute)
    // All possible routes
    let allRoutes = new Array<RouteTrace>()
    findAllRoute(
      allRoutes,
      buildPoolGraph(pools),
      bidMintAddress,
      askMintAddress,
    )
    // No available route
    if (!allRoutes.length) return setBestRoute(bestRoute)

    // When user select original route from senlp
    if (originalRoute)
      allRoutes = allRoutes.filter(
        ({ pools }) => pools.length === 1 && pools[0] === poolAdress,
      )

    if (askPriority < bidPriority) {
      bestRoute = await findBestRouteFromBid(pools, allRoutes, bidData, askData)
    } else {
      bestRoute = await findBestRouteFromAsk(pools, allRoutes, bidData, askData)
    }

    return setBestRoute(bestRoute)
  }, [askData, bidData, originalRoute, poolAdress, pools])

  const setRoute = useCallback(() => {
    const bidPriority = bidData.priority
    const askPriority = askData.priority
    if (askPriority < bidPriority) {
      dispatch(
        updateAskData({
          amount: utils.undecimalize(
            bestRoute.amount,
            askData.mintInfo?.decimals || 0,
          ),
        }),
      )
    }
    if (bidPriority < askPriority) {
      dispatch(
        updateBidData({
          amount: utils.undecimalize(
            bestRoute.amount,
            bidData.mintInfo?.decimals || 0,
          ),
        }),
      )
    }
    dispatch(updateRoute({ ...bestRoute }))
  }, [
    askData.priority,
    bestRoute,
    bidData.priority,
    dispatch,
    bidData.mintInfo?.decimals,
    askData.mintInfo?.decimals,
  ])

  useEffect(() => {
    setRoute()
  }, [setRoute])

  useEffect(() => {
    findRoute()
  }, [findRoute])

  return (
    <Row gutter={[spacing, spacing]} justify="center">
      <Col span={24}>
        <Bid />
      </Col>
      <Col>
        <Button
          size="small"
          icon={<IonIcon name="git-compare-outline" />}
          onClick={onSwitch}
        />
      </Col>
      <Col span={24}>
        <Ask />
      </Col>
    </Row>
  )
}

export default SwapAction
