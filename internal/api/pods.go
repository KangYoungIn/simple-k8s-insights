package api

import (
	"context"
	"net/http"

	"github.com/KangYoungIn/simple-k8s-insights/internal/service"

	"github.com/gin-gonic/gin"
	"k8s.io/client-go/kubernetes"
	metricsclient "k8s.io/metrics/pkg/client/clientset/versioned"
)

func PodOverviewHandler(c *gin.Context) {
	config, err := LoadKubeConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load in-cluster config"})
		return
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create kubernetes client"})
		return
	}

	metricsClient, err := metricsclient.NewForConfig(config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create metrics client"})
		return
	}

	data, err := service.GetPodResourceOverview(context.Background(), clientset, metricsClient)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, data)
}
