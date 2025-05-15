import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  Box
} from '@mui/material'

export function PodDetailDialog({ pod, onClose }: { pod: any; onClose: () => void }) {
  const recommendations = generateRecommendationList(pod)

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Pod 상세 정보</DialogTitle>
      <DialogContent dividers>
        {/* 기본 정보 */}
        <Section title="기본 정보">
          <InfoList
            items={[
              { label: 'Namespace', value: pod.namespace },
              { label: 'Pod Name', value: pod.name },
              { label: 'Node', value: pod.node },
            ]}
          />
        </Section>

        <Divider sx={{ my: 2 }} />

        {/* 리소스 사용량 */}
        <Section title="리소스 사용량">
          <InfoList
            items={[
              { label: 'CPU Usage', value: `${pod.cpu?.usage ?? '-'} m` },
              { label: 'CPU Requests', value: `${pod.cpu?.requests ?? '-'} m` },
              { label: 'CPU Limits', value: `${pod.cpu?.limits ?? '-'} m` },
              { label: 'Memory Usage', value: `${pod.memory?.usage ?? '-'} MiB` },
              { label: 'Memory Requests', value: `${pod.memory?.requests ?? '-'} MiB` },
              { label: 'Memory Limits', value: `${pod.memory?.limits ?? '-'} MiB` },
            ]}
          />
        </Section>

        <Divider sx={{ my: 2 }} />

        {/* 권장사항 */}
        <Section title="권장사항">
          <List dense>
            {recommendations.length > 0 ? (
              recommendations.map((rec, idx) => (
                <ListItem key={idx} sx={{ pl: 0 }}>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ color: getColorBySeverity(rec.severity) }}>
                        {rec.message}
                      </Typography>
                    }
                  />
                </ListItem>
              ))
            ) : (
              <ListItem sx={{ pl: 0 }}>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ color: '#4caf50' }}>
                      조정 필요 없음
                    </Typography>
                  }
                />
              </ListItem>
            )}
          </List>
        </Section>
      </DialogContent>
    </Dialog>
  )
}

// Section Wrapper
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

// Key-Value 리스트
function InfoList({ items }: { items: { label: string; value: any }[] }) {
  return (
    <List dense>
      {items.map((item, idx) => (
        <ListItem key={idx} sx={{ pl: 0 }}>
          <ListItemText
            primary={
              <Typography variant="body2">
                <strong>{item.label}:</strong> {item.value}
              </Typography>
            }
          />
        </ListItem>
      ))}
    </List>
  )
}

// 권장사항 색상
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

// 권장사항 리스트 생성
function generateRecommendationList(row: any) {
  const recommendations: { message: string; severity: 'critical' | 'warning' | 'info' }[] = []

  if (row.cpu?.requests == null || row.cpu.requests === 0) {
    recommendations.push({ message: 'CPU Request를 설정하세요.', severity: 'critical' })
  }
  if (row.cpu?.usage && row.cpu.requests) {
    if (row.cpu.usage > row.cpu.requests * 1.1) {
      const suggested = Math.ceil(row.cpu.usage * 1.2)
      recommendations.push({ message: `CPU Request를 ${suggested.toLocaleString()} m으로 상향하세요.`, severity: 'critical' })
    }
    if (row.cpu.requests > row.cpu.usage * 2) {
      const suggested = Math.ceil(row.cpu.usage * 1.5)
      recommendations.push({ message: `CPU Request를 ${suggested.toLocaleString()} m으로 하향하세요.`, severity: 'warning' })
    }
  }
  if (row.cpu?.limits == null || row.cpu.limits === 0) {
    recommendations.push({ message: 'CPU Limit를 설정하세요.', severity: 'critical' })
  }
  if (row.nodeCpuCapacity && row.cpu.limits > row.nodeCpuCapacity * 2) {
    const suggested = Math.ceil(row.nodeCpuCapacity)
    recommendations.push({ message: `CPU Limit를 ${suggested.toLocaleString()} m 이하로 조정하세요.`, severity: 'warning' })
  }
  if (row.memory?.requests == null || row.memory.requests === 0) {
    recommendations.push({ message: 'Memory Request를 설정하세요.', severity: 'critical' })
  }
  if (row.memory?.usage && row.memory.requests) {
    if (row.memory.usage > row.memory.requests * 1.1) {
      const suggested = Math.ceil(row.memory.usage * 1.2)
      recommendations.push({ message: `Memory Request를 ${suggested.toLocaleString()} MiB로 상향하세요.`, severity: 'critical' })
    }
    if (row.memory.requests > row.memory.usage * 2) {
      const suggested = Math.ceil(row.memory.usage * 1.5)
      recommendations.push({ message: `Memory Request를 ${suggested.toLocaleString()} MiB로 하향하세요.`, severity: 'warning' })
    }
  }
  if (row.memory?.limits == null || row.memory.limits === 0) {
    recommendations.push({ message: 'Memory Limit를 설정하세요.', severity: 'critical' })
  }
  if (row.nodeMemoryCapacity && row.memory.limits > row.nodeMemoryCapacity * 2) {
    const suggested = Math.ceil(row.nodeMemoryCapacity)
    recommendations.push({ message: `Memory Limit를 ${suggested.toLocaleString()} MiB 이하로 조정하세요.`, severity: 'warning' })
  }

  return recommendations
}
