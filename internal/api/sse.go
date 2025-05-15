package api

import (
	"context"
	"log"
	"time"

	"github.com/KangYoungIn/simple-k8s-insights/internal/service"
	"github.com/gin-gonic/gin"
	"k8s.io/client-go/kubernetes"
	metricsclient "k8s.io/metrics/pkg/client/clientset/versioned"
)

var (
	KubeClient    *kubernetes.Clientset
	MetricsClient *metricsclient.Clientset
)

func InitClients() {
	config, err := LoadKubeConfig()
	if err != nil {
		log.Fatalf("Failed to load kube config: %v", err)
	}

	KubeClient, err = kubernetes.NewForConfig(config)
	if err != nil {
		log.Fatalf("Failed to create kube client: %v", err)
	}

	MetricsClient, err = metricsclient.NewForConfig(config)
	if err != nil {
		log.Fatalf("Failed to create metrics client: %v", err)
	}
}

func OverviewStreamHandler(c *gin.Context) {
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-c.Writer.CloseNotify():
			return
		case <-ticker.C:
			clusterOverview, err := service.GetClusterResourceOverview(context.Background(), KubeClient, MetricsClient)
			if err != nil {
				c.SSEvent("error", gin.H{"error": err.Error()})
				return
			}

			nodeOverview, err := service.GetNodeResourceOverview(context.Background(), KubeClient, MetricsClient)
			if err != nil {
				c.SSEvent("error", gin.H{"error": err.Error()})
				return
			}

			podOverview, err := service.GetPodResourceOverview(context.Background(), KubeClient, MetricsClient)
			if err != nil {
				c.SSEvent("error", gin.H{"error": err.Error()})
				return
			}

			c.SSEvent("message", gin.H{
				"cluster": clusterOverview,
				"nodes":   nodeOverview,
				"pods":    podOverview,
			})
		}
	}
}
