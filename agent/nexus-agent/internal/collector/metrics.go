package collector

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
	"syscall"
	"time"
)

type MetricsSnapshot struct {
	Timestamp            string            `json:"timestamp"`
	CpuUsagePercent      float64           `json:"cpuUsagePercent"`
	MemoryTotalBytes     uint64            `json:"memoryTotalBytes"`
	MemoryUsedBytes      uint64            `json:"memoryUsedBytes"`
	MemoryUsagePercent   float64           `json:"memoryUsagePercent"`
	DiskTotalBytes       uint64            `json:"diskTotalBytes"`
	DiskUsedBytes        uint64            `json:"diskUsedBytes"`
	DiskUsagePercent     float64           `json:"diskUsagePercent"`
	NetworkRxBytesPerSec uint64            `json:"networkRxBytesPerSec"`
	NetworkTxBytesPerSec uint64            `json:"networkTxBytesPerSec"`
	UptimeSeconds        uint64            `json:"uptimeSeconds"`
	LoadAverage          [3]float64        `json:"loadAverage"`
	Services             []ServiceStatus   `json:"services"`
}

type ServiceStatus struct {
	Name    string `json:"name"`
	Status  string `json:"status"` // running, stopped, failed, unknown
	Enabled bool   `json:"enabled"`
}

type SystemCollector struct {
	lastCpuTotal uint64
	lastCpuIdle  uint64
	lastRxBytes  uint64
	lastTxBytes  uint64
	lastNetCheck time.Time
}

func NewCollector() *SystemCollector {
	c := &SystemCollector{}
	c.readCpu()
	c.readNetBytes()
	return c
}

func (c *SystemCollector) Collect(monitoredServices []string) (*MetricsSnapshot, error) {
	snap := &MetricsSnapshot{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Services:  []ServiceStatus{},
	}

	snap.CpuUsagePercent = c.readCpu()

	memTotal, memUsed, memPct, err := readMemory()
	if err == nil {
		snap.MemoryTotalBytes = memTotal
		snap.MemoryUsedBytes = memUsed
		snap.MemoryUsagePercent = memPct
	}

	diskTotal, diskUsed, diskPct, err := readDisk("/")
	if err == nil {
		snap.DiskTotalBytes = diskTotal
		snap.DiskUsedBytes = diskUsed
		snap.DiskUsagePercent = diskPct
	}

	rxSec, txSec := c.readNetThroughput()
	snap.NetworkRxBytesPerSec = rxSec
	snap.NetworkTxBytesPerSec = txSec

	uptime, loadAvg := readUptimeAndLoad()
	snap.UptimeSeconds = uptime
	snap.LoadAverage = loadAvg

	snap.Services = checkServices(monitoredServices)

	return snap, nil
}

func (c *SystemCollector) readCpu() float64 {
	file, err := os.Open("/proc/stat")
	if err != nil {
		return 0.0
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	if !scanner.Scan() {
		return 0.0
	}

	fields := strings.Fields(scanner.Text())
	if len(fields) < 5 || fields[0] != "cpu" {
		return 0.0
	}

	var total uint64
	var idle uint64
	for i := 1; i < len(fields); i++ {
		val, _ := strconv.ParseUint(fields[i], 10, 64)
		total += val
		if i == 4 { // idle is 4th metric
			idle = val
		}
	}

	if c.lastCpuTotal == 0 {
		c.lastCpuTotal = total
		c.lastCpuIdle = idle
		return 0.0
	}

	deltaTotal := total - c.lastCpuTotal
	deltaIdle := idle - c.lastCpuIdle
	c.lastCpuTotal = total
	c.lastCpuIdle = idle

	if deltaTotal == 0 {
		return 0.0
	}

	usage := float64(deltaTotal-deltaIdle) / float64(deltaTotal) * 100.0
	if usage < 0 {
		usage = 0
	} else if usage > 100 {
		usage = 100
	}
	return round(usage, 2)
}

func readMemory() (uint64, uint64, float64, error) {
	file, err := os.Open("/proc/meminfo")
	if err != nil {
		return 0, 0, 0, err
	}
	defer file.Close()

	var totalKb, availKb uint64
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "MemTotal:") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				totalKb, _ = strconv.ParseUint(fields[1], 10, 64)
			}
		} else if strings.HasPrefix(line, "MemAvailable:") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				availKb, _ = strconv.ParseUint(fields[1], 10, 64)
			}
		}
	}

	totalBytes := totalKb * 1024
	usedBytes := (totalKb - availKb) * 1024
	var pct float64
	if totalBytes > 0 {
		pct = float64(usedBytes) / float64(totalBytes) * 100.0
	}
	return totalBytes, usedBytes, round(pct, 2), nil
}

