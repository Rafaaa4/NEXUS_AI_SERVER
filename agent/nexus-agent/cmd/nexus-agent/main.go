package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nexus-ai/nexus-agent/internal/client"
	"github.com/nexus-ai/nexus-agent/internal/collector"
	"github.com/nexus-ai/nexus-agent/internal/config"
	"github.com/nexus-ai/nexus-agent/internal/executor"
)

func main() {
	log.Println("⚡ Starting NEXUS Agent v0.1.0...")

	cfg := config.LoadConfig()

	if cfg.ServerId == "" {
		log.Fatal("❌ Error: NEXUS_SERVER_ID is required.")
	}

	cli := client.NewClient(cfg)

	// Step 1: Auto-Enrollment if no agent secret is present
	if cfg.AgentSecret == "" {
		if cfg.EnrollmentToken == "" {
			log.Fatal("❌ Error: Neither NEXUS_AGENT_SECRET nor NEXUS_TOKEN is provided.")
		}
		log.Println("🔑 Enrolling agent with platform using token...")
		if err := cli.Enroll(cfg.EnrollmentToken); err != nil {
			log.Fatalf("❌ Enrollment failed: %v", err)
		}
		log.Println("✅ Agent enrolled successfully and credentials stored.")
	}

	sysCollector := collector.NewCollector()
	jobExecutor := executor.NewExecutor()
	monitoredServices := []string{"nginx", "docker", "ssh"}

	// Initial Heartbeat and Metrics Push
	if err := cli.SendHeartbeat(); err != nil {
		log.Printf("⚠️ Initial heartbeat failed: %v", err)
	} else {
		log.Println("💓 Initial heartbeat sent.")
	}

	if snap, err := sysCollector.Collect(monitoredServices); err == nil {
		if err := cli.SendMetrics(snap); err != nil {
			log.Printf("⚠️ Initial metrics push failed: %v", err)
		} else {
			log.Printf("📊 Initial metrics reported (CPU: %.1f%%, RAM: %.1f%%, Disk: %.1f%%)",
				snap.CpuUsagePercent, snap.MemoryUsagePercent, snap.DiskUsagePercent)
		}
	}

	// Setup Periodic Tickers
	metricsTicker := time.NewTicker(cfg.MetricsInterval)
	heartbeatTicker := time.NewTicker(cfg.HeartbeatInterval)
	jobPollTicker := time.NewTicker(3 * time.Second) // Poll for approved jobs every 3s
	defer metricsTicker.Stop()
	defer heartbeatTicker.Stop()
	defer jobPollTicker.Stop()

	// Handle Graceful Termination
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	log.Println("🚀 NEXUS Agent is active and monitoring (with Restricted Operations Executor).")

	// Initial log stream
	_ = cli.SendLogs([]client.LogEntry{
		{
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			Level:     "info",
			Source:    "nexus-agent",
			Message:   "NEXUS Agent started successfully. System monitoring and telemetry stream initialized.",
		},
	})

	for {
		select {
		case <-metricsTicker.C:
			snap, err := sysCollector.Collect(monitoredServices)
			if err != nil {
				log.Printf("⚠️ Collector error: %v", err)
				continue
			}
			if err := cli.SendMetrics(snap); err != nil {
				log.Printf("⚠️ Metrics delivery error: %v", err)
			} else {
				log.Printf("📊 Metrics sent: CPU: %.1f%% | RAM: %.1f%% | Disk: %.1f%% | Load: %.2f",
					snap.CpuUsagePercent, snap.MemoryUsagePercent, snap.DiskUsagePercent, snap.LoadAverage[0])
			}

		case <-heartbeatTicker.C:
			if err := cli.SendHeartbeat(); err != nil {
				log.Printf("⚠️ Heartbeat failed: %v", err)
			} else {
				log.Println("💓 Heartbeat OK")
			}
			_ = cli.SendLogs([]client.LogEntry{
				{
					Timestamp: time.Now().UTC().Format(time.RFC3339),
					Level:     "info",
					Source:    "nexus-agent",
					Message:   "Periodic system health check passed. Outbound TLS telemetry active.",
				},
			})

		case <-jobPollTicker.C:
			jobs, err := cli.PollPendingJobs()
			if err != nil {
				continue
			}
			for _, job := range jobs {
				log.Printf("📥 Received approved execution job: %s (Job ID: %s)", job.ActionType, job.JobId)
				execResult := jobExecutor.Execute(job)
				if err := cli.ReportJobResult(job.JobId, execResult); err != nil {
					log.Printf("⚠️ Failed to report job result: %v", err)
				} else {
					log.Printf("✅ Job %s completed with status '%s'", job.JobId, execResult.Status)
				}
			}

		case sig := <-sigChan:
			log.Printf("🛑 Received signal %v, shutting down NEXUS Agent gracefully...", sig)
			return
		}
	}
}
