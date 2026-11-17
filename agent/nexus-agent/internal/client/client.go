package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"runtime"
	"time"

	"github.com/nexus-ai/nexus-agent/internal/collector"
	"github.com/nexus-ai/nexus-agent/internal/config"
	"github.com/nexus-ai/nexus-agent/internal/executor"
)

type AgentClient struct {
	cfg        *config.Config
	httpClient *http.Client
}

type enrollRequest struct {
	ServerId     string `json:"serverId"`
	Token        string `json:"token"`
	Version      string `json:"version"`
	Hostname     string `json:"hostname"`
	OsName       string `json:"osName"`
	Architecture string `json:"architecture"`
}

type enrollResponse struct {
	Success bool `json:"success"`
	Data    struct {
		AgentId  string `json:"agentId"`
		ServerId string `json:"serverId"`
		Secret   string `json:"secret"`
	} `json:"data"`
	Error *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

type pendingJobsResponse struct {
	Success bool                     `json:"success"`
	Data    []*executor.ExecutionJob `json:"data"`
	Error   *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func NewClient(cfg *config.Config) *AgentClient {
	return &AgentClient{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *AgentClient) Enroll(token string) error {
	hostname, _ := os.Hostname()
	reqBody := enrollRequest{
		ServerId:     c.cfg.ServerId,
		Token:        token,
		Version:      "0.1.0",
		Hostname:     hostname,
		OsName:       runtime.GOOS,
		Architecture: runtime.GOARCH,
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Post(
		fmt.Sprintf("%s/agent/v1/enroll", c.cfg.ApiUrl),
		"application/json",
		bytes.NewReader(payload),
	)
	if err != nil {
		return fmt.Errorf("failed to contact platform: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)

	var res enrollResponse
	if err := json.Unmarshal(bodyBytes, &res); err != nil {
		return fmt.Errorf("invalid server response: %s", string(bodyBytes))
	}

	if !res.Success || res.Data.Secret == "" {
		if res.Error != nil {
			return fmt.Errorf("enrollment rejected: %s", res.Error.Message)
		}
		return fmt.Errorf("enrollment rejected by platform")
	}

	return c.cfg.SaveSecret(res.Data.Secret)
}

func (c *AgentClient) SendHeartbeat() error {
	reqPayload := map[string]string{
		"version": "0.1.0",
		"status":  "online",
	}
	data, _ := json.Marshal(reqPayload)

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/agent/v1/heartbeat", c.cfg.ApiUrl),
		bytes.NewReader(data),
	)
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.cfg.AgentSecret))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("heartbeat HTTP %d", resp.StatusCode)
	}

	return nil
}

func (c *AgentClient) SendMetrics(snap *collector.MetricsSnapshot) error {
	data, err := json.Marshal(snap)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/agent/v1/metrics", c.cfg.ApiUrl),
		bytes.NewReader(data),
	)
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.cfg.AgentSecret))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("metrics ingestion HTTP %d", resp.StatusCode)
	}

	return nil
}

func (c *AgentClient) PollPendingJobs() ([]*executor.ExecutionJob, error) {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf("%s/agent/v1/jobs/pending", c.cfg.ApiUrl),
		nil,
	)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.cfg.AgentSecret))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)

	var res pendingJobsResponse
	if err := json.Unmarshal(bodyBytes, &res); err != nil {
		return nil, err
	}

	if !res.Success {
		return nil, fmt.Errorf("failed to fetch pending jobs")
	}

	return res.Data, nil
}

func (c *AgentClient) ReportJobResult(jobId string, res *executor.ExecutionResult) error {
	data, err := json.Marshal(res)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/agent/v1/jobs/%s/result", c.cfg.ApiUrl, jobId),
		bytes.NewReader(data),
	)
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.cfg.AgentSecret))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to report job result: HTTP %d", resp.StatusCode)
	}

	return nil
}
type LogEntry struct {
	Timestamp string `json:"timestamp"`
	Level     string `json:"level"`
	Source    string `json:"source"`
	Message   string `json:"message"`
}

func (c *AgentClient) SendLogs(logs []LogEntry) error {
	payload := map[string]interface{}{"logs": logs}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/agent/v1/logs", c.cfg.ApiUrl),
		bytes.NewReader(data),
	)
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.cfg.AgentSecret))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to send logs: HTTP %d", resp.StatusCode)
	}

	return nil
}
