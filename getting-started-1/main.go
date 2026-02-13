package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

//go:embed dist/*
var embedDist embed.FS

func main() {
	app := fiber.New(fiber.Config{
		DisableStartupMessage: false,
	})

	// Middleware
	app.Use(logger.New())

	// API routes
	app.Get("/api/hello", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "Hello, World!"})
	})

	// Strip the "dist" prefix so files are served from root
	distFS, err := fs.Sub(embedDist, "dist")
	if err != nil {
		log.Fatal(err)
	}

	// Serve static frontend files
	app.Use("/", filesystem.New(filesystem.Config{
		Root:       http.FS(distFS),
		Index:      "index.html",
		Browse:     false,
		MaxAge:     3600,
	}))

	// SPA fallback: serve index.html for any unmatched routes
	app.Use("*", func(c *fiber.Ctx) error {
		return filesystem.SendFile(c, http.FS(distFS), "index.html")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "80"
	}
	log.Fatal(app.Listen(":" + port))
}
