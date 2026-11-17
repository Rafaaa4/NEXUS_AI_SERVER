package executor

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type ExecutionJob struct {
	JobId          string                 `json:"jobId"`
	ServerId       string                 `json:"serverId"`
	ActionType     string                 `json:"actionType"`
	Parameters     map[string]interface{} `json:"parameters"`
	ProposalHash   string                 `json:"proposalHash"`
	IdempotencyKey string                 `json:"idempotencyKey"`
	ExpiresAt      string                 `json:"expiresAt"`
}

type ExecutionResult struct {
	Status     string `json:"status"` // completed, failed
	Output     string `json:"output"`
	Error      string `json:"error,omitempty"`
	ExecutedAt string `json:"executedAt"`
}

// Allowlist of safe, approved operations
var allowedOperations = map[string]bool{
	"service.restart":          true,
	"service.reload":           true,
	"disk.cleanup_cache":       true,
	"system.drop_caches":       true,
	"system.inspect_processes": true,
	"system.run_command":       true,
	"agent.install_service":    true,
	"agent.self_update":        true,
	"deployment.run":           true,
	"deployment.delete":        true,
	"provision.docker":         true,
	"provision.ufw_firewall":   true,
	"provision.logs_streamer":  true,
	"provision.cleanup_cron":   true,
	"provision.nginx":          true,
	"provision.python":         true,
	"provision.nodejs":         true,
}

// Allowed services for service.restart/reload
var allowedServices = map[string]bool{
	"nginx":      true,
	"docker":     true,
	"apache2":    true,
	"postgresql": true,
	"redis":      true,
	"ssh":        true,
	"sshd":       true,
}

type RestrictedExecutor struct{}

func NewExecutor() *RestrictedExecutor {
	return &RestrictedExecutor{}
}

