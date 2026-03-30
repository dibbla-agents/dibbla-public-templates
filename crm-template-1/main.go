package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"

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
	log.Fatal(listenWithRetry(app, port))
}

// listenWithRetry binds the preferred port; if it is busy, it tries the next
// ports in sequence (like Vite does). The listener is kept open to avoid
// TOCTOU races.
func listenWithRetry(app *fiber.App, preferredPort string) error {
	p, _ := strconv.Atoi(preferredPort)
	if p == 0 {
		p = 80
	}
	for attempt := 0; attempt < 100; attempt++ {
		port := p + attempt
		if port > 65535 {
			break
		}
		ln, err := net.Listen("tcp4", ":"+strconv.Itoa(port))
		if err != nil {
			if attempt == 0 {
				log.Printf("Port %d is in use, trying another one...", port)
			}
			continue
		}
		if attempt > 0 {
			log.Printf("Using port %d instead", port)
		}
		return app.Listener(ln)
	}
	return fmt.Errorf("no free port found in range %d–%d", p, p+99)
}
