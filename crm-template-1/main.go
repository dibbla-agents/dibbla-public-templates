package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"

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

	if port := os.Getenv("PORT"); port != "" {
		// PORT is a contract: the Dibbla task points the Vite dev proxy at
		// exactly this port, and in production the platform routes to it.
		// Silently moving to another port breaks both, so fail loudly instead.
		log.Fatal(listenOn(app, port))
	}
	log.Fatal(listenWithRetry(app, "80"))
}

// listenOn binds exactly the requested port and returns a clear error if it is
// taken. The port is published to .dev/backend.port for the dev tooling.
func listenOn(app *fiber.App, wanted string) error {
	p, err := strconv.Atoi(wanted)
	if err != nil || p <= 0 || p > 65535 {
		return fmt.Errorf("PORT=%q is not a valid port number", wanted)
	}
	ln, err := net.Listen("tcp4", ":"+strconv.Itoa(p))
	if err != nil {
		return fmt.Errorf("port %d (PORT=%s) is already in use — stop whatever is "+
			"listening there and start again: %w", p, wanted, err)
	}
	return serve(app, ln, p)
}

// listenWithRetry binds the preferred port; if it is busy, it tries the next
// ports in sequence (like Vite does). Only used when PORT is unset, where no
// caller depends on a specific port. The listener is kept open to avoid TOCTOU
// races.
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
		return serve(app, ln, port)
	}
	return fmt.Errorf("no free port found in range %d–%d", p, p+99)
}

// serve publishes the bound port for the dev tooling and runs the app.
func serve(app *fiber.App, ln net.Listener, port int) error {
	writeDevPortFiles(port)
	installDevSignalCleanup(app)
	log.Printf("Backend listening on http://127.0.0.1:%d", port)
	err := app.Listener(ln)
	cleanupDevPortFiles()
	return err
}

// writeDevPortFiles publishes the actual bound port + pid so the dev-task
// pre-flight and readiness checks can find us. Best-effort: a read-only
// filesystem (e.g. prod) just logs a warning and continues.
func writeDevPortFiles(port int) {
	if err := os.MkdirAll(".dev", 0o755); err != nil {
		log.Printf("warn: could not create .dev dir: %v", err)
		return
	}
	if err := os.WriteFile(".dev/backend.port", []byte(strconv.Itoa(port)), 0o644); err != nil {
		log.Printf("warn: could not write .dev/backend.port: %v", err)
	}
	if err := os.WriteFile(".dev/backend.pid", []byte(strconv.Itoa(os.Getpid())), 0o644); err != nil {
		log.Printf("warn: could not write .dev/backend.pid: %v", err)
	}
}

func cleanupDevPortFiles() {
	_ = os.Remove(".dev/backend.port")
	_ = os.Remove(".dev/backend.pid")
}

func installDevSignalCleanup(app *fiber.App) {
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigs
		cleanupDevPortFiles()
		_ = app.Shutdown()
	}()
}
