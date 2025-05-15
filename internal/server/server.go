package server

import (
	"github.com/KangYoungIn/simple-k8s-insights/internal/api"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func NewRouter() *gin.Engine {
	router := gin.Default()

	// CORS 미들웨어
	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "Authorization"},
	}))

	// API
	apiGroup := router.Group("/api")
	{
		apiGroup.GET("/hello", api.HelloHandler)
		apiGroup.GET("/cluster", api.ClusterOverviewHandler)
		apiGroup.GET("/nodes", api.NodeOverviewHandler)
		apiGroup.GET("/pods", api.PodOverviewHandler)
		apiGroup.GET("/overview/stream", api.OverviewStreamHandler)
	}

	// Vite 빌드 결과물 정적 파일 서빙
	router.Static("/assets", "./frontend/dist/assets")
	router.StaticFile("/favicon.svg", "./frontend/dist/favicon.svg")

	// 모든 나머지 요청은 index.html 반환
	router.NoRoute(func(c *gin.Context) {
		c.File("./frontend/dist/index.html")
	})

	return router
}
