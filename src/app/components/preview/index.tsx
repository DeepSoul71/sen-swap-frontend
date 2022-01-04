import { ReactNode } from 'react'
import { useSelector } from 'react-redux'
import { PoolData } from '@senswap/sen-js'

import { Col, Row, Typography } from 'antd'
import RouteAvatar from './routeAvatar'

import { AppState } from 'app/model'
import { numeric } from 'shared/util'
import { useSlippageRate } from 'app/hooks/useSlippageRate'
import Price from './price'

export type LiteMintInfo = {
  address: string
  decimals: number
}

export type HopData = {
  poolData: PoolData & { address: string }
  srcMintInfo: LiteMintInfo
  dstMintInfo: LiteMintInfo
}

const ExtraTypography = ({
  label = '',
  content = '',
}: {
  label?: string
  content?: string | ReactNode
}) => {
  return (
    <Row>
      <Col flex="auto">
        <Typography.Text type="secondary">{label}</Typography.Text>
      </Col>
      <Col>
        <span>{content}</span>
      </Col>
    </Row>
  )
}

const PreviewSwap = () => {
  const { slippage: slippageSettings } = useSelector(
    (state: AppState) => state.settings,
  )
  const slippageRate = useSlippageRate()

  return (
    <Row gutter={[12, 12]}>
      <Col span={24}>
        <ExtraTypography
          label="Price impact"
          content={
            <Typography.Text type="danger">
              {numeric(Number(slippageRate)).format('0.[0000]%')}
            </Typography.Text>
          }
        />
      </Col>
      <Col span={24}>
        <ExtraTypography label="Price" content={<Price />} />
      </Col>
      <Col span={24}>
        <ExtraTypography
          label="Slippage Tolerance"
          content={numeric(slippageSettings).format('0.[00]%')}
        />
      </Col>
      <Col span={24}>
        <ExtraTypography label="Route" content={<RouteAvatar />} />
      </Col>
    </Row>
  )
}

export default PreviewSwap
