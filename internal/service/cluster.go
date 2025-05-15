package service

import (
	"context"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	metricsclient "k8s.io/metrics/pkg/client/clientset/versioned"
)

type ClusterResourceOverview struct {
	CPU struct {
		Usage       int64 `json:"usage"`
		Requests    int64 `json:"requests"`
		Limits      int64 `json:"limits"`
		Allocatable int64 `json:"allocatable"`
		Capacity    int64 `json:"capacity"`
	} `json:"cpu"`
	Memory struct {
		Usage       int64 `json:"usage"`
		Requests    int64 `json:"requests"`
		Limits      int64 `json:"limits"`
		Allocatable int64 `json:"allocatable"`
		Capacity    int64 `json:"capacity"`
	} `json:"memory"`

	// 추가된 클러스터 개요 정보
	NodeCount         int    `json:"nodeCount"`
	ReadyNodeCount    int    `json:"readyNodeCount"`
	NotReadyNodeCount int    `json:"notReadyNodeCount"`
	PodCount          int    `json:"podCount"`
	NamespaceCount    int    `json:"namespaceCount"`
	KubernetesVersion string `json:"kubernetesVersion"`
}

func GetClusterResourceOverview(ctx context.Context, clientset *kubernetes.Clientset, metricsClient *metricsclient.Clientset) (*ClusterResourceOverview, error) {
	overview := &ClusterResourceOverview{}

	// Node 정보 가져오기
	nodes, err := clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	overview.NodeCount = len(nodes.Items)

	// Ready/NotReady 카운트
	for _, node := range nodes.Items {
		for _, condition := range node.Status.Conditions {
			if condition.Type == "Ready" {
				if condition.Status == "True" {
					overview.ReadyNodeCount++
				} else {
					overview.NotReadyNodeCount++
				}
			}
		}
	}

	// Pod 정보 가져오기
	pods, err := clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	overview.PodCount = len(pods.Items)

	// Namespace 정보 가져오기
	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	overview.NamespaceCount = len(namespaces.Items)

	// Metrics 정보 가져오기
	nodeMetrics, err := metricsClient.MetricsV1beta1().NodeMetricses().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	// 노드 리소스 합산
	for _, node := range nodes.Items {
		overview.CPU.Allocatable += node.Status.Allocatable.Cpu().MilliValue()
		overview.CPU.Capacity += node.Status.Capacity.Cpu().MilliValue()
		overview.Memory.Allocatable += node.Status.Allocatable.Memory().Value() / (1024 * 1024) // MiB
		overview.Memory.Capacity += node.Status.Capacity.Memory().Value() / (1024 * 1024)       // MiB
	}

	// 노드 사용량 합산
	for _, metric := range nodeMetrics.Items {
		overview.CPU.Usage += metric.Usage.Cpu().MilliValue()
		overview.Memory.Usage += metric.Usage.Memory().Value() / (1024 * 1024) // MiB
	}

	// 파드 요청/리밋 합산
	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			overview.CPU.Requests += container.Resources.Requests.Cpu().MilliValue()
			overview.CPU.Limits += container.Resources.Limits.Cpu().MilliValue()
			overview.Memory.Requests += container.Resources.Requests.Memory().Value() / (1024 * 1024) // MiB
			overview.Memory.Limits += container.Resources.Limits.Memory().Value() / (1024 * 1024)     // MiB
		}
	}

	// Kubernetes 서버 버전 가져오기
	versionInfo, err := clientset.Discovery().ServerVersion()
	if err == nil && versionInfo != nil {
		overview.KubernetesVersion = versionInfo.GitVersion
	}

	return overview, nil
}
