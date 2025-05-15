import { Box, Typography, IconButton, Dialog, DialogTitle,
  DialogContent, List, ListItem, ListItemText, Tooltip, Grid, Card, CardContent, Divider, CircularProgress, Table, TableHead, TableCell, TableBody, TableRow  } from '@mui/material'
import ReactECharts from 'echarts-for-react'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { useEffect, useState } from 'react'
import { useOverviewData } from '../hooks/useOverviewData'
import type { ClusterData, ResourceData } from '../types/overview'

export default function ClusterSummary() {
  const { cluster } = useOverviewData()
  const [open, setOpen] = useState(false)

  if (!cluster) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ py: 10 }}>
        <CircularProgress />
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          클러스터 데이터를 불러오는 중입니다...
        </Typography>
      </Box>
    )
  }

  return (
    <Box mb={6}>
      <Header onHelpClick={() => setOpen(true)} />

      <ClusterStatsCard stats={cluster} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ResourceCard title="CPU" resource={cluster.cpu} />
        </Grid>
        <Grid item xs={12} md={6}>
          <ResourceCard title="Memory" resource={cluster.memory} />
        </Grid>
      </Grid>

      <HelpDialog open={open} onClose={() => setOpen(false)} />
    </Box>
  )
}

function Header({ onHelpClick }: { onHelpClick: () => void }) {
  return (
    <Box display="flex" alignItems="center" mb={3}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mr: 1 }}>
        Cluster Overview
      </Typography>
      <Tooltip title="지표 설명 보기" arrow>
        <IconButton size="small" onClick={onHelpClick}>
          <HelpOutlineIcon />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

function ClusterStatsCard({ stats }: { stats: ClusterData }) {
  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 4 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>클러스터 통계</Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={4}>
            <Typography variant="body2" color="textSecondary">노드 수</Typography>
            <Typography variant="h6">{stats.nodeCount}</Typography>
          </Grid>
          <Grid item xs={6} md={4}>
            <Typography variant="body2" color="textSecondary">Ready 노드</Typography>
            <Typography variant="h6">{stats.readyNodeCount}</Typography>
          </Grid>
          <Grid item xs={6} md={4}>
            <Typography variant="body2" color="textSecondary">NotReady 노드</Typography>
            <Typography variant="h6" color={stats.notReadyNodeCount > 0 ? 'error' : 'inherit'}>
              {stats.notReadyNodeCount}
            </Typography>
          </Grid>
          <Grid item xs={6} md={4}>
            <Typography variant="body2" color="textSecondary">파드 수</Typography>
            <Typography variant="h6">{stats.podCount}</Typography>
          </Grid>
          <Grid item xs={6} md={4}>
            <Typography variant="body2" color="textSecondary">네임스페이스 수</Typography>
            <Typography variant="h6">{stats.namespaceCount}</Typography>
          </Grid>
          <Grid item xs={6} md={4}>
            <Typography variant="body2" color="textSecondary">쿠버네티스 버전</Typography>
            <Typography variant="h6">{stats.kubernetesVersion}</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>지표 설명</DialogTitle>
      <DialogContent>
        <List dense>
          {[
            { primary: 'Usage: 현재 실제 사용량 (metrics)' },
            { primary: 'Requests: 파드가 요청한 리소스 합계' },
            { primary: 'Limits: 파드가 설정한 리소스 제한 합계' },
            { primary: 'Capacity: 노드/클러스터 총 리소스' }
          ].map((item, index) => (
            <ListItem key={index}>
              <ListItemText primary={item.primary} />
            </ListItem>
          ))}
        </List>
        <Typography variant="caption" color="textSecondary">
          모든 퍼센트는 Capacity 대비 비율을 의미합니다.
        </Typography>
      </DialogContent>
    </Dialog>
  )
}

