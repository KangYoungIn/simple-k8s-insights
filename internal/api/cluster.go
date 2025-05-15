package api

import (
	"context"
	"net/http"
	"os"
	"path/filepath"

	"github.com/KangYoungIn/simple-k8s-insights/internal/service"

	"github.com/gin-gonic/gin"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	metricsclient "k8s.io/metrics/pkg/client/clientset/versioned"
)

// LoadKubeConfig: 로컬 개발용 kubeconfig or 클러스터 내부용 자동 선택
func LoadKubeConfig() (*rest.Config, error) {
	if os.Getenv("K8S_MODE") == "dev" {
		kubeconfigPath := filepath.Join(os.Getenv("HOME"), ".kube", "config")
		if _, err := os.Stat(kubeconfigPath); os.IsNotExist(err) {
			kubeconfigPath = filepath.Join(os.Getenv("USERPROFILE"), ".kube", "config")
		}
		config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
		if err != nil {
			return nil, err
		}

		config.Insecure = true
		config.TLSClientConfig.CAFile = ""
		config.TLSClientConfig.CAData = nil
		return config, nil
	}

	// 클러스터 내부
	return rest.InClusterConfig()
}
func ClusterOverviewHandler(c *gin.Context) {
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

	data, err := service.GetClusterResourceOverview(context.Background(), clientset, metricsClient)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, data)
}
