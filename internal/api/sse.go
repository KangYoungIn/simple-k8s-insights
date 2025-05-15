package api

import (
	"context"
	"net/http"
	"time"

	"github.com/KangYoungIn/simple-k8s-insights/internal/service"

	"github.com/gin-gonic/gin"
	"k8s.io/client-go/kubernetes"
	metricsclient "k8s.io/metrics/pkg/client/clientset/versioned"
)

func OverviewStreamHandler(c *gin.Context) {
	config, err := LoadKubeConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load kube config"})
		return
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	metricsClient, err := metricsclient.NewForConfig(config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create metrics client"})
		return
	}

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
			clusterOverview, err := service.GetClusterResourceOverview(context.Background(), clientset, metricsClient)
			if err != nil {
				c.SSEvent("error", gin.H{"error": err.Error()})
				return
			}

			nodeOverview, err := service.GetNodeResourceOverview(context.Background(), clientset, metricsClient)
			if err != nil {
				c.SSEvent("error", gin.H{"error": err.Error()})
				return
			}

			podOverview, err := service.GetPodResourceOverview(context.Background(), clientset, metricsClient)
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
