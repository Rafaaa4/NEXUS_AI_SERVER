from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

class LogItem(BaseModel):
    timestamp: str
    level: str
    source: str
    message: str

class MetricsContext(BaseModel):
    cpu_usage_percent: float = 0.0
    memory_usage_percent: float = 0.0
    disk_usage_percent: float = 0.0
    load_average: List[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0])
    services: List[Dict[str, Any]] = Field(default_factory=list)

class AnalysisRequest(BaseModel):
    incident_id: str
    server_id: str
    title: str
    description: Optional[str] = None
    severity: Literal["low", "medium", "high", "critical"] = "medium"
    metrics: Optional[MetricsContext] = None
    redacted_logs: List[LogItem] = Field(default_factory=list)

class ActionProposalRecommendation(BaseModel):
    action_type: str
    parameters: Dict[str, Any]
    risk_level: Literal["low", "medium", "high", "critical"]
    requires_approval: bool = True

class AnalysisResponse(BaseModel):
    incident_id: str
    model_name: str = "nexus-devops-llm-v1"
    summary: str
    root_cause_hypotheses: List[Dict[str, Any]]
    confidence: float
    recommendations: List[str]
    proposed_action: ActionProposalRecommendation
