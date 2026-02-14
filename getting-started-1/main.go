package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

//go:embed dist/*
var embedDist embed.FS

func main() {
	// Load .env file if present (ignore error — in production env vars are set directly)
	_ = godotenv.Load()

	// Require ENV_HELLO_NAME — fail fast if not set
	helloName := os.Getenv("ENV_HELLO_NAME")
	if helloName == "" {
		log.Fatal("ENV_HELLO_NAME is required but not set. Please set it in .env or as an environment variable.")
	}

	app := fiber.New(fiber.Config{
		DisableStartupMessage: false,
	})

	// Middleware
	app.Use(logger.New())

	// API routes
	app.Get("/api/hello", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": fmt.Sprintf("Hello World %s", helloName)})
	})

	// Strip the "dist" prefix so files are served from root
	distFS, err := fs.Sub(embedDist, "dist")
	if err != nil {
		log.Fatal(err)
	}

	// Serve static frontend files
	app.Use("/", filesystem.New(filesystem.Config{
		Root:   http.FS(distFS),
		Index:  "index.html",
		Browse: false,
		MaxAge: 3600,
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
