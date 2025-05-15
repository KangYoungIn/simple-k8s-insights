package service

import (
	"context"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	metricsclient "k8s.io/metrics/pkg/client/clientset/versioned"
)

type NodeResourceOverview struct {
	Name              string         `json:"name"`
	CPU               ResourceDetail `json:"cpu"`
	Memory            ResourceDetail `json:"memory"`
	Status            string         `json:"status"`
	PodCount          int            `json:"podCount"`
	Role              string         `json:"role"`
	CreationTimestamp string         `json:"creationTimestamp"`
}

type ResourceDetail struct {
	Usage       int64 `json:"usage"`
	Requests    int64 `json:"requests"`
	Limits      int64 `json:"limits"`
	Allocatable int64 `json:"allocatable"`
	Capacity    int64 `json:"capacity"`
}

func GetNodeResourceOverview(ctx context.Context, clientset *kubernetes.Clientset, metricsClient *metricsclient.Clientset) ([]NodeResourceOverview, error) {
	nodes, err := clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	pods, err := clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	nodeMetrics, err := metricsClient.MetricsV1beta1().NodeMetricses().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	cpuUsageMap := map[string]int64{}
	memUsageMap := map[string]int64{}

	for _, metric := range nodeMetrics.Items {
		cpuUsageMap[metric.Name] = metric.Usage.Cpu().MilliValue()
		memUsageMap[metric.Name] = metric.Usage.Memory().Value() / (1024 * 1024) // MiB
	}

	var overview []NodeResourceOverview

	for _, node := range nodes.Items {
		cpuRequests := int64(0)
		cpuLimits := int64(0)
		memRequests := int64(0)
		memLimits := int64(0)
		podCount := 0

		for _, pod := range pods.Items {
			if pod.Spec.NodeName == node.Name {
				podCount++
				for _, container := range pod.Spec.Containers {
					cpuRequests += container.Resources.Requests.Cpu().MilliValue()
					cpuLimits += container.Resources.Limits.Cpu().MilliValue()
					memRequests += container.Resources.Requests.Memory().Value() / (1024 * 1024)
					memLimits += container.Resources.Limits.Memory().Value() / (1024 * 1024)
				}
			}
		}

		// Ready 상태 판단
		nodeStatus := "Unknown"
		for _, condition := range node.Status.Conditions {
			if condition.Type == "Ready" {
				if condition.Status == "True" {
					nodeStatus = "Ready"
				} else {
					nodeStatus = "NotReady"
				}
				break
			}
		}

		// 노드 역할 추출
		role := getNodeRole(node.Labels)

		overview = append(overview, NodeResourceOverview{
			Name:              node.Name,
			Status:            nodeStatus,
			PodCount:          podCount,
			Role:              role,
			CreationTimestamp: node.CreationTimestamp.String(),
			CPU: ResourceDetail{
				Usage:       cpuUsageMap[node.Name],
				Requests:    cpuRequests,
				Limits:      cpuLimits,
				Allocatable: node.Status.Allocatable.Cpu().MilliValue(),
				Capacity:    node.Status.Capacity.Cpu().MilliValue(),
			},
			Memory: ResourceDetail{
				Usage:       memUsageMap[node.Name],
				Requests:    memRequests,
				Limits:      memLimits,
				Allocatable: node.Status.Allocatable.Memory().Value() / (1024 * 1024),
				Capacity:    node.Status.Capacity.Memory().Value() / (1024 * 1024),
			},
		})
	}

	return overview, nil
}

// 노드 역할 추출
func getNodeRole(labels map[string]string) string {
	for key := range labels {
		if key == "node-role.kubernetes.io/master" {
			return "master"
		}
		if key == "node-role.kubernetes.io/control-plane" {
			return "control-plane"
		}
		if key == "node-role.kubernetes.io/worker" {
			return "worker"
		}
	}
	return "worker" // 기본은 worker 취급
}
