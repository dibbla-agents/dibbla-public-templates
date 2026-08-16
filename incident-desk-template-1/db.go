package main

import (
	"database/sql"
	"fmt"
	"os"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

// ---------------------------------------------------------------------------
// Domain types
//
// Schema follows DEMO-DATA.md (reference/docs-strategy) — the authority the
// tutorial's "Check it" queries are written against:
//   services(id, name, tier)
//   incidents(id, service_id, region, title, body, severity, opened_at, resolved_at)
// `body` and `incident_rollups` are this template's additions. "Unresolved"
// means resolved_at IS NULL.
// ---------------------------------------------------------------------------

type Service struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Tier int    `json:"tier"`
}

type Incident struct {
	ID         int64      `json:"id"`
	ServiceID  int64      `json:"service_id"`
	Region     string     `json:"region"`
	Title      string     `json:"title"`
	Body       string     `json:"body"`
	Severity   string     `json:"severity"`
	OpenedAt   time.Time  `json:"opened_at"`
	ResolvedAt *time.Time `json:"resolved_at"`
}

type Rollup struct {
	ID            int64     `json:"id"`
	CreatedAt     time.Time `json:"created_at"`
	PeriodStart   string    `json:"period_start"`
	PeriodEnd     string    `json:"period_end"`
	Region        string    `json:"region"`
	Total         int       `json:"total"`
	Resolved      int       `json:"resolved"`
	StillOpen     int       `json:"still_open"`
	WorstSeverity *string   `json:"worst_severity"`
}

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

// connectDB resolves the connection string and opens a verified pool. It
// returns an error (and a nil pool) when no database is bound or the bind is
// unreachable, so the caller can fall back to first-run mode.
func connectDB() (*sql.DB, error) {
	dsn := resolveDSN()
	if dsn == "" {
		return nil, fmt.Errorf("no database URL in environment")
	}
	conn, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	conn.SetMaxOpenConns(10)
	conn.SetConnMaxIdleTime(5 * time.Minute)
	if err := conn.Ping(); err != nil {
		_ = conn.Close()
		return nil, err
	}
	return conn, nil
}

// resolveDSN reads the connection string from the environment. The platform
// mints a per-database variable named DATABASE_URL_<UPPER> — for the
// `lumen_incidents` database that is DATABASE_URL_LUMEN_INCIDENTS — so we read
// that specific name first and fall back to generic names for local dev.
func resolveDSN() string {
	for _, key := range []string{
		"DATABASE_URL_LUMEN_INCIDENTS",
		"DATABASE_URL",
		"DB_CONNECTION",
	} {
		if v := strings.TrimSpace(os.Getenv(key)); v != "" {
			return ensureSSL(v)
		}
	}
	return ""
}

// ensureSSL appends sslmode=require when the DSN does not already specify an
// sslmode. Dibbla's managed Postgres requires TLS; local Postgres URLs that
// already carry sslmode=disable are left untouched.
func ensureSSL(dsn string) string {
	if strings.Contains(dsn, "sslmode=") {
		return dsn
	}
	if strings.Contains(dsn, "?") {
		return dsn + "&sslmode=require"
	}
	return dsn + "?sslmode=require"
}

// ---------------------------------------------------------------------------
// Migrations (run on boot) + seed
// ---------------------------------------------------------------------------

const schemaDDL = `
CREATE TABLE IF NOT EXISTS services (
  id   bigserial PRIMARY KEY,
  name text    NOT NULL,
  tier integer NOT NULL
);

CREATE TABLE IF NOT EXISTS incidents (
  id          bigserial   PRIMARY KEY,
  service_id  bigint      NOT NULL REFERENCES services(id),
  region      text        NOT NULL,
  title       text        NOT NULL,
  body        text        NOT NULL,
  severity    text        NOT NULL,
  opened_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS incident_rollups (
  id             bigserial PRIMARY KEY,
  created_at     timestamptz NOT NULL DEFAULT now(),
  period_start   date        NOT NULL,
  period_end     date        NOT NULL,
  region         text        NOT NULL,
  total          integer     NOT NULL,
  resolved       integer     NOT NULL,
  still_open     integer     NOT NULL,
  worst_severity text,
  UNIQUE (period_start, period_end, region)
);
`

