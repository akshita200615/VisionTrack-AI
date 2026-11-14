# VisionTrack AI – Intelligent Traffic Monitoring System

An AI-powered traffic monitoring system that detects, tracks, and analyzes vehicles from video footage. It provides live traffic statistics, overspeed alerts, and an interactive analytics dashboard.

## Project Overview

VisionTrack AI combines computer vision, object detection, vehicle tracking, and web technologies to monitor road traffic and present useful traffic insights.

## Key Features

- **Vehicle Detection:** Detects cars, motorcycles, buses, and trucks using YOLO.
- **Vehicle Tracking:** Tracks detected vehicles and maintains unique vehicle counts.
- **Traffic Classification:** Categorizes traffic as low, medium, or high based on detected vehicle counts.
- **Speed Estimation:** Estimates vehicle speed from movement across video frames.
- **Overspeed Detection:** Identifies vehicles exceeding the configured speed limit.
- **Dynamic Speed Limit:** Allows users to change the speed threshold through the dashboard.
- **Live Dashboard:** Displays vehicle statistics and traffic analytics.
- **Data Visualization:** Provides charts and vehicle statistics.
- **CSV Reports:** Exports traffic monitoring data.

## Technology Stack

| Component | Technology |
|---|---|
| Programming Language | Python |
| Object Detection | YOLO |
| Computer Vision | OpenCV |
| Backend | FastAPI |
| Frontend | React.js |
| Build Tool | Vite |
| Data Visualization | Recharts |
| API Communication | REST API |
| Version Control | Git and GitHub |

## System Architecture

```text
Traffic Video
     |
     v
YOLO Vehicle Detection
     |
     v
Vehicle Tracking
     |
     v
Speed Estimation and Traffic Analysis
     |
     v
FastAPI Backend
     |
     v
React Dashboard
     |
     v
Traffic Analytics and Overspeed Alerts
```

## Project Structure

```text
VisionTrack-AI/
│
├── backend/
│   ├── models/
│   ├── utils/
│   ├── app.py
│   ├── detector.py
│   ├── main.py
│   ├── requirements.txt
│   └── tracker.py
│
├── datasets/
│   └── traffic.png
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
├── outputs/
└── .gitignore
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/akshita200615/VisionTrack-AI.git
cd VisionTrack-AI
```

### 2. Set up the Python environment

```bash
python -m venv venv
```

Activate on Windows:

```bash
venv\Scripts\activate
```

### 3. Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Start the FastAPI backend

```bash
python -m uvicorn main:app --reload
```

Backend API:

`http://127.0.0.1:8000`

API documentation:

`http://127.0.0.1:8000/docs`

### 5. Start the React frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

`http://localhost:5173`

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Backend welcome message |
| GET | `/health` | API health check |
| GET | `/stats` | Vehicle statistics |
| GET | `/traffic-status` | Traffic classification |
| POST | `/update-stats` | Update vehicle statistics |
| GET | `/speed-alerts` | Retrieve overspeed alerts |
| POST | `/update-speed-alerts` | Update overspeed alerts |
| POST | `/update-speed-limit` | Configure speed threshold |

## Important Note

Vehicle speed is currently estimated using object movement across video frames and an assumed pixel-to-meter conversion factor. Accurate real-world speed measurement requires camera calibration and perspective correction.

## Future Enhancements

- Live CCTV camera integration
- Traffic signal optimization
- Number plate recognition
- Accident detection
- Database integration for historical traffic records
- Deployment to a cloud platform

## Author

**Akshita Neha**

B.Tech – Computer Science and Engineering

GitHub: [akshita200615](https://github.com/akshita200615)

---

*VisionTrack AI – Smarter Traffic Monitoring Through Artificial Intelligence.*