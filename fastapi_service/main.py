from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict


class Observation(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    abnormalityPercentage: float
    durationMinutes: float
    severity: float


app = FastAPI(title="Observation Hazard Probability Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)


@app.post("/process-observation")
def process_observation(observation: Observation) -> dict[str, Any]:
    anomaly = max(0.0, min(1.0, observation.abnormalityPercentage / 100))
    severity = max(0.0, min(1.0, observation.severity / 5))
    duration = max(0.0, min(1.0, observation.durationMinutes / 60))
    signal = (anomaly * 0.5) + (severity * 0.35) + (duration * 0.15)

    return {
        "observationHazardProbability": {
            "Earthquake": round(signal * 0.2, 4),
            "Storm": round(signal * 0.35, 4),
            "Cyclone": round(signal * 0.2, 4),
            "Wildfire": round(signal * 0.15, 4),
            "Unclassified": round(max(0.0, 1.0 - signal), 4),
        }
    }