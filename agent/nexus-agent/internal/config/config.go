package config

import (
	"bufio"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	ApiUrl            string
	ServerId          string
	AgentSecret       string
	EnrollmentToken   string
	MetricsInterval   time.Duration
	HeartbeatInterval time.Duration
}

func LoadConfig() *Config {
	cfg := &Config{
		ApiUrl:            "http://localhost:4000",
		MetricsInterval:   15 * time.Second,
		HeartbeatInterval: 30 * time.Second,
	}

	// Try loading from /etc/nexus-agent/config.env or local config.env
	loadEnvFile("/etc/nexus-agent/config.env")
	loadEnvFile("./config.env")

	if val := os.Getenv("NEXUS_API_URL"); val != "" {
		cfg.ApiUrl = strings.TrimRight(val, "/")
	}
	if val := os.Getenv("NEXUS_SERVER_ID"); val != "" {
		cfg.ServerId = val
	}
	if val := os.Getenv("NEXUS_AGENT_SECRET"); val != "" {
		cfg.AgentSecret = val
	}
	if val := os.Getenv("NEXUS_TOKEN"); val != "" {
		cfg.EnrollmentToken = val
	}
	if val := os.Getenv("NEXUS_METRICS_INTERVAL_SEC"); val != "" {
		if sec, err := strconv.Atoi(val); err == nil && sec > 0 {
			cfg.MetricsInterval = time.Duration(sec) * time.Second
		}
	}
	if val := os.Getenv("NEXUS_HEARTBEAT_INTERVAL_SEC"); val != "" {
		if sec, err := strconv.Atoi(val); err == nil && sec > 0 {
			cfg.HeartbeatInterval = time.Duration(sec) * time.Second
		}
	}

	return cfg
}

func loadEnvFile(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			k := strings.TrimSpace(parts[0])
			v := strings.Trim(strings.TrimSpace(parts[1]), "\"'")
			if os.Getenv(k) == "" {
				os.Setenv(k, v)
			}
		}
	}
}

func (c *Config) SaveSecret(secret string) error {
	c.AgentSecret = secret
	content := "NEXUS_API_URL=" + c.ApiUrl + "\n" +
		"NEXUS_SERVER_ID=" + c.ServerId + "\n" +
		"NEXUS_AGENT_SECRET=" + secret + "\n"

	// Try writing to /etc/nexus-agent if accessible, otherwise local config.env
	if err := os.MkdirAll("/etc/nexus-agent", 0755); err == nil {
		if err := os.WriteFile("/etc/nexus-agent/config.env", []byte(content), 0600); err == nil {
			return nil
		}
	}
	return os.WriteFile("./config.env", []byte(content), 0600)
}
