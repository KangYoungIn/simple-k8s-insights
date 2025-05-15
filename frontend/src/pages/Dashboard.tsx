import Layout from '../components/Layout'
import ClusterSummary from '../components/ClusterSummary'
import NodeCards from '../components/NodeCards'
import PodsTable from '../components/PodsTable'

export default function Dashboard() {
  return (
    <Layout>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        Simple K8s Insights
      </h1>
      <ClusterSummary />
      <NodeCards />
      <PodsTable />
    </Layout>
  )
}
