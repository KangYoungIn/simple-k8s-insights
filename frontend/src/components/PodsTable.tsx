import { DataGrid, GridToolbar } from '@mui/x-data-grid'
import { useOverviewData } from '../hooks/useOverviewData'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Typography,
  Tooltip,
  IconButton,
  CircularProgress,
  Box,
} from '@mui/material'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { PodDetailDialog } from './PodDetailDialog'
import { useState } from 'react'

export default function PodsTable() {
  const { pods } = useOverviewData()
  const [openHelp, setOpenHelp] = useState(false)
  const [selectedPod, setSelectedPod] = useState<any | null>(null)

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
    }
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
          onRowClick={(params) => setSelectedPod(params.row)}
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

      {selectedPod && (
        <PodDetailDialog pod={selectedPod} onClose={() => setSelectedPod(null)} />
      )}
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
