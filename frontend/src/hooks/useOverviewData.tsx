import { useEffect, useState } from 'react'
import type { ClusterData, NodeData, PodData } from '../types/overview'

interface OverviewData {
  cluster: ClusterData | null
  nodes: NodeData[]
  pods: PodData[]
}

export function useOverviewData() {
  const [data, setData] = useState<OverviewData>({
    cluster: null,
    nodes: [],
    pods: []
  })

  useEffect(() => {
    const eventSource = new EventSource('/api/overview/stream')

    eventSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data)
      setData({
        cluster: parsed.cluster,
        nodes: parsed.nodes,
        pods: parsed.pods
      })
    }

    eventSource.onerror = (err) => {
      console.error('SSE error:', err)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [])

  return data
}
