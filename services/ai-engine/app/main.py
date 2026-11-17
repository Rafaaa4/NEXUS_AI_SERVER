from fastapi import FastAPI, HTTPException
from app.schemas import AnalysisRequest, AnalysisResponse, ActionProposalRecommendation

app = FastAPI(title="NEXUS AI Diagnostic Engine", version="1.0.0")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "nexus-ai-engine"}

@app.post("/analyze", response_model=AnalysisResponse)
def analyze_incident(req: AnalysisRequest):
    title_lower = req.title.lower()
    
    # 1. Diagnostic Inference Pipeline
    if "service" in title_lower and "down" in title_lower:
        svc_name = "nginx"
        if "[" in req.title and "]" in req.title:
            svc_name = req.title.split("[")[1].split("]")[0]
            
        return AnalysisResponse(
            incident_id=req.incident_id,
            summary=f"Critical service [{svc_name}] unexpected downtime detected.",
            root_cause_hypotheses=[
                {
                    "hypothesis": f"Service '{svc_name}' crashed or terminated unexpectedly.",
                    "confidence": 0.92,
                    "evidence": [req.title, f"{len(req.redacted_logs)} correlated system logs"]
                }
            ],
            confidence=0.92,
            recommendations=[
                f"Verify service configuration and socket status for {svc_name}.",
                f"Request authorized restart of service {svc_name}."
            ],
            proposed_action=ActionProposalRecommendation(
                action_type="service.restart",
                parameters={"serviceName": svc_name},
                risk_level="medium",
                requires_approval=True
            )
        )
    elif "disk" in title_lower:
        return AnalysisResponse(
            incident_id=req.incident_id,
            summary="Disk capacity threshold exceeded on root partition.",
            root_cause_hypotheses=[
                {
                    "hypothesis": "Systemd journals, apt caches, or application logs filling storage.",
                    "confidence": 0.88,
                    "evidence": ["Disk usage metric above critical threshold"]
                }
            ],
            confidence=0.88,
            recommendations=[
                "Vacuum systemd journal logs older than 2 days.",
                "Inspect large files in /var/log."
            ],
            proposed_action=ActionProposalRecommendation(
                action_type="disk.cleanup_cache",
                parameters={"target": "systemd-journal", "retainDays": 2},
                risk_level="medium",
                requires_approval=True
            )
        )
    elif "cpu" in title_lower:
        return AnalysisResponse(
            incident_id=req.incident_id,
            summary="Unusual CPU utilization spike detected across compute cores.",
            root_cause_hypotheses=[
                {
                    "hypothesis": "Runaway worker process or compute-heavy task monopolizing CPU cycles.",
                    "confidence": 0.84,
                    "evidence": ["Sustained CPU usage above 85%"]
                }
            ],
            confidence=0.84,
            recommendations=[
                "Inspect top CPU consuming processes.",
                "Check for rogue or zombie processes."
            ],
            proposed_action=ActionProposalRecommendation(
                action_type="system.inspect_processes",
                parameters={"target": "top_cpu", "limit": 10},
                risk_level="low",
                requires_approval=True
            )
        )
    else:
        return AnalysisResponse(
            incident_id=req.incident_id,
            summary="General server anomaly under investigation.",
            root_cause_hypotheses=[
                {
                    "hypothesis": "System telemetry signals non-critical performance variation.",
                    "confidence": 0.70,
                    "evidence": [req.title]
                }
            ],
            confidence=0.70,
            recommendations=["Monitor workload trends."],
            proposed_action=ActionProposalRecommendation(
                action_type="system.inspect_processes",
                parameters={},
                risk_level="low",
                requires_approval=True
            )
        )