function ResourceCard({ title, resource }: { title: string; resource: ResourceData }) {
  const getPercent = (used: number, total: number) => total > 0 ? +((used / total) * 100).toFixed(2) : 0
  const [history, setHistory] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<string[]>([])

  useEffect(() => {
    const now = new Date().toLocaleTimeString()
    setHistory((prev) => {
      const next = [...prev, {
        time: now,
        usage: resource.usage,
        requests: resource.requests,
        limits: resource.limits,
        capacity: resource.capacity
      }]
      if (next.length > 50) next.shift()
      return next
    })
  }, [resource])

  useEffect(() => {
    const recs: string[] = []

    const usagePercent = getPercent(resource.usage, resource.capacity)
    //const requestsPercent = getPercent(resource.requests, resource.capacity)
    //const limitsPercent = getPercent(resource.limits, resource.capacity)

    // Kubernetes Best Practice Rule 기반 추천 생성
    if (resource.requests > resource.capacity * 0.7) {
      recs.push('Requests가 Capacity의 70%를 초과했습니다. 스케줄링 실패 위험이 있습니다.')
    }

    if (resource.usage > resource.requests * 1.1) {
      recs.push('Usage가 Requests보다 10% 이상 높습니다. Request 값을 조정하는 것을 고려하세요.')
    }

    if (resource.requests > resource.usage * 2) {
      recs.push('Requests가 실제 Usage의 2배 이상입니다. 불필요한 리소스 예약을 최적화하세요.')
    }

    if (resource.limits > resource.capacity * 2) {
      recs.push('Limits가 Capacity의 2배 이상입니다. 노드 과부하 또는 OOM 가능성을 주의하세요.')
    }

    if (usagePercent > 90) {
      recs.push('Usage가 Capacity의 90%를 초과했습니다. 리소스 부족이 발생할 수 있습니다.')
    }

    setRecommendations(recs)
  }, [resource])

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h6" align="center" gutterBottom>{title}</Typography>
        
        {/* 게이지 차트 */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography align="center" variant="subtitle2" gutterBottom>Usage</Typography>
            <ReactECharts option={getGaugeChart(getPercent(resource.usage, resource.capacity))} style={{ height: '200px' }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography align="center" variant="subtitle2" gutterBottom>Requests</Typography>
            <ReactECharts option={getGaugeChart(getPercent(resource.requests, resource.capacity))} style={{ height: '200px' }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography align="center" variant="subtitle2" gutterBottom>Limits</Typography>
            <ReactECharts option={getGaugeChart(getPercent(resource.limits, resource.capacity))} style={{ height: '200px' }} />
          </Grid>
        </Grid>

        {/* 시계열 리소스 변화 */}
        <Box mt={4}>
          <Typography variant="subtitle2" gutterBottom>시계열 리소스 변화</Typography>
          <ReactECharts
            option={getLineChartOption(history)}
            style={{ height: '300px' }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 세부 리소스 현황 */}
        <Box mt={4} sx={{ border: '1px solid #ddd', borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ p: 2 }}>
            세부 리소스 현황
          </Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>항목</TableCell>
                <TableCell>현재 값</TableCell>
                <TableCell>권장 값</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                { label: 'Usage', value: formatResource(title, resource.usage), field: 'usage' },
                { label: 'Requests', value: formatResource(title, resource.requests), field: 'requests' },
                { label: 'Limits', value: formatResource(title, resource.limits), field: 'limits' },
                { label: 'Capacity', value: formatResource(title, resource.capacity), field: 'capacity' },
              ].map((item) => (
                <TableRow key={item.label}>
                  <TableCell>{item.label}</TableCell>
                  <TableCell>{item.value}</TableCell>
                  <TableCell>
                    {(item.field === 'requests' || item.field === 'limits')
                      ? getRecommendedRange(title, item.field as 'requests' | 'limits', resource.capacity)
                      : '-'
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>


        {/* 권장 사항 영역 */}
        {recommendations.length > 0 && (
          <Box mt={4} p={2} sx={{ border: '1px dashed #ffa726', borderRadius: 2, backgroundColor: '#fff8e1' }}>
            <Typography variant="subtitle1" gutterBottom>
              권장 사항
            </Typography>
            <List dense>
              {recommendations.map((rec, idx) => (
                <ListItem key={idx}>
                  <ListItemText primary={rec} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}


function getGaugeChart(value: number) {
  const getColorByValue = (v: number) => {
    if (v <= 50) return '#00c853'
    if (v <= 80) return '#ffce34'
    return '#fd666d'
  }

  return {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        radius: '100%',
        center: ['50%', '75%'],
        axisLine: {
          lineStyle: {
            width: 15,
            color: [
              [0.5, '#00c853'],
              [0.8, '#ffce34'],
              [1, '#fd666d']
            ]
          }
        },
        pointer: {
          show: true,
          icon: 'path://M2,0 L-2,0 L0,-80 Z',
          length: '70%',
          width: 4,
          itemStyle: { color: '#fd666d' }
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        progress: {
          show: true,
          width: 15
        },
        detail: {
          fontSize: 18,
          offsetCenter: [0, '30%'],
          valueAnimation: true,
          formatter: '{value}%',
          color: getColorByValue(value)
        },
        data: [{ value }]
      }
    ]
  }
}

function getLineChartOption(history: any[]) {
  return {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      top: '5%',
      data: ['Usage', 'Requests', 'Limits', 'Capacity']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%', // 슬라이더 들어갈 공간 확보
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: history.map(item => item.time)
    },
    yAxis: {
      type: 'value'
    },
    dataZoom: [
      {
        type: 'inside', // 드래그 확대 지원
        start: 0,
        end: 100
      },
      {
        type: 'slider', // 하단 슬라이더
        start: 0,
        end: 100
      }
    ],
    series: [
      {
        name: 'Usage',
        type: 'line',
        smooth: true,
        data: history.map(item => item.usage)
      },
      {
        name: 'Requests',
        type: 'line',
        smooth: true,
        data: history.map(item => item.requests)
      },
      {
        name: 'Limits',
        type: 'line',
        smooth: true,
        data: history.map(item => item.limits)
      },
      {
        name: 'Capacity',
        type: 'line',
        smooth: true,
        data: history.map(item => item.capacity)
      }
    ]
  }
}

function formatResource(type: string, value: number) {
  if (type === 'CPU') {
    return `${value.toLocaleString()} mCPU`
  } else if (type === 'Memory') {
    return `${(value / 1024).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GiB`
  }
  return value.toLocaleString()
}

function getRecommendedRange(type: string, field: 'requests' | 'limits', capacity: number): string | null {
  if (!capacity || capacity <= 0) return null

  if (field === 'requests') {
    const min = capacity * 0.6
    const max = capacity * 0.7
    return `${formatResource(type, min)} ~ ${formatResource(type, max)}`
  }

  if (field === 'limits') {
    const min = capacity * 1.0
    const max = capacity * 1.2
    return `${formatResource(type, min)} ~ ${formatResource(type, max)}`
  }

  return null
}