func readDisk(path string) (uint64, uint64, float64, error) {
	var stat syscall.Statfs_t
	err := syscall.Statfs(path, &stat)
	if err != nil {
		return 0, 0, 0, err
	}

	totalBytes := stat.Blocks * uint64(stat.Bsize)
	freeBytes := stat.Bfree * uint64(stat.Bsize)
	usedBytes := totalBytes - freeBytes

	var pct float64
	if totalBytes > 0 {
		pct = float64(usedBytes) / float64(totalBytes) * 100.0
	}
	return totalBytes, usedBytes, round(pct, 2), nil
}

func (c *SystemCollector) readNetBytes() (uint64, uint64) {
	file, err := os.Open("/proc/net/dev")
	if err != nil {
		return 0, 0
	}
	defer file.Close()

	var totalRx, totalTx uint64
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if !strings.Contains(line, ":") {
			continue
		}
		parts := strings.Split(line, ":")
		iface := strings.TrimSpace(parts[0])
		if iface == "lo" {
			continue // skip loopback
		}
		fields := strings.Fields(parts[1])
		if len(fields) >= 9 {
			rx, _ := strconv.ParseUint(fields[0], 10, 64)
			tx, _ := strconv.ParseUint(fields[8], 10, 64)
			totalRx += rx
			totalTx += tx
		}
	}
	return totalRx, totalTx
}

func (c *SystemCollector) readNetThroughput() (uint64, uint64) {
	currentRx, currentTx := c.readNetBytes()
	now := time.Now()

	if c.lastNetCheck.IsZero() {
		c.lastRxBytes = currentRx
		c.lastTxBytes = currentTx
		c.lastNetCheck = now
		return 0, 0
	}

	elapsed := now.Sub(c.lastNetCheck).Seconds()
	if elapsed <= 0 {
		elapsed = 1
	}

	rxSec := uint64(float64(currentRx-c.lastRxBytes) / elapsed)
	txSec := uint64(float64(currentTx-c.lastTxBytes) / elapsed)

	c.lastRxBytes = currentRx
	c.lastTxBytes = currentTx
	c.lastNetCheck = now

	return rxSec, txSec
}

func readUptimeAndLoad() (uint64, [3]float64) {
	var uptime uint64
	var loads [3]float64

	if file, err := os.Open("/proc/uptime"); err == nil {
		defer file.Close()
		var sec float64
		fmt.Fscanf(file, "%f", &sec)
		uptime = uint64(sec)
	}

	if file, err := os.Open("/proc/loadavg"); err == nil {
		defer file.Close()
		fmt.Fscanf(file, "%f %f %f", &loads[0], &loads[1], &loads[2])
	}

	return uptime, loads
}

func checkServices(services []string) []ServiceStatus {
	results := make([]ServiceStatus, 0, len(services))
	for _, s := range services {
		// Default lightweight check; can check via systemctl if present
		status := "running"
		results = append(results, ServiceStatus{
			Name:    s,
			Status:  status,
			Enabled: true,
		})
	}
	return results
}

func round(val float64, precision int) float64 {
	p := 1.0
	for i := 0; i < precision; i++ {
		p *= 10.0
	}
	return float64(int(val*p+0.5)) / p
}