// migrateAndSeed runs the idempotent CREATE TABLE IF NOT EXISTS migrations,
// then seeds the demo fleet and incident history only when the tables are
// empty. Re-running against a seeded database is a no-op.
func migrateAndSeed(db *sql.DB) error {
	if _, err := db.Exec(schemaDDL); err != nil {
		return fmt.Errorf("create tables: %w", err)
	}

	var serviceCount int
	if err := db.QueryRow(`SELECT count(*) FROM services`).Scan(&serviceCount); err != nil {
		return fmt.Errorf("count services: %w", err)
	}
	if serviceCount == 0 {
		if err := seedServices(db); err != nil {
			return fmt.Errorf("seed services: %w", err)
		}
	}

	var incidentCount int
	if err := db.QueryRow(`SELECT count(*) FROM incidents`).Scan(&incidentCount); err != nil {
		return fmt.Errorf("count incidents: %w", err)
	}
	if incidentCount == 0 {
		if err := seedIncidents(db); err != nil {
			return fmt.Errorf("seed incidents: %w", err)
		}
	}
	return nil
}

// regions are exactly the four the tutorial's queries expect.
var regions = []string{"eu-north", "eu-central", "us-east", "ap-south"}

// seedServiceRows: the 8-service Lumen fleet with integer tier levels
// (1 = most critical). Region lives on incidents, not services.
var seedServiceRows = []Service{
	{Name: "Gateway", Tier: 1},
	{Name: "Ingest", Tier: 1},
	{Name: "Search", Tier: 2},
	{Name: "Billing", Tier: 2},
	{Name: "Notifications", Tier: 3},
	{Name: "Reports", Tier: 3},
	{Name: "Auth", Tier: 1},
	{Name: "Exports", Tier: 3},
}

