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
	_ = godotenv.Load()

	helloName := os.Getenv("ENV_HELLO_NAME")
	if helloName == "" {
		log.Fatal("ENV_HELLO_NAME is required but not set. Please set it in .env or as an environment variable.")
	}

	app := fiber.New(fiber.Config{
		DisableStartupMessage: false,
	})

	app.Use(logger.New())

	app.Get("/api/hello", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": fmt.Sprintf("Hello World %s", helloName)})
	})

	app.Get("/api/metrics", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"total_contacts":        0,
			"active_leads":          0,
			"customers":             0,
			"avg_score":             0,
			"pipeline_value":        0,
			"total_leads_generated": 0,
			"avg_conversion":        0,
			"pending_tasks":         0,
		})
	})

	app.Get("/api/contacts", func(c *fiber.Ctx) error {
		return c.JSON([]any{})
	})

	app.Get("/api/tasks", func(c *fiber.Ctx) error {
		return c.JSON([]any{})
	})

	app.Get("/api/campaigns", func(c *fiber.Ctx) error {
		return c.JSON([]any{})
	})

	distFS, err := fs.Sub(embedDist, "dist")
	if err != nil {
		log.Fatal(err)
	}

	app.Use("/", filesystem.New(filesystem.Config{
		Root:   http.FS(distFS),
		Index:  "index.html",
		Browse: false,
		MaxAge: 3600,
	}))

	app.Use("*", func(c *fiber.Ctx) error {
		return filesystem.SendFile(c, http.FS(distFS), "index.html")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "80"
	}
	log.Fatal(app.Listen(":" + port))
}
