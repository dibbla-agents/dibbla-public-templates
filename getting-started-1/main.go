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
	// Load .env file if present (ignore error — in production env vars are set directly)
	_ = godotenv.Load()

	app := fiber.New(fiber.Config{
		DisableStartupMessage: false,
	})

	// Middleware
	app.Use(logger.New())

	// API routes
	app.Get("/api/hello", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "Hello World Dibbla"})
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
	const maxAttempts = 20
	for attempt := 0; attempt < maxAttempts; attempt++ {
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
	return fmt.Errorf("no free port found in range %d–%d", p, p+maxAttempts-1)
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

// writeDevPortFiles publishes the actual bound port + pid so the Vite dev
// proxy and the dev-task pre-flight can find us even if we fell back to a
// non-preferred port. Best-effort: a read-only filesystem (e.g. prod) just
// logs a warning and continues — the backend still runs normally.
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
