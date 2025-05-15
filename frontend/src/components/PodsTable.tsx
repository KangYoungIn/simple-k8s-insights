import {
  Table, TableHead, TableRow, TableCell, TableBody, TableSortLabel,
  Typography, Box, CircularProgress, Tooltip, IconButton, TextField, Button, Dialog, DialogTitle, DialogContent, List
} from '@mui/material'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { useState } from 'react'
import { useOverviewData } from '../hooks/useOverviewData'
import { PodDetailDialog } from './PodDetailDialog'

export default function PodsTable() {
  const { pods } = useOverviewData()
  const [orderBy, setOrderBy] = useState<string>('name')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [filterText, setFilterText] = useState<string>('')
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

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const handleDownloadCSV = () => {
    const headers = columns.map(col => col.headerName).join(',')
    const rows = sortedPods.map(pod => {
      return columns.map(col => {
        const value = col.renderCell ? col.renderCell({ row: pod }) : getValue(pod, col.field)
        return `"${value ?? ''}"`
      }).join(',')
    })
    const csvContent = [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'pods_overview.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredPods = pods.filter(pod => {
    const target = `${pod.namespace} ${pod.name} ${pod.node}`.toLowerCase()
    return target.includes(filterText.toLowerCase())
  })

  const sortedPods = filteredPods.slice().sort((a, b) => {
    const aValue = getValue(a, orderBy)
    const bValue = getValue(b, orderBy)
    if (aValue == null) return 1
    if (bValue == null) return -1
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return order === 'asc' ? aValue - bValue : bValue - aValue
    }
    return order === 'asc'
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue))
  })

  return (
    <section style={{ marginBottom: '40px' }}>
      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ mr: 1 }}>Pods Overview</Typography>
        <Tooltip title="권장사항 기준 보기" arrow>
          <IconButton size="small" onClick={() => setOpenHelp(true)}>
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <TextField
          size="small"
          label="검색 (Namespace, Pod Name, Node)"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          sx={{ width: 300 }}
        />
        <Button variant="outlined" onClick={handleDownloadCSV}>CSV 다운로드</Button>
      </Box>

      <Table size="small" sx={{ minWidth: 1200, backgroundColor: 'background.paper' }}>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.field}>
                <TableSortLabel
                  active={orderBy === col.field}
                  direction={orderBy === col.field ? order : 'asc'}
                  onClick={() => handleSort(col.field)}
                >
                  {col.headerName}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedPods.map((pod) => (
            <TableRow
              key={`${pod.namespace}-${pod.name}`}
              hover
              onClick={() => setSelectedPod(pod)}
              sx={{ cursor: 'pointer' }}
            >
              {columns.map((col) => (
                <TableCell key={col.field}>
                  {col.renderCell ? col.renderCell({ row: pod }) : getValue(pod, col.field)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={openHelp} onClose={() => setOpenHelp(false)}>
        <DialogTitle>권장사항 기준</DialogTitle>
        <DialogContent>
          <List dense>
            {/* Help 리스트 항목 여기에 넣기 */}
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

// 헬퍼 함수
const getValue = (obj: any, field: string) => {
  const fields = field.split('.')
  return fields.reduce((acc, curr) => acc?.[curr], obj)
}

const columns = [
  { field: 'namespace', headerName: 'Namespace' },
  { field: 'name', headerName: 'Pod Name' },
  { field: 'node', headerName: 'Node' },
  {
    field: 'cpu.usage',
    headerName: 'CPU Usage (m)',
    renderCell: (params: any) => formatNumber(params.row.cpu?.usage),
  },
  {
    field: 'cpuPercent',
    headerName: 'CPU % (Node)',
    renderCell: (params: any) => calcPercent(params.row.cpu?.usage, params.row.nodeCpuCapacity),
  },
  {
    field: 'cpu.requests',
    headerName: 'CPU Requests (m)',
    renderCell: (params: any) => formatNumber(params.row.cpu?.requests),
  },
  {
    field: 'cpu.limits',
    headerName: 'CPU Limits (m)',
    renderCell: (params: any) => formatNumber(params.row.cpu?.limits),
  },
  {
    field: 'memory.usage',
    headerName: 'Memory Usage (MiB)',
    renderCell: (params: any) => formatNumber(params.row.memory?.usage),
  },
  {
    field: 'memoryPercent',
    headerName: 'Memory % (Node)',
    renderCell: (params: any) => calcPercent(params.row.memory?.usage, params.row.nodeMemoryCapacity),
  },
  {
    field: 'memory.requests',
    headerName: 'Memory Requests (MiB)',
    renderCell: (params: any) => formatNumber(params.row.memory?.requests),
  },
  {
    field: 'memory.limits',
    headerName: 'Memory Limits (MiB)',
    renderCell: (params: any) => formatNumber(params.row.memory?.limits),
  },
]

function calcPercent(usage: number, capacity: number) {
  if (!capacity) return '-'
  const percent = (usage / capacity) * 100
  return percent.toFixed(1) + '%'
}

function formatNumber(value: number) {
  return value?.toLocaleString()
}
