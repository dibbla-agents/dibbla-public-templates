package main

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// registerRoutes wires every /api endpoint. All handlers tolerate db == nil
// (no database bound) by returning empty, absent-flavoured responses rather
// than erroring — that is what keeps the first-run experience friendly.
func registerRoutes(app *fiber.App) {
	api := app.Group("/api")

	api.Get("/health", handleHealth)
	api.Get("/services", handleListServices)
	api.Get("/incidents", handleListIncidents)
	api.Get("/incidents/:id", handleGetIncident)
	api.Post("/incidents", handleCreateIncident)
	api.Patch("/incidents/:id", handleUpdateIncident)
	api.Post("/incidents/:id/summarise", handleSummarise)
	api.Post("/incidents/:id/triage", handleTriage)
	api.Get("/rollups", handleListRollups)
}

func handleHealth(c *fiber.Ctx) error {
	dbState := "absent"
	if db != nil {
		if err := db.Ping(); err == nil {
			dbState = "connected"
		}
	}
	return c.JSON(fiber.Map{
		"status":   "ok",
		"database": dbState,
		"app":      appTitle,
	})
}

func handleListServices(c *fiber.Ctx) error {
	if db == nil {
		return c.JSON([]Service{})
	}
	services, err := listServices(db)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(services)
}

func handleListIncidents(c *fiber.Ctx) error {
	limit := clampInt(c.QueryInt("limit", 50), 1, 200)
	offset := maxInt(c.QueryInt("offset", 0), 0)

	if db == nil {
		return c.JSON(fiber.Map{"items": []Incident{}, "total": 0, "limit": limit, "offset": offset})
	}

	// `resolved` is optional: "true" → resolved only, "false" → open only,
	// absent → all. ("open"/"resolved" are accepted as friendly aliases.)
	var resolved *bool
	switch strings.ToLower(c.Query("resolved")) {
	case "true", "resolved":
		t := true
		resolved = &t
	case "false", "open":
		f := false
		resolved = &f
	}

	items, total, err := listIncidents(db, incidentFilter{
		Region:   c.Query("region"),
		Severity: c.Query("severity"),
		Resolved: resolved,
		Limit:    limit,
		Offset:   offset,
	})
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(fiber.Map{"items": items, "total": total, "limit": limit, "offset": offset})
}

func handleGetIncident(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid incident id")
	}
	if db == nil {
		return fiber.NewError(fiber.StatusNotFound, "no database bound")
	}
	inc, err := getIncident(db, id)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	if inc == nil {
		return fiber.NewError(fiber.StatusNotFound, "incident not found")
	}
	return c.JSON(inc)
}

func handleCreateIncident(c *fiber.Ctx) error {
	if db == nil {
		return fiber.NewError(fiber.StatusServiceUnavailable, "no database bound — attach a database to create incidents")
	}
	var in incidentInput
	if err := c.BodyParser(&in); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if in.Title == "" || in.ServiceID == 0 || in.Region == "" {
		return fiber.NewError(fiber.StatusBadRequest, "title, service_id and region are required")
	}
	if in.Severity == "" {
		in.Severity = "medium"
	}
	inc, err := createIncident(db, in)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(inc)
}

func handleUpdateIncident(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid incident id")
	}
	if db == nil {
		return fiber.NewError(fiber.StatusServiceUnavailable, "no database bound")
	}
	var p incidentPatch
	if err := c.BodyParser(&p); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	inc, err := updateIncident(db, id, p)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	if inc == nil {
		return fiber.NewError(fiber.StatusNotFound, "incident not found")
	}
	return c.JSON(inc)
}

// handleSummarise is deliberately unfinished: stage 3 of the "Build it"
// tutorial wires the AI-gateway call in. See the TODO in ai.go (summariseBody).
func handleSummarise(c *fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error":   "not_enabled",
		"message": "not enabled yet — stage 3 of the tutorial adds this",
		"hint":    "wire the AI-gateway call in ai.go (summariseBody) and call it from here",
	})
}

// handleTriage is deliberately unfinished: stage 4 of the tutorial classifies
// the incident (severity + suggested owner) through the AI gateway.
func handleTriage(c *fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error":   "not_enabled",
		"message": "not enabled yet — stage 4 of the tutorial adds this",
		"hint":    "reuse the AI-gateway client in ai.go to classify the incident body",
	})
}

func handleListRollups(c *fiber.Ctx) error {
	if db == nil {
		return c.JSON([]Rollup{})
	}
	rollups, err := listRollups(db)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(rollups)
}

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
