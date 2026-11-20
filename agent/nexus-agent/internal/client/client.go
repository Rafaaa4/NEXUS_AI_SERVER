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
			Timeout: 15 * time.Second,
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

	urls := []string{
		fmt.Sprintf("%s/agent/v1/enroll", c.cfg.ApiUrl),
		fmt.Sprintf("%s/api/v1/agent/enroll", c.cfg.ApiUrl),
	}

	var lastErr error
	for _, targetUrl := range urls {
		resp, err := c.httpClient.Post(targetUrl, "application/json", bytes.NewReader(payload))
		if err != nil {
			lastErr = err
			continue
		}
		defer resp.Body.Close()

		bodyBytes, _ := io.ReadAll(resp.Body)
		var res enrollResponse
		if err := json.Unmarshal(bodyBytes, &res); err == nil && res.Success && res.Data.Secret != "" {
			return c.cfg.SaveSecret(res.Data.Secret)
		}
		if res.Error != nil {
			lastErr = fmt.Errorf("enrollment rejected: %s", res.Error.Message)
		}
	}

	if lastErr != nil {
		return lastErr
	}
	return fmt.Errorf("enrollment failed on platform")
}

func (c *AgentClient) SendHeartbeat() error {
	reqPayload := map[string]string{
		"version":  "0.1.0",
		"status":   "online",
		"serverId": c.cfg.ServerId,
	}
	data, _ := json.Marshal(reqPayload)

	urls := []string{
		fmt.Sprintf("%s/agent/v1/heartbeat", c.cfg.ApiUrl),
		fmt.Sprintf("%s/api/v1/agent/heartbeat", c.cfg.ApiUrl),
	}

	for _, targetUrl := range urls {
		req, err := http.NewRequest("POST", targetUrl, bytes.NewReader(data))
		if err != nil {
			continue
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.cfg.AgentSecret))
		req.Header.Set("x-server-id", c.cfg.ServerId)

		resp, err := c.httpClient.Do(req)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return nil
			}
		}
	}
	return nil
}

func (c *AgentClient) SendMetrics(snap *collector.MetricsSnapshot) error {
	data, err := json.Marshal(snap)
	if err != nil {
		return err
	}

	urls := []string{
		fmt.Sprintf("%s/agent/v1/metrics", c.cfg.ApiUrl),
		fmt.Sprintf("%s/api/v1/agent/metrics", c.cfg.ApiUrl),
	}

	for _, targetUrl := range urls {
		req, err := http.NewRequest("POST", targetUrl, bytes.NewReader(data))
		if err != nil {
			continue
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.cfg.AgentSecret))
		req.Header.Set("x-server-id", c.cfg.ServerId)

		resp, err := c.httpClient.Do(req)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return nil
			}
		}
	}
	return nil
}

func (c *AgentClient) PollPendingJobs() ([]*executor.ExecutionJob, error) {
	urls := []string{
		fmt.Sprintf("%s/agent/v1/jobs/pending", c.cfg.ApiUrl),
		fmt.Sprintf("%s/api/v1/jobs", c.cfg.ApiUrl),
	}

	for _, targetUrl := range urls {
		req, err := http.NewRequest("GET", targetUrl, nil)
		if err != nil {
			continue
		}
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.cfg.AgentSecret))
		req.Header.Set("x-server-id", c.cfg.ServerId)

		resp, err := c.httpClient.Do(req)
		if err != nil {
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			continue
		}

		bodyBytes, _ := io.ReadAll(resp.Body)
		var res pendingJobsResponse
		if err := json.Unmarshal(bodyBytes, &res); err == nil && res.Success {
			return res.Data, nil
		}
	}

	return nil, nil
}

func (c *AgentClient) ReportJobResult(jobId string, res *executor.ExecutionResult) error {
	data, err := json.Marshal(res)
	if err != nil {
		return err
	}

	urls := []string{
		fmt.Sprintf("%s/agent/v1/jobs/%s/result", c.cfg.ApiUrl, jobId),
		fmt.Sprintf("%s/api/v1/jobs/%s/result", c.cfg.ApiUrl, jobId),
	}

	for _, targetUrl := range urls {
		req, err := http.NewRequest("POST", targetUrl, bytes.NewReader(data))
		if err != nil {
			continue
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.cfg.AgentSecret))
		req.Header.Set("x-server-id", c.cfg.ServerId)

		resp, err := c.httpClient.Do(req)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return nil
			}
		}
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

	urls := []string{
		fmt.Sprintf("%s/agent/v1/logs", c.cfg.ApiUrl),
		fmt.Sprintf("%s/api/v1/agent/logs", c.cfg.ApiUrl),
	}

	for _, targetUrl := range urls {
		req, err := http.NewRequest("POST", targetUrl, bytes.NewReader(data))
		if err != nil {
			continue
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.cfg.AgentSecret))
		req.Header.Set("x-server-id", c.cfg.ServerId)

		resp, err := c.httpClient.Do(req)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return nil
			}
		}
	}
	return nil
}
