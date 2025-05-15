package server

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/KangYoungIn/simple-k8s-insights/internal/api"
	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
)

func NewRouter() *gin.Engine {
	router := gin.New()

	router.Use(CustomLogger())
	router.Use(CustomRecovery())

	router.Use(GzipExceptStream())

	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "Authorization"},
	}))

	apiGroup := router.Group("/api")
	{
		apiGroup.GET("/hello", api.HelloHandler)
		apiGroup.GET("/cluster", api.ClusterOverviewHandler)
		apiGroup.GET("/nodes", api.NodeOverviewHandler)
		apiGroup.GET("/pods", api.PodOverviewHandler)
		apiGroup.GET("/overview/stream", api.OverviewStreamHandler)
	}

	router.StaticFS("/assets", http.Dir("./frontend/dist/assets"))
	router.StaticFile("/favicon.svg", "./frontend/dist/favicon.svg")

	router.NoRoute(func(c *gin.Context) {
		c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		c.File("./frontend/dist/index.html")
	})

	return router
}

func CustomLogger() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("[%s] %s %s %d %s\n",
			param.TimeStamp.Format(time.RFC3339),
			param.Method,
			param.Path,
			param.StatusCode,
			param.Latency,
		)
	})
}

func CustomRecovery() gin.HandlerFunc {
	return gin.RecoveryWithWriter(gin.DefaultErrorWriter)
}

func GzipExceptStream() gin.HandlerFunc {
	gzipMiddleware := gzip.Gzip(gzip.DefaultCompression)

	return func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/overview/stream") {
			c.Next()
			return
		}
		gzipMiddleware(c)
	}
}
