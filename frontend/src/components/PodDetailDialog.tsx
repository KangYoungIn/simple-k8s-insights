import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  Box,
} from '@mui/material'

export function PodDetailDialog({ pod, onClose }: { pod: any; onClose: () => void }) {
  const recommendations = generateRecommendationList(pod)

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Pod 상세 정보</DialogTitle>
      <DialogContent dividers>
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

function getColorBySeverity(severity: 'critical' | 'warning' | 'info') {
  switch (severity) {
    case 'critical': return '#f44336'
    case 'warning': return '#ff9800'
    default: return '#2196f3'
  }
}

function generateRecommendationList(row: any) {
  const recs: { message: string; severity: 'critical' | 'warning' | 'info' }[] = []

  const cpu = row.cpu
  const cpuCap = row.nodeCpuCapacity

  if (!cpu?.requests || cpu.requests === 0)
    recs.push({ message: 'CPU Request를 설정하세요.', severity: 'critical' })

  if (!cpu?.limits || cpu.limits === 0)
    recs.push({ message: 'CPU Limit를 설정하세요.', severity: 'critical' })

  if (cpu?.usage && cpu.requests) {
    if (cpu.usage > cpu.requests * 1.1) {
      const newRequest = Math.ceil(cpu.usage * 1.2)
      const newLimit = Math.max(cpu.limits ?? 0, Math.ceil(newRequest * 1.2))
      recs.push({
        message: `CPU Request를 ${newRequest} m으로 상향하세요.`,
        severity: 'critical',
      })
      if (!cpu.limits || cpu.limits < newRequest) {
        recs.push({
          message: `Request 상향 시 Limit도 ${newLimit} m 이상으로 설정 필요.`,
          severity: 'warning',
        })
      }
    }

    if (cpu.requests > cpu.usage * 2) {
      const newRequest = Math.ceil(cpu.usage * 1.5)
      const newLimit = Math.max(cpu.limits ?? 0, Math.ceil(newRequest * 1.2))
      recs.push({
        message: `CPU Request가 과도합니다. ${newRequest} m 이하로 하향 권장.`,
        severity: 'warning',
      })
      if (cpu.limits && newRequest > cpu.limits) {
        recs.push({
          message: `Request가 Limit보다 큽니다. Limit를 ${newLimit} m 이상으로 조정하세요.`,
          severity: 'warning',
        })
      }
    }
  }

  if (cpuCap && cpu.limits > cpuCap * 2) {
    recs.push({
      message: `CPU Limit가 노드 용량의 2배 초과입니다. ${Math.ceil(cpuCap)} m 이하로 줄이세요.`,
      severity: 'warning',
    })
  }

  if (cpu.requests && cpu.limits && cpu.requests > cpu.limits) {
    recs.push({
      message: `CPU Request가 Limit보다 높습니다. Request를 ${cpu.limits} m 이하로 낮추세요.`,
      severity: 'critical',
    })
  }

  // -------- Memory ----------
  const mem = row.memory
  const memCap = row.nodeMemoryCapacity

  if (!mem?.requests || mem.requests === 0)
    recs.push({ message: 'Memory Request를 설정하세요.', severity: 'critical' })

  if (!mem?.limits || mem.limits === 0)
    recs.push({ message: 'Memory Limit를 설정하세요.', severity: 'critical' })

  if (mem?.usage && mem.requests) {
    if (mem.usage > mem.requests * 1.1) {
      const newRequest = Math.ceil(mem.usage * 1.2)
      const newLimit = Math.max(mem.limits ?? 0, Math.ceil(newRequest * 1.2))
      recs.push({
        message: `Memory Request를 ${newRequest} MiB로 상향하세요.`,
        severity: 'critical',
      })
      if (!mem.limits || mem.limits < newRequest) {
        recs.push({
          message: `Request 상향 시 Limit도 ${newLimit} MiB 이상으로 설정 필요.`,
          severity: 'warning',
        })
      }
    }

    if (mem.requests > mem.usage * 2) {
      const newRequest = Math.ceil(mem.usage * 1.5)
      const newLimit = Math.max(mem.limits ?? 0, Math.ceil(newRequest * 1.2))
      recs.push({
        message: `Memory Request가 과도합니다. ${newRequest} MiB 이하로 하향 권장.`,
        severity: 'warning',
      })
      if (mem.limits && newRequest > mem.limits) {
        recs.push({
          message: `Request가 Limit보다 큽니다. Limit를 ${newLimit} MiB 이상으로 조정하세요.`,
          severity: 'warning',
        })
      }
    }
  }

  if (memCap && mem.limits > memCap * 2) {
    recs.push({
      message: `Memory Limit가 노드 용량의 2배 초과입니다. ${Math.ceil(memCap)} MiB 이하로 조정하세요.`,
      severity: 'warning',
    })
  }

  if (mem.requests && mem.limits && mem.requests > mem.limits) {
    recs.push({
      message: `Memory Request가 Limit보다 높습니다. Request를 ${mem.limits} MiB 이하로 낮추세요.`,
      severity: 'critical',
    })
  }

  return recs
}
