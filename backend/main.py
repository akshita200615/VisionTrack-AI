
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List

app = FastAPI(
    title="VisionTrack AI",
    description="Intelligent Traffic Monitoring System API",
    version="1.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Vehicle statistics
vehicle_data = {
    "car": 0,
    "motorcycle": 0,
    "bus": 0,
    "truck": 0,
    "total_vehicles": 0,
    "traffic_status": "LOW TRAFFIC"
}

# Configurable demo speed limit
SPEED_LIMIT_KMH = 40

# Current overspeed alerts
speed_alerts = []


class VehicleStats(BaseModel):
    car: int
    motorcycle: int
    bus: int
    truck: int
    total_vehicles: int
    traffic_status: str


class SpeedAlert(BaseModel):
    vehicle_type: str
    track_id: int
    speed_kmh: float
    speed_limit_kmh: float = SPEED_LIMIT_KMH


class SpeedAlertUpdate(BaseModel):
    alerts: List[SpeedAlert] = Field(default_factory=list)


class SpeedLimitUpdate(BaseModel):
    speed_limit_kmh: int = Field(ge=10, le=120)


@app.get("/")
def home():
    return {
        "message": "Welcome to VisionTrack AI",
        "status": "Backend is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "project": "VisionTrack AI"
    }


@app.get("/stats")
def get_vehicle_statistics():
    return vehicle_data


@app.get("/traffic-status")
def get_traffic_status():
    return {
        "traffic_status": vehicle_data["traffic_status"],
        "total_vehicles": vehicle_data["total_vehicles"]
    }


@app.post("/update-stats")
def update_statistics(data: VehicleStats):
    vehicle_data.update(data.model_dump())

    return {
        "message": "Vehicle statistics updated successfully",
        "data": vehicle_data
    }


# Update the speed limit
@app.post("/update-speed-limit")
def update_speed_limit(data: SpeedLimitUpdate):
    global SPEED_LIMIT_KMH

    SPEED_LIMIT_KMH = data.speed_limit_kmh

    # Re-evaluate existing alerts using the new limit
    global speed_alerts

    speed_alerts = [
        alert for alert in speed_alerts
        if alert["speed_kmh"] > SPEED_LIMIT_KMH
    ]

    for alert in speed_alerts:
        alert["speed_limit_kmh"] = SPEED_LIMIT_KMH

    return {
        "message": "Speed limit updated successfully",
        "speed_limit_kmh": SPEED_LIMIT_KMH
    }


# Receive overspeed alerts from tracker
@app.post("/update-speed-alerts")
def update_speed_alerts(data: SpeedAlertUpdate):
    global speed_alerts

    speed_alerts = [
        {
            **alert.model_dump(),
            "speed_limit_kmh": SPEED_LIMIT_KMH
        }
        for alert in data.alerts
        if alert.speed_kmh > SPEED_LIMIT_KMH
    ]

    return {
        "message": "Speed alerts updated successfully",
        "alert_count": len(speed_alerts),
        "alerts": speed_alerts
    }


# Get current speed limit and alerts
@app.get("/speed-alerts")
def get_speed_alerts():
    return {
        "speed_limit_kmh": SPEED_LIMIT_KMH,
        "alert_count": len(speed_alerts),
        "alerts": speed_alerts
    }