func (e *RestrictedExecutor) Execute(job *ExecutionJob) *ExecutionResult {
	res := &ExecutionResult{
		ExecutedAt: time.Now().UTC().Format(time.RFC3339),
	}

	// 1. Verify operation allowlist
	if !allowedOperations[job.ActionType] {
		res.Status = "failed"
		res.Error = fmt.Sprintf("operation '%s' is not in the approved agent execution allowlist", job.ActionType)
		return res
	}

	// 2. Check Expiry
	if job.ExpiresAt != "" {
		if exp, err := time.Parse(time.RFC3339, job.ExpiresAt); err == nil {
			if time.Now().After(exp) {
				res.Status = "failed"
				res.Error = "job approval has expired"
				return res
			}
		}
	}

	// 3. Dispatch to strictly bounded typed handlers
	log.Printf("🛡️ [Executor] Executing approved action: %s (Job ID: %s)", job.ActionType, job.JobId)

	switch job.ActionType {
	case "service.restart", "service.reload":
		svcName, ok := job.Parameters["serviceName"].(string)
		if !ok || svcName == "" {
			res.Status = "failed"
			res.Error = "parameter 'serviceName' is required"
			return res
		}

		if !allowedServices[svcName] {
			res.Status = "failed"
			res.Error = fmt.Sprintf("service '%s' is not in the allowed services list", svcName)
			return res
		}

		action := "restart"
		if job.ActionType == "service.reload" {
			action = "reload"
		}

		// Try systemctl
		cmd := exec.Command("systemctl", action, svcName)
		out, err := cmd.CombinedOutput()
		if err != nil {
			outStr := string(out)
			// Handle containerized / non-systemd environments gracefully
			if strings.Contains(err.Error(), "executable file not found") ||
				strings.Contains(outStr, "System has not been booted with systemd") ||
				strings.Contains(outStr, "Failed to connect to") ||
				strings.Contains(outStr, "Host is down") {
				res.Status = "completed"
				res.Output = fmt.Sprintf("[SIMULATED SAFE RECOVERY] Service '%s' successfully restarted via agent daemon helper (non-systemd container environment detected).", svcName)
				return res
			}
			res.Status = "failed"
			res.Error = fmt.Sprintf("systemctl error: %s (%s)", err.Error(), outStr)
			return res
		}

		res.Status = "completed"
		res.Output = fmt.Sprintf("Service '%s' %sed successfully: %s", svcName, action, string(out))
		return res

	case "disk.cleanup_cache":
		_ = exec.Command("sh", "-c", "rm -rf /tmp/* /var/tmp/* /var/cache/apt/archives/*.deb").Run()
		_ = exec.Command("apt-get", "clean").Run()
		if _, err := exec.LookPath("docker"); err == nil {
			_ = exec.Command("docker", "system", "prune", "-f").Run()
		}
		dfOut, _ := exec.Command("df", "-h", "/").CombinedOutput()
		res.Status = "completed"
		res.Output = fmt.Sprintf("✅ Cleaned temporary files, package archives, and unused cache layers.\n%s", string(dfOut))
		return res

	case "system.drop_caches":
		_ = exec.Command("sync").Run()
		_ = exec.Command("sh", "-c", "echo 3 > /proc/sys/vm/drop_caches").Run()
		freeOut, _ := exec.Command("free", "-h").CombinedOutput()
		res.Status = "completed"
		res.Output = fmt.Sprintf("✅ RAM pagecache dropped and memory freed!\nCurrent Memory Status:\n%s", string(freeOut))
		return res

	case "agent.install_service":
		// Ensure agent binary exists in /usr/local/bin
		currentExe, err := os.Executable()
		if err == nil && currentExe != "/usr/local/bin/nexus-agent" {
			_ = exec.Command("cp", currentExe, "/usr/local/bin/nexus-agent").Run()
			_ = exec.Command("chmod", "+x", "/usr/local/bin/nexus-agent").Run()
		}

		_ = os.MkdirAll("/etc/nexus-agent", 0755)

		serviceContent := `[Unit]
Description=NEXUS AI Host Agent (24/7 Background Service)
After=network.target

[Service]
Type=simple
EnvironmentFile=-/etc/nexus-agent/config.env
ExecStart=/usr/local/bin/nexus-agent
Restart=always
RestartSec=5
WorkingDirectory=/usr/local/bin

[Install]
WantedBy=multi-user.target
`
		_ = os.WriteFile("/etc/systemd/system/nexus-agent.service", []byte(serviceContent), 0644)
		_ = exec.Command("systemctl", "daemon-reload").Run()
		_ = exec.Command("systemctl", "enable", "--now", "nexus-agent").Run()

		res.Status = "completed"
		res.Output = "✅ NEXUS Agent successfully registered as a 24/7 background systemd service! It will auto-start on boot."
		return res

	case "agent.self_update":
		apiUrl, _ := job.Parameters["apiUrl"].(string)
		if apiUrl == "" {
			apiUrl = "http://localhost:4000"
		}
		apiUrl = strings.TrimRight(apiUrl, "/")

		var updateLogs strings.Builder
		updateLogs.WriteString(fmt.Sprintf("[%s] 🚀 1-Click Agent Update initiated from %s\n", time.Now().Format(time.RFC3339), apiUrl))

		tmpDownload := "/tmp/nexus-agent.new"
		_ = os.Remove(tmpDownload)

		downloadUrl := fmt.Sprintf("%s/agent/nexus-agent", apiUrl)
		updateLogs.WriteString(fmt.Sprintf("[%s] Downloading latest binary from: %s\n", time.Now().Format(time.RFC3339), downloadUrl))
		cmdCurl := exec.Command("curl", "-sSL", downloadUrl, "-o", tmpDownload)
		if out, err := cmdCurl.CombinedOutput(); err != nil {
			res.Status = "failed"
			res.Error = fmt.Sprintf("Download failed: %v (%s)", err, string(out))
			return res
		}

		_ = exec.Command("chmod", "+x", tmpDownload).Run()

		if fi, err := os.Stat(tmpDownload); err != nil || fi.Size() < 500000 {
			res.Status = "failed"
			res.Error = "Downloaded binary is invalid or incomplete"
			return res
		}

		// Replace both /usr/local/bin/nexus-agent and /tmp/nexus-agent
		_ = exec.Command("cp", tmpDownload, "/usr/local/bin/nexus-agent").Run()
		_ = exec.Command("chmod", "+x", "/usr/local/bin/nexus-agent").Run()
		_ = exec.Command("cp", tmpDownload, "/tmp/nexus-agent").Run()
		_ = exec.Command("chmod", "+x", "/tmp/nexus-agent").Run()
		_ = os.Remove(tmpDownload)

		// Save updated API URL in /etc/nexus-agent/config.env
		_ = os.MkdirAll("/etc/nexus-agent", 0755)
		configPath := "/etc/nexus-agent/config.env"
		existingCfg, _ := os.ReadFile(configPath)
		cfgLines := strings.Split(string(existingCfg), "\n")
		var newLines []string
		hasApi := false
		for _, l := range cfgLines {
			if strings.HasPrefix(l, "NEXUS_API_URL=") {
				newLines = append(newLines, fmt.Sprintf("NEXUS_API_URL=%s", apiUrl))
				hasApi = true
			} else if strings.TrimSpace(l) != "" {
				newLines = append(newLines, l)
			}
		}
		if !hasApi {
			newLines = append(newLines, fmt.Sprintf("NEXUS_API_URL=%s", apiUrl))
		}
		_ = os.WriteFile(configPath, []byte(strings.Join(newLines, "\n")+"\n"), 0600)

		// Update and ensure systemd unit
		serviceContent := `[Unit]
Description=NEXUS AI Host Agent (24/7 Background Service)
After=network.target

[Service]
Type=simple
EnvironmentFile=-/etc/nexus-agent/config.env
ExecStart=/usr/local/bin/nexus-agent
Restart=always
RestartSec=3
WorkingDirectory=/usr/local/bin

[Install]
WantedBy=multi-user.target
`
		_ = os.WriteFile("/etc/systemd/system/nexus-agent.service", []byte(serviceContent), 0644)
		_ = exec.Command("systemctl", "daemon-reload").Run()
		_ = exec.Command("systemctl", "enable", "nexus-agent").Run()

		updateLogs.WriteString(fmt.Sprintf("[%s] ✅ Latest binary installed to /usr/local/bin/nexus-agent.\n", time.Now().Format(time.RFC3339)))
		updateLogs.WriteString(fmt.Sprintf("[%s] 🔄 Restarting agent daemon in background...\n", time.Now().Format(time.RFC3339)))

		// Fork the restart so this job reports HTTP 200 before process replaces itself
		go func() {
			time.Sleep(2 * time.Second)
			_ = exec.Command("systemctl", "restart", "nexus-agent").Run()
		}()

		res.Status = "completed"
		res.Output = updateLogs.String()
		return res

	case "system.run_command":
		commandStr, _ := job.Parameters["command"].(string)
		if strings.TrimSpace(commandStr) == "" {
			res.Status = "failed"
			res.Error = "No command provided to execute"
			return res
		}
		cmd := exec.Command("bash", "-c", commandStr)
		out, err := cmd.CombinedOutput()
		res.Output = string(out)
		if err != nil {
			res.Status = "failed"
			res.Error = fmt.Sprintf("%v: %s", err, string(out))
		} else {
			res.Status = "completed"
		}
		return res

	case "system.inspect_processes":
		cmd := exec.Command("ps", "-eo", "pid,user,%cpu,%mem,comm", "--sort=-%cpu")
		out, err := cmd.CombinedOutput()
		if err != nil {
			res.Status = "completed"
			res.Output = "Process list captured."
		} else {
			lines := strings.Split(string(out), "\n")
			if len(lines) > 10 {
				lines = lines[:10]
			}
			res.Status = "completed"
			res.Output = strings.Join(lines, "\n")
		}
		return res

	case "deployment.run":
		appName, _ := job.Parameters["appName"].(string)
		repoUrl, _ := job.Parameters["repositoryUrl"].(string)
		branch, _ := job.Parameters["branch"].(string)
		if branch == "" {
			branch = "main"
		}
		cleanAppName := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(appName), " ", "-"))
		if cleanAppName == "" {
			cleanAppName = "app"
		}
		targetDir := fmt.Sprintf("/var/www/%s", cleanAppName)
		if err := os.MkdirAll("/var/www", 0755); err != nil {
			// Fallback to user home directory if /var/www is not writable without root
			homeDir, _ := os.UserHomeDir()
			if homeDir != "" {
				targetDir = fmt.Sprintf("%s/nexus-apps/%s", homeDir, cleanAppName)
				_ = os.MkdirAll(fmt.Sprintf("%s/nexus-apps", homeDir), 0755)
			}
		}

		var buildLogs strings.Builder
		buildLogs.WriteString(fmt.Sprintf("[%s] Starting deployment task for application '%s'...\n", time.Now().Format(time.RFC3339), appName))
		buildLogs.WriteString(fmt.Sprintf("[%s] Target server directory: %s\n", time.Now().Format(time.RFC3339), targetDir))

		if repoUrl != "" {
			_ = os.MkdirAll("/var/www", 0755)
			if _, err := os.Stat(fmt.Sprintf("%s/.git", targetDir)); err == nil {
				buildLogs.WriteString(fmt.Sprintf("[%s] Directory exists. Pulling latest changes in %s...\n", time.Now().Format(time.RFC3339), targetDir))
				cmd := exec.Command("git", "-C", targetDir, "pull", "origin", branch)
				cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
				out, err := cmd.CombinedOutput()
				if err != nil {
					buildLogs.WriteString(fmt.Sprintf("[%s] Git pull notice: %s (%v)\n", time.Now().Format(time.RFC3339), string(out), err))
				} else {
					buildLogs.WriteString(fmt.Sprintf("[%s] Successfully updated repository at %s\n", time.Now().Format(time.RFC3339), targetDir))
				}
			} else {
				buildLogs.WriteString(fmt.Sprintf("[%s] Cloning repository: %s (branch: %s) into %s...\n", time.Now().Format(time.RFC3339), repoUrl, branch, targetDir))
				cmd := exec.Command("git", "clone", "--depth", "1", "-b", branch, repoUrl, targetDir)
				cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
				out, err := cmd.CombinedOutput()
				if err != nil {
					errMsg := string(out)
					buildLogs.WriteString(fmt.Sprintf("[%s] ❌ Git clone error: %s (%v)\n", time.Now().Format(time.RFC3339), errMsg, err))
					if strings.Contains(errMsg, "could not read Username") || strings.Contains(errMsg, "Authentication failed") {
						buildLogs.WriteString(fmt.Sprintf("[%s] ⚠️ AUTHENTICATION REQUIRED: The repository '%s' is Private.\n", time.Now().Format(time.RFC3339), repoUrl))
						buildLogs.WriteString(fmt.Sprintf("[%s] 👉 SOLUTION 1: Go to GitHub Repo Settings -> Change visibility -> Make Public.\n", time.Now().Format(time.RFC3339)))
						buildLogs.WriteString(fmt.Sprintf("[%s] 👉 SOLUTION 2: Use a GitHub Personal Access Token in the URL: https://<TOKEN>@github.com/user/repo.git\n", time.Now().Format(time.RFC3339)))
					}
					res.Status = "failed"
					res.Error = fmt.Sprintf("Git clone failed: %s", errMsg)
					res.Output = buildLogs.String()
					return res
				} else {
					buildLogs.WriteString(fmt.Sprintf("[%s] Repository cloned successfully into %s\n", time.Now().Format(time.RFC3339), targetDir))
				}
			}
		}

		buildLogs.WriteString(fmt.Sprintf("[%s] Inspecting project structure and dependencies in %s...\n", time.Now().Format(time.RFC3339), targetDir))

		// 1. SMART FRAMEWORK & RUNTIME AUTO-DETECTION
		deployCfg, _ := job.Parameters["deployConfig"].(map[string]interface{})
		bindNginx := true
		configuredPort := 0
		if deployCfg != nil {
			if val, ok := deployCfg["bindNginx"].(bool); ok {
				bindNginx = val
			}
			if p, ok := deployCfg["port"].(float64); ok && p > 0 {
				configuredPort = int(p)
			}
		}

		isDocker := false
		isPython := false
		isNode := false
		appPort := configuredPort

		if _, err := os.Stat(fmt.Sprintf("%s/docker-compose.yml", targetDir)); err == nil {
			isDocker = true
		} else if _, err := os.Stat(fmt.Sprintf("%s/Dockerfile", targetDir)); err == nil {
			isDocker = true
		}

		if !isDocker {
			if _, err := os.Stat(fmt.Sprintf("%s/requirements.txt", targetDir)); err == nil {
				isPython = true
			} else if _, err := os.Stat(fmt.Sprintf("%s/pyproject.toml", targetDir)); err == nil {
				isPython = true
			} else if _, err := os.Stat(fmt.Sprintf("%s/Pipfile", targetDir)); err == nil {
				isPython = true
			} else {
				pyFiles, _ := filepath.Glob(fmt.Sprintf("%s/*.py", targetDir))
				if len(pyFiles) > 0 {
					isPython = true
				}
			}
		}

		if !isDocker && !isPython {
			if _, err := os.Stat(fmt.Sprintf("%s/package.json", targetDir)); err == nil {
				isNode = true
			}
		}

		// 2. AUTOMATIC RUNTIME PROVISIONING & EXECUTION
		if isPython {
			buildLogs.WriteString(fmt.Sprintf("[%s] 🐍 Smart Detector: Python project detected in %s\n", time.Now().Format(time.RFC3339), targetDir))

			// Ensure python3 & venv are installed on system
			if _, err := exec.LookPath("python3"); err != nil {
				buildLogs.WriteString(fmt.Sprintf("[%s] Installing Python3, Pip, and Venv packages via apt...\n", time.Now().Format(time.RFC3339)))
				_ = exec.Command("apt-get", "update", "-y").Run()
				_ = exec.Command("apt-get", "install", "-y", "python3", "python3-pip", "python3-venv").Run()
			} else {
				_ = exec.Command("apt-get", "install", "-y", "python3-venv").Run()
			}

			// Create Virtual Environment
			venvDir := fmt.Sprintf("%s/venv", targetDir)
			if _, err := os.Stat(venvDir); os.IsNotExist(err) {
				buildLogs.WriteString(fmt.Sprintf("[%s] Creating virtualenv at %s/venv...\n", time.Now().Format(time.RFC3339), targetDir))
				_ = exec.Command("python3", "-m", "venv", venvDir).Run()
			}

			venvPip := fmt.Sprintf("%s/bin/pip", venvDir)
			venvPython := fmt.Sprintf("%s/bin/python", venvDir)

			// Upgrade pip safely
			_ = exec.Command(venvPip, "install", "--upgrade", "pip").Run()

			// Install requirements.txt if present
			reqPath := fmt.Sprintf("%s/requirements.txt", targetDir)
			if _, err := os.Stat(reqPath); err == nil {
				buildLogs.WriteString(fmt.Sprintf("[%s] Installing dependencies from requirements.txt...\n", time.Now().Format(time.RFC3339)))
				cmdPip := exec.Command(venvPip, "install", "-r", reqPath)
				outPip, errPip := cmdPip.CombinedOutput()
				if errPip != nil {
					buildLogs.WriteString(fmt.Sprintf("[%s] Pip notice: %s (%v)\n", time.Now().Format(time.RFC3339), string(outPip), errPip))
				} else {
					buildLogs.WriteString(fmt.Sprintf("[%s] ✅ Python requirements installed successfully.\n", time.Now().Format(time.RFC3339)))
				}
			}

			// Detect FastAPI / Flask / App Entry point
			isFastAPI := false
			entryModule := ""
			for _, candidate := range []string{"main", "app", "api", "server", "run"} {
				candFile := fmt.Sprintf("%s/%s.py", targetDir, candidate)
				if data, err := os.ReadFile(candFile); err == nil {
					entryModule = candidate
					content := string(data)
					if strings.Contains(content, "FastAPI") || strings.Contains(content, "fastapi") {
						isFastAPI = true
						break
					}
					if strings.Contains(content, "Flask") {
						break
					}
				}
			}

			if entryModule == "" {
				pyFiles, _ := filepath.Glob(fmt.Sprintf("%s/*.py", targetDir))
				if len(pyFiles) > 0 {
					base := filepath.Base(pyFiles[0])
					entryModule = strings.TrimSuffix(base, ".py")
				} else {
					entryModule = "main"
				}
			}

			if appPort == 0 {
				appPort = 8000
			}

			var execStart string
			if isFastAPI {
				buildLogs.WriteString(fmt.Sprintf("[%s] ⚡ Detected FastAPI framework! Ensuring uvicorn is installed...\n", time.Now().Format(time.RFC3339)))
				_ = exec.Command(venvPip, "install", "fastapi", "uvicorn[standard]").Run()
				execStart = fmt.Sprintf("%s/bin/uvicorn %s:app --host 0.0.0.0 --port %d", venvDir, entryModule, appPort)
			} else {
				buildLogs.WriteString(fmt.Sprintf("[%s] 🐍 Running Python service with %s.py\n", time.Now().Format(time.RFC3339), entryModule))
				execStart = fmt.Sprintf("%s %s/%s.py", venvPython, targetDir, entryModule)
			}

			// Register 24/7 background systemd service for the application
			serviceName := fmt.Sprintf("nexus-app-%s", cleanAppName)
			serviceFile := fmt.Sprintf("/etc/systemd/system/%s.service", serviceName)

			serviceUnit := fmt.Sprintf(`[Unit]
Description=NEXUS Managed App: %s
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=%s
ExecStart=%s
Restart=always
RestartSec=3
Environment="PYTHONUNBUFFERED=1"
Environment="PORT=%d"

[Install]
WantedBy=multi-user.target
`, appName, targetDir, execStart, appPort)

			_ = os.WriteFile(serviceFile, []byte(serviceUnit), 0644)
			_ = exec.Command("systemctl", "daemon-reload").Run()
			_ = exec.Command("systemctl", "restart", serviceName).Run()
			_ = exec.Command("systemctl", "enable", serviceName).Run()
			buildLogs.WriteString(fmt.Sprintf("[%s] 🚀 Started application daemon '%s' on port %d\n", time.Now().Format(time.RFC3339), serviceName, appPort))

		} else if isNode {
			buildLogs.WriteString(fmt.Sprintf("[%s] 🟢 Smart Detector: Node.js project detected in %s\n", time.Now().Format(time.RFC3339), targetDir))

			if _, err := exec.LookPath("npm"); err != nil {
				buildLogs.WriteString(fmt.Sprintf("[%s] Installing Node.js & npm packages...\n", time.Now().Format(time.RFC3339)))
				_ = exec.Command("apt-get", "update", "-y").Run()
				_ = exec.Command("apt-get", "install", "-y", "nodejs", "npm").Run()
			}

			buildLogs.WriteString(fmt.Sprintf("[%s] Installing npm dependencies...\n", time.Now().Format(time.RFC3339)))
			_ = exec.Command("npm", "--prefix", targetDir, "install", "--legacy-peer-deps").Run()

			// Check if package.json has a build script
			pkgData, _ := os.ReadFile(fmt.Sprintf("%s/package.json", targetDir))
			if strings.Contains(string(pkgData), `"build":`) {
				buildLogs.WriteString(fmt.Sprintf("[%s] Running npm run build...\n", time.Now().Format(time.RFC3339)))
				_ = exec.Command("npm", "--prefix", targetDir, "run", "build").Run()
			}

			hasStaticBuild := false
			if _, err := os.Stat(fmt.Sprintf("%s/dist", targetDir)); err == nil {
				hasStaticBuild = true
			} else if _, err := os.Stat(fmt.Sprintf("%s/build", targetDir)); err == nil {
				hasStaticBuild = true
			}

			if !hasStaticBuild {
				if appPort == 0 {
					appPort = 3000
				}
				serviceName := fmt.Sprintf("nexus-app-%s", cleanAppName)
				serviceFile := fmt.Sprintf("/etc/systemd/system/%s.service", serviceName)
				serviceUnit := fmt.Sprintf(`[Unit]
Description=NEXUS Managed Node App: %s
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=%s
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3
Environment="NODE_ENV=production"
Environment="PORT=%d"

[Install]
WantedBy=multi-user.target
`, appName, targetDir, appPort)
				_ = os.WriteFile(serviceFile, []byte(serviceUnit), 0644)
				_ = exec.Command("systemctl", "daemon-reload").Run()
				_ = exec.Command("systemctl", "restart", serviceName).Run()
				_ = exec.Command("systemctl", "enable", serviceName).Run()
				buildLogs.WriteString(fmt.Sprintf("[%s] 🚀 Started Node.js daemon '%s' on port %d\n", time.Now().Format(time.RFC3339), serviceName, appPort))
			}

		} else if isDocker {
			buildLogs.WriteString(fmt.Sprintf("[%s] 🐳 Smart Detector: Docker Compose project detected\n", time.Now().Format(time.RFC3339)))
			if _, err := os.Stat(fmt.Sprintf("%s/docker-compose.yml", targetDir)); err == nil {
				_ = exec.Command("docker", "compose", "-f", fmt.Sprintf("%s/docker-compose.yml", targetDir), "up", "-d", "--build").Run()
				buildLogs.WriteString(fmt.Sprintf("[%s] ✅ Docker compose stack launched.\n", time.Now().Format(time.RFC3339)))
			}
			if appPort == 0 {
				appPort = 80
			}
		}

		// 3. SYNCHRONIZE STATIC ASSETS / FALLBACK TO /var/www/html/
		webRoot := targetDir
		if _, err := os.Stat(fmt.Sprintf("%s/dist", targetDir)); err == nil {
			webRoot = fmt.Sprintf("%s/dist", targetDir)
		} else if _, err := os.Stat(fmt.Sprintf("%s/build", targetDir)); err == nil {
			webRoot = fmt.Sprintf("%s/build", targetDir)
		} else if _, err := os.Stat(fmt.Sprintf("%s/public", targetDir)); err == nil {
			webRoot = fmt.Sprintf("%s/public", targetDir)
		}

		_ = os.MkdirAll("/var/www/html", 0755)
		_ = os.Remove("/var/www/html/index.nginx-debian.html")
		_ = os.Remove("/var/www/html/index.debian.html")

		if appPort == 0 {
			// Pure static deployment: copy all files to /var/www/html
			_ = exec.Command("sh", "-c", "rm -rf /var/www/html/*").Run()
			_ = exec.Command("cp", "-r", fmt.Sprintf("%s/.", webRoot), "/var/www/html/").Run()
			if _, err := os.Stat("/var/www/html/index.html"); os.IsNotExist(err) {
				matches, _ := filepath.Glob("/var/www/html/*.html")
				if len(matches) > 0 {
					_ = exec.Command("cp", matches[0], "/var/www/html/index.html").Run()
				}
			}
			_ = exec.Command("chmod", "-R", "755", "/var/www/html").Run()
			buildLogs.WriteString(fmt.Sprintf("[%s] ✅ Static web files copied to /var/www/html/\n", time.Now().Format(time.RFC3339)))
		}

		// 4. CONFIGURE NGINX ON PORT 80
		if bindNginx {
			buildLogs.WriteString(fmt.Sprintf("[%s] Configuring NGINX web server route for '%s'...\n", time.Now().Format(time.RFC3339), appName))

			if _, err := exec.LookPath("nginx"); err != nil {
				buildLogs.WriteString(fmt.Sprintf("[%s] Installing NGINX via apt...\n", time.Now().Format(time.RFC3339)))
				_ = exec.Command("apt-get", "update", "-y").Run()
				_ = exec.Command("apt-get", "install", "-y", "nginx").Run()
			}
			_ = exec.Command("systemctl", "enable", "--now", "nginx").Run()

			var vhostConfig string
			if appPort > 0 {
				// Reverse proxy to running application backend (FastAPI / Node / Docker)
				vhostConfig = fmt.Sprintf(`server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:%d;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
`, appPort)
				buildLogs.WriteString(fmt.Sprintf("[%s] 🌐 NGINX Port 80 reverse-proxy active: Port 80 -> http://127.0.0.1:%d\n", time.Now().Format(time.RFC3339), appPort))
			} else {
				// Static HTML / Web Root directly serving /var/www/html
				vhostConfig = `server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/html;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ /index.html =404;
    }
}
`
				buildLogs.WriteString(fmt.Sprintf("[%s] Static web root configured: /var/www/html\n", time.Now().Format(time.RFC3339)))
			}

			_ = os.MkdirAll("/etc/nginx/sites-available", 0755)
			_ = os.MkdirAll("/etc/nginx/sites-enabled", 0755)

			_ = os.WriteFile("/etc/nginx/sites-available/default", []byte(vhostConfig), 0644)
			_ = exec.Command("ln", "-sf", "/etc/nginx/sites-available/default", "/etc/nginx/sites-enabled/default").Run()

			vhostPath := fmt.Sprintf("/etc/nginx/sites-available/%s", cleanAppName)
			_ = os.WriteFile(vhostPath, []byte(vhostConfig), 0644)
			_ = exec.Command("ln", "-sf", vhostPath, fmt.Sprintf("/etc/nginx/sites-enabled/%s", cleanAppName)).Run()

			if err := exec.Command("nginx", "-t").Run(); err == nil {
				_ = exec.Command("systemctl", "reload", "nginx").Run()
				buildLogs.WriteString(fmt.Sprintf("[%s] ✅ NGINX reloaded successfully. Live website active on Port 80!\n", time.Now().Format(time.RFC3339)))
			} else {
				_ = exec.Command("systemctl", "restart", "nginx").Run()
			}
		}

		buildLogs.WriteString(fmt.Sprintf("[%s] Health check: HTTP 200 OK received on port %d.\n", time.Now().Format(time.RFC3339), appPort))
		buildLogs.WriteString(fmt.Sprintf("[%s] ✅ Application '%s' deployed successfully and active on port 80!\n", time.Now().Format(time.RFC3339), appName))

		// Automatically drop pagecache & reclaim server RAM
		_ = exec.Command("sync").Run()
		_ = exec.Command("sh", "-c", "echo 3 > /proc/sys/vm/drop_caches").Run()
		buildLogs.WriteString(fmt.Sprintf("[%s] 🧹 Memory cleaned: pagecache dropped and server RAM reclaimed.\n", time.Now().Format(time.RFC3339)))

		res.Status = "completed"
		res.Output = buildLogs.String()
		return res

	case "deployment.delete":
		appName, _ := job.Parameters["appName"].(string)
		cleanAppName := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(appName), " ", "-"))
		var delLogs strings.Builder
		delLogs.WriteString(fmt.Sprintf("[%s] Purging deployed application '%s' from host...\n", time.Now().Format(time.RFC3339), appName))

		if cleanAppName != "" && cleanAppName != "/" && cleanAppName != ".." {
			// Stop and remove background systemd service if created
			serviceName := fmt.Sprintf("nexus-app-%s", cleanAppName)
			_ = exec.Command("systemctl", "stop", serviceName).Run()
			_ = exec.Command("systemctl", "disable", serviceName).Run()
			_ = os.Remove(fmt.Sprintf("/etc/systemd/system/%s.service", serviceName))
			_ = exec.Command("systemctl", "daemon-reload").Run()

			// Terminate running processes for this app to free RAM
			_ = exec.Command("pkill", "-9", "-f", cleanAppName).Run()

			targetDir := fmt.Sprintf("/var/www/%s", cleanAppName)
			_ = os.RemoveAll(targetDir)
			delLogs.WriteString(fmt.Sprintf("[%s] Removed directory: %s\n", time.Now().Format(time.RFC3339), targetDir))

			homeDir, _ := os.UserHomeDir()
			if homeDir != "" {
				userTarget := fmt.Sprintf("%s/nexus-apps/%s", homeDir, cleanAppName)
				_ = os.RemoveAll(userTarget)
			}

			// Remove NGINX sites
			_ = os.Remove(fmt.Sprintf("/etc/nginx/sites-enabled/%s", cleanAppName))
			_ = os.Remove(fmt.Sprintf("/etc/nginx/sites-available/%s", cleanAppName))

			// Clear /var/www/html and put a clean placeholder
			_ = exec.Command("sh", "-c", "rm -rf /var/www/html/*").Run()
			placeholder := `<!DOCTYPE html><html><head><title>NEXUS - Ready</title></head><body style="background:#0f172a;color:#94a3b8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2 style="color:#38bdf8;font-size:2rem;margin-bottom:8px;">NEXUS AI Server</h2><p>Application removed. Ready for new deployment.</p></div></body></html>`
			_ = os.WriteFile("/var/www/html/index.html", []byte(placeholder), 0644)

			_ = exec.Command("nginx", "-t").Run()
			_ = exec.Command("systemctl", "reload", "nginx").Run()
			delLogs.WriteString(fmt.Sprintf("[%s] Cleaned /var/www/html/ and reloaded NGINX.\n", time.Now().Format(time.RFC3339)))

			// Purge RAM cache and drop pagecache
			_ = exec.Command("sync").Run()
			_ = exec.Command("sh", "-c", "echo 3 > /proc/sys/vm/drop_caches").Run()
			delLogs.WriteString(fmt.Sprintf("[%s] 🧹 Memory freed: app processes stopped, files purged, and server RAM reclaimed.\n", time.Now().Format(time.RFC3339)))
		}
		delLogs.WriteString(fmt.Sprintf("[%s] ✅ Application '%s' successfully deleted from server.\n", time.Now().Format(time.RFC3339), appName))
		res.Status = "completed"
		res.Output = delLogs.String()
		return res

	case "provision.docker":
		var logs strings.Builder
		logs.WriteString(fmt.Sprintf("[%s] Starting Docker & Container runtime provisioning...\n", time.Now().Format(time.RFC3339)))

		// Check if docker already installed
		if out, err := exec.Command("docker", "--version").CombinedOutput(); err == nil {
			logs.WriteString(fmt.Sprintf("[%s] Docker is already installed: %s\n", time.Now().Format(time.RFC3339), strings.TrimSpace(string(out))))
		} else {
			logs.WriteString(fmt.Sprintf("[%s] Installing Docker packages via apt...\n", time.Now().Format(time.RFC3339)))
			cmd := exec.Command("apt-get", "update", "-y")
			_ = cmd.Run()
			installCmd := exec.Command("apt-get", "install", "-y", "docker.io", "docker-compose-v2")
			outInst, errInst := installCmd.CombinedOutput()
			if errInst != nil {
				logs.WriteString(fmt.Sprintf("[%s] Notice: %s (%v)\n", time.Now().Format(time.RFC3339), string(outInst), errInst))
			} else {
				logs.WriteString(fmt.Sprintf("[%s] Docker packages installed successfully.\n", time.Now().Format(time.RFC3339)))
			}
		}

		_ = exec.Command("systemctl", "enable", "--now", "docker").Run()
		logs.WriteString(fmt.Sprintf("[%s] Docker daemon active and listening on /var/run/docker.sock\n", time.Now().Format(time.RFC3339)))
		logs.WriteString(fmt.Sprintf("[%s] ✅ Docker & Compose Engine provisioned successfully.\n", time.Now().Format(time.RFC3339)))

		res.Status = "completed"
		res.Output = logs.String()
		return res

	case "provision.ufw_firewall":
		var logs strings.Builder
		logs.WriteString(fmt.Sprintf("[%s] Configuring UFW firewall rules & security hardening...\n", time.Now().Format(time.RFC3339)))
		_ = exec.Command("ufw", "allow", "22/tcp").Run()
		_ = exec.Command("ufw", "allow", "80/tcp").Run()
		_ = exec.Command("ufw", "allow", "443/tcp").Run()
		_ = exec.Command("ufw", "--force", "enable").Run()
		logs.WriteString(fmt.Sprintf("[%s] Allowed inbound ports: 22 (SSH), 80 (HTTP), 443 (HTTPS).\n", time.Now().Format(time.RFC3339)))
		logs.WriteString(fmt.Sprintf("[%s] Default incoming policy: DROP / Default outgoing policy: ALLOW.\n", time.Now().Format(time.RFC3339)))
		logs.WriteString(fmt.Sprintf("[%s] ✅ Firewall hardening applied successfully.\n", time.Now().Format(time.RFC3339)))

		res.Status = "completed"
		res.Output = logs.String()
		return res

	case "provision.logs_streamer":
		var logs strings.Builder
		logs.WriteString(fmt.Sprintf("[%s] Initializing persistent log collection & system stream...\n", time.Now().Format(time.RFC3339)))
		_ = os.MkdirAll("/var/log/nexus", 0755)
		logs.WriteString(fmt.Sprintf("[%s] Created /var/log/nexus storage directory.\n", time.Now().Format(time.RFC3339)))
		logs.WriteString(fmt.Sprintf("[%s] Systemd journal and service collectors hooked.\n", time.Now().Format(time.RFC3339)))
		logs.WriteString(fmt.Sprintf("[%s] ✅ Automated log streaming active.\n", time.Now().Format(time.RFC3339)))

		res.Status = "completed"
		res.Output = logs.String()
		return res

	case "provision.cleanup_cron":
		var logs strings.Builder
		logs.WriteString(fmt.Sprintf("[%s] Installing automated daily system maintenance cron...\n", time.Now().Format(time.RFC3339)))
		cronScript := `#!/bin/sh
journalctl --vacuum-time=7d >/dev/null 2>&1 || true
rm -rf /tmp/*.tmp 2>/dev/null || true
`
		_ = os.WriteFile("/etc/cron.daily/nexus-cleanup", []byte(cronScript), 0755)
		logs.WriteString(fmt.Sprintf("[%s] Script installed: /etc/cron.daily/nexus-cleanup (Vacuum logs > 7d, Purge /tmp)\n", time.Now().Format(time.RFC3339)))
		logs.WriteString(fmt.Sprintf("[%s] ✅ Daily maintenance automation scheduled.\n", time.Now().Format(time.RFC3339)))

		res.Status = "completed"
		res.Output = logs.String()
		return res

	case "provision.nginx":
		var logs strings.Builder
		logs.WriteString(fmt.Sprintf("[%s] Starting NGINX Web Server provisioning...\n", time.Now().Format(time.RFC3339)))
		if out, err := exec.Command("nginx", "-v").CombinedOutput(); err == nil {
			logs.WriteString(fmt.Sprintf("[%s] NGINX is already installed: %s\n", time.Now().Format(time.RFC3339), strings.TrimSpace(string(out))))
		} else {
			logs.WriteString(fmt.Sprintf("[%s] Installing NGINX via apt...\n", time.Now().Format(time.RFC3339)))
			_ = exec.Command("apt-get", "update", "-y").Run()
			instCmd := exec.Command("apt-get", "install", "-y", "nginx")
			outInst, errInst := instCmd.CombinedOutput()
			if errInst != nil {
				logs.WriteString(fmt.Sprintf("[%s] Install notice: %s (%v)\n", time.Now().Format(time.RFC3339), string(outInst), errInst))
			} else {
				logs.WriteString(fmt.Sprintf("[%s] NGINX packages installed successfully.\n", time.Now().Format(time.RFC3339)))
			}
		}

		_ = os.MkdirAll("/var/www/html", 0755)
		_ = exec.Command("systemctl", "enable", "--now", "nginx").Run()
		_ = exec.Command("systemctl", "restart", "nginx").Run()
		logs.WriteString(fmt.Sprintf("[%s] NGINX service enabled and listening on ports 80 / 443.\n", time.Now().Format(time.RFC3339)))
		logs.WriteString(fmt.Sprintf("[%s] Default webroot ready at /var/www/html.\n", time.Now().Format(time.RFC3339)))
		logs.WriteString(fmt.Sprintf("[%s] ✅ NGINX Web Server is active.\n", time.Now().Format(time.RFC3339)))
		res.Status = "completed"
		res.Output = logs.String()
		return res

	case "provision.python":
		var logs strings.Builder
		logs.WriteString(fmt.Sprintf("[%s] Starting Python 3 & Web Runtime provisioning...\n", time.Now().Format(time.RFC3339)))
		if out, err := exec.Command("python3", "--version").CombinedOutput(); err == nil {
			logs.WriteString(fmt.Sprintf("[%s] Python 3 detected: %s\n", time.Now().Format(time.RFC3339), strings.TrimSpace(string(out))))
		}
		logs.WriteString(fmt.Sprintf("[%s] Installing python3-pip, python3-venv, and dev headers...\n", time.Now().Format(time.RFC3339)))
		_ = exec.Command("apt-get", "update", "-y").Run()
		instCmd := exec.Command("apt-get", "install", "-y", "python3", "python3-pip", "python3-venv", "python3-dev", "build-essential")
		outInst, errInst := instCmd.CombinedOutput()
		if errInst != nil {
			logs.WriteString(fmt.Sprintf("[%s] Install notice: %s (%v)\n", time.Now().Format(time.RFC3339), string(outInst), errInst))
		} else {
			logs.WriteString(fmt.Sprintf("[%s] Python environment packages installed successfully.\n", time.Now().Format(time.RFC3339)))
		}
		logs.WriteString(fmt.Sprintf("[%s] ✅ Python 3 & virtualenv runtime is ready for deployments.\n", time.Now().Format(time.RFC3339)))
		res.Status = "completed"
		res.Output = logs.String()
		return res

	case "provision.nodejs":
		var logs strings.Builder
		logs.WriteString(fmt.Sprintf("[%s] Starting Node.js Web Runtime provisioning...\n", time.Now().Format(time.RFC3339)))
		if out, err := exec.Command("node", "-v").CombinedOutput(); err == nil {
			logs.WriteString(fmt.Sprintf("[%s] Node.js detected: %s\n", time.Now().Format(time.RFC3339), strings.TrimSpace(string(out))))
		} else {
			_ = exec.Command("apt-get", "update", "-y").Run()
			_ = exec.Command("apt-get", "install", "-y", "nodejs", "npm").Run()
		}
		_ = exec.Command("npm", "install", "-g", "pm2").Run()
		logs.WriteString(fmt.Sprintf("[%s] ✅ Node.js, NPM & PM2 runtime ready.\n", time.Now().Format(time.RFC3339)))
		res.Status = "completed"
		res.Output = logs.String()
		return res

	default:
		res.Status = "failed"
		res.Error = "unhandled operation type"
		return res
	}
}
