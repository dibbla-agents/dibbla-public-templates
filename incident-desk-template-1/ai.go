package main

// ---------------------------------------------------------------------------
// AI gateway client — the integration point stages 3 and 4 of the tutorial
// switch on.
//
// The two summarise/triage endpoints in routes.go return HTTP 501 today. This
// file already carries a working Dibbla AI Gateway call (`summariseBody`) —
// stage 3 of the "Build it" tutorial simply calls it from handleSummarise and
// returns the result; stage 4 adds a second prompt for triage. It is modelled
// on the gateway call in expense-reporter-template-1 (main.go ExtractExpenses):
// the user's Dibbla token authenticates, and the gateway swaps it for the
// platform-managed Anthropic key.
//
// TODO(stage-3): call summariseBody from handleSummarise once you have the
//   incident body and the caller's Dibbla token, then return {"summary": ...}.
// ---------------------------------------------------------------------------

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const incidentSummarySystemPrompt = `You are an incident-response assistant. You read the free-text body of a single infrastructure incident and write a tight, factual summary.
Respond with plain text only — two or three sentences, no markdown, no preamble.
Lead with what broke and its user impact, then the root cause if stated, then the mitigation.`

// summariseBody calls Claude through the Dibbla AI Gateway to summarise one
// incident body. authToken is the caller's Dibbla token; hostname is the
// incoming request host, used to attribute the call to the deployed app when
// DIBBLA_ALIAS is not set at deploy time.
//
// It is wired up in stage 3 of the tutorial. It is defined now so the
// integration point is real, not invented by the reader.
func summariseBody(body, authToken, hostname string) (string, error) {
	gatewayURL := strings.TrimRight(os.Getenv("DIBBLA_AI_GATEWAY_URL"), "/")
	if gatewayURL == "" {
		gatewayURL = "https://ai.dibbla.net"
	}

	payload, _ := json.Marshal(map[string]any{
		"model":      "claude-sonnet-4-6",
		"max_tokens": 512,
		"system":     incidentSummarySystemPrompt,
		"messages": []map[string]any{
			{"role": "user", "content": body},
		},
	})

	req, err := http.NewRequest("POST", gatewayURL+"/anthropic/v1/messages", bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", authToken)
	req.Header.Set("anthropic-version", "2023-06-01")

	alias := os.Getenv("DIBBLA_ALIAS")
	if alias == "" {
		if host, _, ok := strings.Cut(hostname, ":"); ok || host != "" {
			if strings.HasSuffix(host, ".dibbla.net") {
				alias = strings.TrimSuffix(host, ".dibbla.net")
			} else if strings.HasSuffix(host, ".dibbla.com") {
				alias = strings.TrimSuffix(host, ".dibbla.com")
			}
		}
	}
	if alias != "" {
		req.Header.Set("X-Dibbla-App", alias)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("ai gateway request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read ai gateway response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("ai gateway returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("decode ai gateway response: %w", err)
	}
	for _, part := range result.Content {
		if part.Type == "text" {
			return strings.TrimSpace(part.Text), nil
		}
	}
	return "", fmt.Errorf("ai gateway response contained no text")
}
