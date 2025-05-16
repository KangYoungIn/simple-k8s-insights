import {
  Box, Typography, Grid, Card, CardContent, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  List, ListItem, ListItemText, Divider, CircularProgress
} from '@mui/material'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import ReactECharts from 'echarts-for-react'
import { useEffect, useState } from 'react'
import { useOverviewData } from '../hooks/useOverviewData'

interface NodeHistory {
  name: string
  cpu: { time: string; percent: number }[]
  memory: { time: string; percent: number }[]
}

export default function NodeCards() {
  const { nodes, pods } = useOverviewData()
  const [open, setOpen] = useState(false)
  const [histories, setHistories] = useState<NodeHistory[]>([])

  useEffect(() => {
    const now = new Date().toLocaleTimeString()

    setHistories(prev => {
      const updated = [...prev]

      nodes.forEach(node => {
        const cpuPercent = node.cpu.capacity > 0 ? (node.cpu.usage / node.cpu.capacity) * 100 : 0
        const memoryPercent = node.memory.capacity > 0 ? (node.memory.usage / node.memory.capacity) * 100 : 0

        const found = updated.find(h => h.name === node.name)

        if (found) {
          found.cpu.push({ time: now, percent: cpuPercent })
          found.memory.push({ time: now, percent: memoryPercent })
          if (found.cpu.length > 50) found.cpu.shift()
          if (found.memory.length > 50) found.memory.shift()
        } else {
          updated.push({
            name: node.name,
            cpu: [{ time: now, percent: cpuPercent }],
            memory: [{ time: now, percent: memoryPercent }]
          })
        }
      })

      return updated
    })
  }, [nodes])

  if (!nodes || nodes.length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ py: 10 }}>
        <CircularProgress />
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          노드 데이터를 불러오는 중입니다...
        </Typography>
      </Box>
    )
  }

  return (
    <Box mb={6}>
      <Box display="flex" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mr: 1 }}>
          Nodes Overview
        </Typography>
        <Tooltip title="지표 설명 보기" arrow>
          <IconButton size="small" onClick={() => setOpen(true)}>
            <HelpOutlineIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {nodes.map((node) => {
          const nodeHistory = histories.find(h => h.name === node.name)
          const podList = pods
            .filter(pod => pod.node === node.name)
            .map(pod => ({
              name: pod.name,
              value: (pod.cpu?.usage / node.cpu.capacity) * 100,
              namespace: pod.namespace,
              usage: pod.cpu?.usage
            }))

          const memList = pods
            .filter(pod => pod.node === node.name)
            .map(pod => ({
              name: pod.name,
              value: (pod.memory?.usage / node.memory.capacity) * 100,
              namespace: pod.namespace,
              usage: pod.memory?.usage
            }))

          return (
            <Grid item xs={12} md={6} key={node.name}>
              <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
                <CardContent>
                  <Typography variant="h6" align="center" gutterBottom>{node.name}</Typography>

                  <Box mb={2}>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="subtitle2" align="center">상태</Typography>
                        <Typography variant="body2" align="center" color={node.status !== 'Ready' ? 'error' : 'success.main'}>
                          {node.status}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="subtitle2" align="center">역할</Typography>
                        <Typography variant="body2" align="center">{node.role}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="subtitle2" align="center">파드 수</Typography>
                        <Typography variant="body2" align="center">{node.podCount.toLocaleString()} 개</Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <ReactECharts option={getGaugeChart('CPU', node.cpu.usage, node.cpu.capacity)} style={{ height: 220 }} />
                    </Grid>
                    <Grid item xs={6}>
                      <ReactECharts option={getGaugeChart('Memory', node.memory.usage, node.memory.capacity)} style={{ height: 220 }} />
                    </Grid>
                  </Grid>

                  {nodeHistory && (
                    <Box mt={4}>
                      <Typography variant="subtitle2" gutterBottom>실시간 사용률 변화</Typography>
                      <ReactECharts option={getLineChartOption(nodeHistory)} style={{ height: 300 }} />
                    </Box>
                  )}

                  <Grid container spacing={2} mt={4}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>파드별 CPU 사용률</Typography>
                      <ReactECharts option={getTreemapOption(podList, 'CPU')} style={{ height: 500 }} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>파드별 Memory 사용률</Typography>
                      <ReactECharts option={getTreemapOption(memList, 'Memory')} style={{ height: 500 }} />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Node 지표 설명</DialogTitle>
        <DialogContent>
          <List dense>
            <ListItem><ListItemText primary="각 노드의 총 용량 대비 사용량 백분율" /></ListItem>
            <ListItem><ListItemText primary="현재 사용량 / 총 용량" /></ListItem>
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  )
}

// ------------------ 차트 ------------------

function getTreemapOption(data: any[], type: 'CPU' | 'Memory') {
  return {
    tooltip: {
      formatter: (info: any) => {
        const d = info.data
        const usageUnit = type === 'CPU' ? 'm' : 'MiB'
        return `
          <strong>${d.namespace}/${d.name}</strong><br/>
          사용률: ${d.value.toFixed(1)}%<br/>
          사용량: ${d.usage?.toLocaleString() ?? '-'} ${usageUnit}
        `
      }
    },
    series: [
      {
        type: 'treemap',
        roam: true,
        nodeClick: false,
        data,
        label: { show: true, formatter: '{b}' },
        upperLabel: { show: false },
        itemStyle: {
          borderColor: '#999',
          borderWidth: 1
        }
      }
    ]
  }
}

function getGaugeChart(name: string, usage: number, capacity: number) {
  const percent = capacity > 0 ? +((usage / capacity) * 100).toFixed(1) : 0

  const getColorByValue = (v: number) => {
    if (v <= 50) return '#00c853'
    if (v <= 80) return '#ffce34'
    return '#fd666d'
  }

  const formatUsage = (name: string, usage: number, capacity: number) => {
    if (name === 'CPU') {
      return `${usage.toLocaleString()} / ${capacity.toLocaleString()} mCPU`
    } else if (name === 'Memory') {
      return `${(usage / 1024).toFixed(2)} / ${(capacity / 1024).toFixed(2)} GiB`
    }
    return `${usage} / ${capacity}`
  }

  return {
    title: {
      text: name,
      top: '10%',
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 'bold', color: '#333' }
    },
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
        progress: { show: true, width: 15 },
        detail: {
          fontSize: 14,
          offsetCenter: [0, '30%'],
          valueAnimation: true,
          formatter: (value: any) => `${value}%\n${formatUsage(name, usage, capacity)}`,
          color: getColorByValue(percent)
        },
        data: [{ value: percent }]
      }
    ]
  }
}


function getLineChartOption(history: NodeHistory) {
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['CPU %', 'Memory %'] },
    grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: history.cpu.map(item => item.time)
    },
    yAxis: { type: 'value', min: 0, max: 100 },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100 }
    ],
    series: [
      {
        name: 'CPU %',
        type: 'line',
        smooth: true,
        data: history.cpu.map(item => item.percent),
        lineStyle: { color: '#5470C6' }
      },
      {
        name: 'Memory %',
        type: 'line',
        smooth: true,
        data: history.memory.map(item => item.percent),
        lineStyle: { color: '#91CC75' }
      }
    ]
  }
}
