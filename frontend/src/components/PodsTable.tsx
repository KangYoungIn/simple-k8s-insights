import { DataGrid, GridToolbar } from '@mui/x-data-grid'
import { useOverviewData } from '../hooks/useOverviewData'
import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, Typography, Tooltip, IconButton, CircularProgress, Box } from '@mui/material'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { useState } from 'react'

export default function PodsTable() {
  const { pods } = useOverviewData()
  const [openHelp, setOpenHelp] = useState(false)

  if (!pods || pods.length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ py: 10 }}>
        <CircularProgress />
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          파드 데이터를 불러오는 중입니다...
        </Typography>
      </Box>
    )
  }

  const columns = [
    { field: 'namespace', headerName: 'Namespace', flex: 1 },
    { field: 'name', headerName: 'Pod Name', flex: 2 },
    { field: 'node', headerName: 'Node', flex: 1.5 },
    {
      field: 'cpuUsage',
      headerName: 'CPU Usage (m)',
      flex: 1,
      renderCell: (params: any) => formatNumber(params.row.cpu?.usage),
    },
    {
      field: 'cpuPercent',
      headerName: 'CPU % (Node)',
      flex: 1,
      renderCell: (params: any) => calcPercent(params.row.cpu?.usage, params.row.nodeCpuCapacity),
    },
    {
      field: 'cpuRequests',
      headerName: 'CPU Requests (m)',
      flex: 1,
      renderCell: (params: any) => formatNumber(params.row.cpu?.requests),
    },
    {
      field: 'cpuLimits',
      headerName: 'CPU Limits (m)',
      flex: 1,
      renderCell: (params: any) => formatNumber(params.row.cpu?.limits),
    },
    {
      field: 'memoryUsage',
      headerName: 'Memory Usage (MiB)',
      flex: 1,
      renderCell: (params: any) => formatNumber(params.row.memory?.usage),
    },
    {
      field: 'memoryPercent',
      headerName: 'Memory % (Node)',
      flex: 1,
      renderCell: (params: any) => calcPercent(params.row.memory?.usage, params.row.nodeMemoryCapacity),
    },
    {
      field: 'memoryRequests',
      headerName: 'Memory Requests (MiB)',
      flex: 1,
      renderCell: (params: any) => formatNumber(params.row.memory?.requests),
    },
    {
      field: 'memoryLimits',
      headerName: 'Memory Limits (MiB)',
      flex: 1,
      renderCell: (params: any) => formatNumber(params.row.memory?.limits),
    },
    {
      field: 'recommendation',
      headerName: '권장사항',
      flex: 2.5,
      renderCell: (params: any) => generateRecommendation(params.row),
      sortable: false, 
      filterable: false,
    },
  ]


  return (
    <section style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', margin: 0, marginRight: '8px' }}>Pods Overview</h2>
        <Tooltip title="권장사항 기준 보기" arrow>
          <IconButton size="small" onClick={() => setOpenHelp(true)}>
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      <div style={{ height: 700, width: '100%' }}>
        <DataGrid
          rows={pods}
          columns={columns}
          slots={{ toolbar: GridToolbar }}
          getRowId={(row) => `${row.namespace}-${row.name}`}
        />
      </div>

      <Dialog open={openHelp} onClose={() => setOpenHelp(false)}>
        <DialogTitle>권장사항 기준</DialogTitle>
        <DialogContent>
          <List dense>
            {[
              { text: 'CPU Request 미설정 또는 0: 설정 필요', severity: 'critical' },
              { text: 'Memory Request 미설정 또는 0: 설정 필요', severity: 'critical' },
              { text: 'CPU Usage가 Request 대비 10% 초과: Request 상향 권장', severity: 'critical' },
              { text: 'CPU Request가 Usage의 2배 이상: Request 하향 권장', severity: 'warning' },
              { text: 'CPU Limits 미설정 또는 0: 설정 필요', severity: 'critical' },
              { text: 'CPU Limits가 Node Capacity의 2배 초과: Limits 하향 권장', severity: 'warning' },
              { text: 'Memory Usage가 Request 대비 10% 초과: Request 상향 권장', severity: 'critical' },
              { text: 'Memory Request가 Usage의 2배 이상: Request 하향 권장', severity: 'warning' },
              { text: 'Memory Limits 미설정 또는 0: 설정 필요', severity: 'critical' },
              { text: 'Memory Limits가 Node Capacity의 2배 초과: Limits 하향 권장', severity: 'warning' },
            ].map((item, idx) => (
              <ListItem key={idx} sx={{ py: 0.5 }}>
                <ListItemText
                  primary={
                    <span style={{ color: item.severity === 'critical' ? '#f44336' : '#ff9800' }}>
                      {item.text}
                    </span>
                  }
                />
              </ListItem>
            ))}
          </List>
          <Typography variant="caption" color="textSecondary">
            권장사항은 클러스터 리소스 안정성과 효율성을 고려하여 생성되었습니다.
          </Typography>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function calcPercent(usage: number, capacity: number) {
  if (!capacity) return '-'
  const percent = (usage / capacity) * 100
  return percent.toFixed(1) + '%'
}

function formatNumber(value: number) {
  return value?.toLocaleString()
}

function generateRecommendation(row: any) {
  const recommendations: { message: string; severity: 'critical' | 'warning' | 'info' }[] = []

  // CPU Request 체크
  if (row.cpu?.requests == null || row.cpu.requests === 0) {
    recommendations.push({
      message: 'CPU Request를 설정하세요.',
      severity: 'critical'
    })
  } else if (row.cpu?.usage && row.cpu.requests) {
    if (row.cpu.usage > row.cpu.requests * 1.1) {
      const suggested = Math.ceil(row.cpu.usage * 1.2)
      recommendations.push({
        message: `CPU Request를 ${suggested.toLocaleString()} m으로 상향하세요.`,
        severity: 'critical'
      })
    } else if (row.cpu.requests > row.cpu.usage * 2) {
      const suggested = Math.ceil(row.cpu.usage * 1.5)
      recommendations.push({
        message: `CPU Request를 ${suggested.toLocaleString()} m으로 하향하세요.`,
        severity: 'warning'
      })
    }
  }

  // CPU Limits 체크
  if (row.cpu?.limits == null || row.cpu.limits === 0) {
    recommendations.push({
      message: 'CPU Limit를 설정하세요.',
      severity: 'critical'
    })
  } else if (row.nodeCpuCapacity && row.cpu.limits > row.nodeCpuCapacity * 2) {
    const suggested = Math.ceil(row.nodeCpuCapacity)
    recommendations.push({
      message: `CPU Limit를 ${suggested.toLocaleString()} m 이하로 조정하세요.`,
      severity: 'warning'
    })
  }

  // Memory Request 체크
  if (row.memory?.requests == null || row.memory.requests === 0) {
    recommendations.push({
      message: 'Memory Request를 설정하세요.',
      severity: 'critical'
    })
  } else if (row.memory?.usage && row.memory.requests) {
    if (row.memory.usage > row.memory.requests * 1.1) {
      const suggested = Math.ceil(row.memory.usage * 1.2)
      recommendations.push({
        message: `Memory Request를 ${suggested.toLocaleString()} MiB로 상향하세요.`,
        severity: 'critical'
      })
    } else if (row.memory.requests > row.memory.usage * 2) {
      const suggested = Math.ceil(row.memory.usage * 1.5)
      recommendations.push({
        message: `Memory Request를 ${suggested.toLocaleString()} MiB로 하향하세요.`,
        severity: 'warning'
      })
    }
  }

  // Memory Limits 체크
  if (row.memory?.limits == null || row.memory.limits === 0) {
    recommendations.push({
      message: 'Memory Limit를 설정하세요.',
      severity: 'critical'
    })
  } else if (row.nodeMemoryCapacity && row.memory.limits > row.nodeMemoryCapacity * 2) {
    const suggested = Math.ceil(row.nodeMemoryCapacity)
    recommendations.push({
      message: `Memory Limit를 ${suggested.toLocaleString()} MiB 이하로 조정하세요.`,
      severity: 'warning'
    })
  }

  if (recommendations.length === 0) {
    return <span style={{ color: '#4caf50' }}>조정 필요 없음</span>
  }

  return (
    <ul style={{ paddingLeft: '16px', margin: 0 }}>
      {recommendations.map((rec, idx) => (
        <li key={idx} style={{ color: getColorBySeverity(rec.severity), marginBottom: '4px' }}>
          {rec.message}
        </li>
      ))}
    </ul>
  )
}

function getColorBySeverity(severity: 'critical' | 'warning' | 'info') {
  switch (severity) {
    case 'critical':
      return '#f44336' // 빨간색
    case 'warning':
      return '#ff9800' // 주황색
    case 'info':
    default:
      return '#2196f3' // 파란색
  }
}
