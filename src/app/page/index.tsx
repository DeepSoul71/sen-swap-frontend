import { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { account } from '@senswap/sen-js'

import { Row, Col } from 'antd'
import SwapChart from './chart'
import Swap from './swap'
import History from './history'

import { usePool } from 'senhub/providers'
import { useMintSelection } from 'app/hooks/useMintSelection'
import { AppDispatch } from 'app/model'
import { updateBidData } from 'app/model/bid.controller'
import { updateAskData } from 'app/model/ask.controller'
import { SenLpState } from 'app/constant/senLpState'
import 'app/static/styles/index.less'

const Page = () => {
  const { pools } = usePool()
  const dispatch = useDispatch<AppDispatch>()
  const { state } = useLocation<SenLpState>()
  const [bid, setBid] = useState('')
  const [ask, setAsk] = useState('')
  const bidData = useMintSelection(bid)
  const askData = useMintSelection(ask)
  const poolAdress = state?.poolAddress

  /** Check state when user come from sen LP */
  const checkIsSenLpCome = useCallback(() => {
    if (!account.isAddress(poolAdress)) return
    const poolData = pools[poolAdress]
    if (!poolData) return
    setBid(poolData?.mint_a)
    setAsk(poolData?.mint_b)
  }, [poolAdress, pools])

  useEffect(() => {
    checkIsSenLpCome()
  }, [checkIsSenLpCome])

  useEffect(() => {
    if (
      !account.isAddress(bidData.accountAddress) ||
      !account.isAddress(askData.accountAddress)
    )
      return
    dispatch(updateBidData(bidData))
    dispatch(updateAskData(askData))
  }, [askData, bidData, dispatch])

  return (
    <Row gutter={[24, 24]} style={{ paddingBottom: 12 }}>
      <Col lg={8} md={12} xs={24}>
        <Swap />
      </Col>
      <Col lg={16} md={12} xs={24}>
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <SwapChart />
          </Col>
          <Col span={24}>
            <History />
          </Col>
        </Row>
      </Col>
    </Row>
  )
}

export default Page
