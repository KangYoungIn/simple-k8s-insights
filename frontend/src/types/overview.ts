export interface ResourceData {
  usage: number
  requests: number
  limits: number
  allocatable: number
  capacity: number
}

export interface ClusterData {
  cpu: ResourceData
  memory: ResourceData
  nodeCount: number
  readyNodeCount: number
  notReadyNodeCount: number
  podCount: number
  namespaceCount: number
  kubernetesVersion: string
}

export interface NodeData {
  name: string
  cpu: ResourceData
  memory: ResourceData
  status: 'Ready' | 'NotReady'
  podCount: number
  role: string
  creationTimestamp: string
}

export interface PodData {
  id: string
  namespace: string
  name: string
  node: string
  cpu: { usage: number; requests: number; limits: number }
  memory: { usage: number; requests: number; limits: number }
  nodeCpuCapacity: number
  nodeMemoryCapacity: number
}