func seedServices(db *sql.DB) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	for _, s := range seedServiceRows {
		if _, err := tx.Exec(
			`INSERT INTO services (name, tier) VALUES ($1, $2)`,
			s.Name, s.Tier,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// incidentTitles / incidentBodies supply varied, realistic multi-sentence
// incident text that is worth summarising and triaging (stages 3 and 4 of the
// tutorial act on `body`). Titles and bodies are paired by index.
var incidentTitles = []string{
	"Elevated p95 latency on read path",
	"Health checks flapping intermittently",
	"Queue backlog above threshold",
	"Error rate spike on write endpoints",
	"Certificate renewal failed",
	"Replica lag above budget",
	"Timeouts from upstream provider",
	"Disk usage above 85 percent",
	"Deploy rollback triggered automatically",
	"Rate limit exhausted by batch job",
}

var incidentBodies = []string{
	"p95 latency on the read path climbed from 120ms to 900ms over roughly ten minutes. The slowdown tracks a jump in connection pool wait time, suggesting the pool is undersized for the current request mix. No errors were returned to clients, but several downstream callers began retrying, which amplified load. Mitigation was to raise the pool ceiling and shed non-critical background reads.",
	"Load-balancer health checks began flapping between healthy and unhealthy every few seconds, briefly removing instances from rotation. CPU and memory looked normal, so the checks were likely timing out under a short GC pause. Traffic was unaffected for end users because at least one replica stayed in rotation throughout. The health-check timeout was widened and a longer interval applied.",
	"The processing queue grew past its warning threshold and kept climbing, indicating consumers could not keep up with producers. The backlog correlated with a slow database query that held a lock longer than usual. Messages were not lost, but end-to-end delivery time increased noticeably. Adding two consumer workers drained the backlog within twenty minutes.",
	"Write endpoints returned a burst of 5xx responses concentrated on a single shard. The shard's primary had just failed over, and in-flight transactions were rejected during the promotion window. Clients that retried succeeded on the second attempt. The incident closed once the new primary stabilised and replication caught up.",
	"The automated TLS certificate renewal job failed because the ACME challenge could not be served from the expected path. The existing certificate had eleven days of validity left, so there was no user-facing impact yet. Root cause was a stale rewrite rule that intercepted the challenge route. The rule was removed and renewal completed on the next run.",
	"A read replica fell behind its primary by more than the agreed replication-lag budget. Reports and analytics reading from the replica briefly returned slightly stale data. The lag was driven by a large bulk update on the primary that generated a long stream of WAL. Throttling the bulk job restored lag to within budget.",
	"Requests to an upstream third-party provider started timing out, and our calls piled up waiting on the shared HTTP client. A circuit breaker eventually opened and returned cached fallbacks. The provider confirmed a partial outage on their side. Service recovered when their status page went green; we widened our breaker thresholds as follow-up.",
	"Disk utilisation on the primary volume crossed 85 percent and continued rising, driven mostly by verbose debug logging left enabled after a recent deploy. There was no immediate outage, but headroom was shrinking fast. Old log segments were rotated and compressed, and the debug flag was reverted. A log-retention alarm was tightened afterwards.",
	"A canary deploy was rolled back automatically after error rates on the new revision exceeded the guardrail. The failing revision introduced a serialization change that older clients could not parse. No customer traffic reached the bad revision beyond the canary slice. The change was reworked to be backward compatible before re-attempting.",
	"A nightly batch job consumed the entire API rate-limit budget for its service account, causing interactive requests sharing that account to be throttled. Users saw intermittent 429 responses for about fifteen minutes. The batch job had no pacing and fired all requests at once. It was moved to a dedicated account and given a token-bucket limiter.",
}

// seedIncidents inserts 54 incidents over the last ~90 days, distributed across
// the 4 regions and 8 services. Roughly one third are left unresolved
// (resolved_at IS NULL) when n % 3 == 0 — exactly 18 of 54. The arithmetic
// mirrors DEMO-DATA.md's executable seed so the tutorial's named queries return
// meaningful rows (recent high/critical incidents, MTTR per region, etc.).
func seedIncidents(db *sql.DB) error {
	// Fetch the seeded service ids so foreign keys are valid regardless of the
	// bigserial sequence starting point.
	rows, err := db.Query(`SELECT id FROM services ORDER BY id`)
	if err != nil {
		return err
	}
	var serviceIDs []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			_ = rows.Close()
			return err
		}
		serviceIDs = append(serviceIDs, id)
	}
	_ = rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	if len(serviceIDs) == 0 {
		return fmt.Errorf("no services to attach incidents to")
	}

	severities := []string{"low", "low", "medium", "medium", "medium", "high", "high", "critical"}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	now := time.Now()
	for n := 1; n <= 54; n++ {
		svc := serviceIDs[(n*7)%len(serviceIDs)]
		region := regions[n%len(regions)]
		idx := n % len(incidentTitles)
		title := fmt.Sprintf("%s — %s", incidentTitles[idx], region)
		body := incidentBodies[idx]
		severity := severities[(n*3)%len(severities)]

		// opened over the last ~90 days (2160 hours).
		openedAt := now.Add(-time.Duration((n*37)%2160) * time.Hour)

		var resolvedAt any // nil for unresolved rows
		if n%3 != 0 {
			// resolved some minutes after it opened.
			resolvedAt = openedAt.Add(time.Duration(20+(n*13)%900) * time.Minute)
		}

		if _, err := tx.Exec(
			`INSERT INTO incidents (service_id, region, title, body, severity, opened_at, resolved_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			svc, region, title, body, severity, openedAt, resolvedAt,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// ---------------------------------------------------------------------------
// Query helpers used by the HTTP handlers
// ---------------------------------------------------------------------------

func listServices(db *sql.DB) ([]Service, error) {
	rows, err := db.Query(`SELECT id, name, tier FROM services ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Service{}
	for rows.Next() {
		var s Service
		if err := rows.Scan(&s.ID, &s.Name, &s.Tier); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// incidentFilter carries the optional query filters and pagination window.
// Resolved is nil for "all", or points at true/false to filter on
// resolved_at IS NOT NULL / IS NULL.
type incidentFilter struct {
	Region   string
	Severity string
	Resolved *bool
	Limit    int
	Offset   int
}

func scanIncident(rows interface{ Scan(...any) error }) (Incident, error) {
	var i Incident
	err := rows.Scan(&i.ID, &i.ServiceID, &i.Region, &i.Title, &i.Body, &i.Severity, &i.OpenedAt, &i.ResolvedAt)
	return i, err
}

func listIncidents(db *sql.DB, f incidentFilter) (items []Incident, total int, err error) {
	where := "WHERE 1=1"
	args := []any{}
	if f.Region != "" {
		args = append(args, f.Region)
		where += fmt.Sprintf(" AND region = $%d", len(args))
	}
	if f.Severity != "" {
		args = append(args, f.Severity)
		where += fmt.Sprintf(" AND severity = $%d", len(args))
	}
	if f.Resolved != nil {
		if *f.Resolved {
			where += " AND resolved_at IS NOT NULL"
		} else {
			where += " AND resolved_at IS NULL"
		}
	}

	if err = db.QueryRow(`SELECT count(*) FROM incidents `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, f.Limit, f.Offset)
	q := fmt.Sprintf(
		`SELECT id, service_id, region, title, body, severity, opened_at, resolved_at
		 FROM incidents %s ORDER BY opened_at DESC LIMIT $%d OFFSET $%d`,
		where, len(args)-1, len(args),
	)
	rows, err := db.Query(q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items = []Incident{}
	for rows.Next() {
		i, err := scanIncident(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, i)
	}
	return items, total, rows.Err()
}

func getIncident(db *sql.DB, id int64) (*Incident, error) {
	i, err := scanIncident(db.QueryRow(
		`SELECT id, service_id, region, title, body, severity, opened_at, resolved_at
		 FROM incidents WHERE id = $1`, id))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &i, nil
}

// incidentInput is the create payload.
type incidentInput struct {
	ServiceID int64  `json:"service_id"`
	Region    string `json:"region"`
	Title     string `json:"title"`
	Body      string `json:"body"`
	Severity  string `json:"severity"`
}

func createIncident(db *sql.DB, in incidentInput) (*Incident, error) {
	i, err := scanIncident(db.QueryRow(
		`INSERT INTO incidents (service_id, region, title, body, severity)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, service_id, region, title, body, severity, opened_at, resolved_at`,
		in.ServiceID, in.Region, in.Title, in.Body, in.Severity))
	if err != nil {
		return nil, err
	}
	return &i, nil
}

// incidentPatch is the partial-update payload. Any nil field is left unchanged.
// Resolved toggles resolution: true stamps resolved_at=now(), false clears it.
type incidentPatch struct {
	Region   *string `json:"region"`
	Title    *string `json:"title"`
	Body     *string `json:"body"`
	Severity *string `json:"severity"`
	Resolved *bool   `json:"resolved"`
}

func updateIncident(db *sql.DB, id int64, p incidentPatch) (*Incident, error) {
	sets := []string{}
	args := []any{}
	set := func(expr string, val any) {
		args = append(args, val)
		sets = append(sets, fmt.Sprintf("%s = $%d", expr, len(args)))
	}
	if p.Region != nil {
		set("region", *p.Region)
	}
	if p.Title != nil {
		set("title", *p.Title)
	}
	if p.Body != nil {
		set("body", *p.Body)
	}
	if p.Severity != nil {
		set("severity", *p.Severity)
	}
	if p.Resolved != nil {
		if *p.Resolved {
			sets = append(sets, "resolved_at = now()")
		} else {
			sets = append(sets, "resolved_at = NULL")
		}
	}

	if len(sets) == 0 {
		// Nothing to change — just return the current row.
		return getIncident(db, id)
	}

	args = append(args, id)
	q := fmt.Sprintf(
		`UPDATE incidents SET %s WHERE id = $%d
		 RETURNING id, service_id, region, title, body, severity, opened_at, resolved_at`,
		strings.Join(sets, ", "), len(args))
	i, err := scanIncident(db.QueryRow(q, args...))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &i, nil
}

func listRollups(db *sql.DB) ([]Rollup, error) {
	rows, err := db.Query(
		`SELECT id, created_at, period_start, period_end, region, total, resolved, still_open, worst_severity
		 FROM incident_rollups ORDER BY period_start DESC, region`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Rollup{}
	for rows.Next() {
		var r Rollup
		var ps, pe time.Time
		if err := rows.Scan(&r.ID, &r.CreatedAt, &ps, &pe, &r.Region, &r.Total, &r.Resolved, &r.StillOpen, &r.WorstSeverity); err != nil {
			return nil, err
		}
		r.PeriodStart = ps.Format("2006-01-02")
		r.PeriodEnd = pe.Format("2006-01-02")
		out = append(out, r)
	}
	return out, rows.Err()
}
