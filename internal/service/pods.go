package service

import (
	"context"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	metricsclient "k8s.io/metrics/pkg/client/clientset/versioned"
)

type PodResourceOverview struct {
	Namespace          string         `json:"namespace"`
	Name               string         `json:"name"`
	Node               string         `json:"node"`
	CPU                ResourceSimple `json:"cpu"`
	Memory             ResourceSimple `json:"memory"`
	NodeCpuCapacity    int64          `json:"nodeCpuCapacity"`
	NodeMemoryCapacity int64          `json:"nodeMemoryCapacity"`
}

type ResourceSimple struct {
	Usage    int64 `json:"usage"`
	Requests int64 `json:"requests"`
	Limits   int64 `json:"limits"`
}

func GetPodResourceOverview(ctx context.Context, clientset *kubernetes.Clientset, metricsClient *metricsclient.Clientset) ([]PodResourceOverview, error) {
	// Nodes 조회
	nodes, err := clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	// (nodeName) -> capacity 매핑
	nodeCapacityMap := make(map[string]struct {
		cpuMilli  int64
		memoryMiB int64
	})
	for _, node := range nodes.Items {
		cpuQty := node.Status.Capacity[v1.ResourceCPU]
		memQty := node.Status.Capacity[v1.ResourceMemory]

		nodeCapacityMap[node.Name] = struct {
			cpuMilli  int64
			memoryMiB int64
		}{
			cpuMilli:  cpuQty.MilliValue(),            // CPU를 mCPU로
			memoryMiB: memQty.Value() / (1024 * 1024), // Memory를 MiB로 변환
		}
	}

	// Pods 조회
	pods, err := clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	// Pod Metrics 조회
	podMetrics, err := metricsClient.MetricsV1beta1().PodMetricses("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	// (namespace/podName) -> usage 매핑
	cpuUsageMap := make(map[string]int64)
	memUsageMap := make(map[string]int64)

	for _, metric := range podMetrics.Items {
		totalCpu := int64(0)
		totalMem := int64(0)
		for _, container := range metric.Containers {
			totalCpu += container.Usage.Cpu().MilliValue()
			totalMem += container.Usage.Memory().Value() / (1024 * 1024) // MiB
		}
		key := metric.Namespace + "/" + metric.Name
		cpuUsageMap[key] = totalCpu
		memUsageMap[key] = totalMem
	}

	var overview []PodResourceOverview

	for _, pod := range pods.Items {
		totalCpuReq := int64(0)
		totalCpuLim := int64(0)
		totalMemReq := int64(0)
		totalMemLim := int64(0)

		for _, container := range pod.Spec.Containers {
			totalCpuReq += container.Resources.Requests.Cpu().MilliValue()
			totalCpuLim += container.Resources.Limits.Cpu().MilliValue()
			totalMemReq += container.Resources.Requests.Memory().Value() / (1024 * 1024)
			totalMemLim += container.Resources.Limits.Memory().Value() / (1024 * 1024)
		}

		key := pod.Namespace + "/" + pod.Name
		cpuUsage := cpuUsageMap[key]
		memUsage := memUsageMap[key]

		nodeCap := nodeCapacityMap[pod.Spec.NodeName]

		overview = append(overview, PodResourceOverview{
			Namespace: pod.Namespace,
			Name:      pod.Name,
			Node:      pod.Spec.NodeName,
			CPU: ResourceSimple{
				Usage:    cpuUsage,
				Requests: totalCpuReq,
				Limits:   totalCpuLim,
			},
			Memory: ResourceSimple{
				Usage:    memUsage,
				Requests: totalMemReq,
				Limits:   totalMemLim,
			},
			NodeCpuCapacity:    nodeCap.cpuMilli,
			NodeMemoryCapacity: nodeCap.memoryMiB,
		})
	}

	return overview, nil
}
