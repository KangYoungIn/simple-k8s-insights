package main

import (
	"log"

	"github.com/KangYoungIn/simple-k8s-insights/internal/server"
)

func main() {
	r := server.NewRouter()

	log.Println("Starting cq-k8s-overview server on :3000")
	if err := r.Run(":3000"); err != nil {
		log.Fatal(err)
	}
}
