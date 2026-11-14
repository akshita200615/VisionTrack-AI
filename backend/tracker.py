from ultralytics import YOLO
import cv2
import json
import urllib.request
import urllib.error
import math
import time

# ---------------- CONFIGURATION ----------------

MODEL_PATH = "yolo11n.pt"
VIDEO_PATH = "../datasets/traffic.mp4"
OUTPUT_PATH = "../outputs/tracked_traffic.mp4"

API_STATS_URL = "http://127.0.0.1:8000/update-stats"
API_SPEED_URL = "http://127.0.0.1:8000/update-speed-alerts"
API_SPEED_LIMIT_URL = "http://127.0.0.1:8000/speed-alerts"

# Default speed limit if backend is temporarily unavailable
SPEED_LIMIT_KMH = 40

# Fetch updated speed limit every 30 frames
SPEED_LIMIT_REFRESH_INTERVAL = 30

# DEMO conversion only.
# Replace this with a calibrated meters-per-pixel value
# before treating estimated speeds as real-world speeds.
METERS_PER_PIXEL = 0.05

UPDATE_INTERVAL = 10

CLASS_NAMES = {
    2: "Car",
    3: "Motorcycle",
    5: "Bus",
    7: "Truck"
}

# ---------------- LOAD MODEL ----------------

model = YOLO(MODEL_PATH)

cap = cv2.VideoCapture(VIDEO_PATH)

if not cap.isOpened():
    print("Error: Cannot open traffic video!")
    raise SystemExit

fps = cap.get(cv2.CAP_PROP_FPS)

if fps <= 0:
    fps = 25

width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

fourcc = cv2.VideoWriter_fourcc(*"mp4v")

out = cv2.VideoWriter(
    OUTPUT_PATH,
    fourcc,
    fps,
    (width, height)
)

if not out.isOpened():
    print("Error: Cannot create output video!")
    cap.release()
    raise SystemExit

# ---------------- VEHICLE TRACKING ----------------

vehicle_ids = {
    "Car": set(),
    "Motorcycle": set(),
    "Bus": set(),
    "Truck": set()
}

# Store previous position and estimated speed for each tracking ID
vehicle_history = {}

# Current overspeed alerts
current_alerts = {}

frame_count = 0

# ---------------- TRAFFIC STATUS ----------------

def get_traffic_status(total):

    if total <= 5:
        return "LOW TRAFFIC", (0, 255, 0)

    elif total <= 15:
        return "MEDIUM TRAFFIC", (0, 255, 255)

    else:
        return "HIGH TRAFFIC", (0, 0, 255)


# ---------------- PREPARE STATISTICS ----------------

def prepare_statistics():

    car = len(vehicle_ids["Car"])
    motorcycle = len(vehicle_ids["Motorcycle"])
    bus = len(vehicle_ids["Bus"])
    truck = len(vehicle_ids["Truck"])

    total = car + motorcycle + bus + truck

    status, _ = get_traffic_status(total)

    return {
        "car": car,
        "motorcycle": motorcycle,
        "bus": bus,
        "truck": truck,
        "total_vehicles": total,
        "traffic_status": status
    }


# ---------------- SEND API REQUEST ----------------

def send_api_data(url, data):

    try:
        payload = json.dumps(data).encode("utf-8")

        request = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        with urllib.request.urlopen(request, timeout=3) as response:
            print("API update:", response.status)

    except Exception as error:
        print("API update failed:", error)


# ---------------- FETCH DYNAMIC SPEED LIMIT ----------------

def fetch_speed_limit():

    global SPEED_LIMIT_KMH

    try:
        request = urllib.request.Request(
            API_SPEED_LIMIT_URL,
            headers={"Accept": "application/json"},
            method="GET"
        )

        with urllib.request.urlopen(request, timeout=2) as response:

            data = json.loads(response.read().decode("utf-8"))

            new_limit = int(data.get("speed_limit_kmh", SPEED_LIMIT_KMH))

            if 10 <= new_limit <= 120:

                if new_limit != SPEED_LIMIT_KMH:

                    SPEED_LIMIT_KMH = new_limit

                    print(
                        "\nSpeed limit updated from dashboard:",
                        SPEED_LIMIT_KMH,
                        "km/h"
                    )

    except Exception as error:

        print("Unable to fetch latest speed limit:", error)

    return SPEED_LIMIT_KMH


# ---------------- SPEED ESTIMATION ----------------

def estimate_speed(track_id, center, class_name):

    current_time = frame_count / fps

    if track_id not in vehicle_history:

        vehicle_history[track_id] = {
            "center": center,
            "time": current_time,
            "speed": 0.0,
            "class_name": class_name
        }

        return 0.0

    previous = vehicle_history[track_id]

    previous_center = previous["center"]
    previous_time = previous["time"]

    elapsed_time = current_time - previous_time

    if elapsed_time <= 0:
        return previous["speed"]

    pixel_distance = math.sqrt(
        (center[0] - previous_center[0]) ** 2
        + (center[1] - previous_center[1]) ** 2
    )

    distance_meters = pixel_distance * METERS_PER_PIXEL

    speed_kmh = (
        distance_meters / elapsed_time
    ) * 3.6

    # Smooth the estimated speed to reduce sudden changes
    smoothed_speed = (
        0.7 * previous["speed"] +
        0.3 * speed_kmh
    )

    vehicle_history[track_id] = {
        "center": center,
        "time": current_time,
        "speed": smoothed_speed,
        "class_name": class_name
    }

    return smoothed_speed


# ---------------- MAIN TRACKING LOOP ----------------

print("\nVisionTrack AI started...")
print("Vehicle tracking and demo speed estimation started.")

# Get the current speed limit before processing the video
fetch_speed_limit()

print("Current speed limit:", SPEED_LIMIT_KMH, "km/h")

try:

    while True:

        ret, frame = cap.read()

        if not ret:
            break

        frame_count += 1

        # Fetch the latest speed limit periodically
        if frame_count % SPEED_LIMIT_REFRESH_INTERVAL == 0:
            fetch_speed_limit()

        results = model.track(
            frame,
            persist=True,
            tracker="bytetrack.yaml",
            classes=[2, 3, 5, 7],
            conf=0.4,
            verbose=False
        )

        result = results[0]

        # Clear current frame alerts.
        # Alerts are rebuilt from vehicles detected in this frame.
        current_alerts = {}

        # Track vehicle positions and estimate speed
        if (
            result.boxes is not None
            and result.boxes.id is not None
        ):

            boxes = result.boxes

            track_ids = boxes.id.cpu().tolist()
            classes = boxes.cls.cpu().tolist()
            coordinates = boxes.xyxy.cpu().tolist()

            for track_id, class_id, box in zip(
                track_ids, classes, coordinates
            ):

                track_id = int(track_id)
                class_id = int(class_id)

                class_name = CLASS_NAMES.get(class_id)

                if class_name is None:
                    continue

                vehicle_ids[class_name].add(track_id)

                x1, y1, x2, y2 = box

                center = (
                    int((x1 + x2) / 2),
                    int((y1 + y2) / 2)
                )

                speed = estimate_speed(
                    track_id,
                    center,
                    class_name
                )

                # Check overspeed condition using latest backend limit
                if speed > SPEED_LIMIT_KMH:

                    current_alerts[track_id] = {
                        "vehicle_type": class_name,
                        "track_id": track_id,
                        "speed_kmh": round(speed, 2),
                        "speed_limit_kmh": SPEED_LIMIT_KMH
                    }

        # ---------------- DRAW DETECTIONS ----------------

        annotated_frame = result.plot()

        # Draw estimated speed labels and overspeed warning
        if (
            result.boxes is not None
            and result.boxes.id is not None
        ):

            track_ids = result.boxes.id.cpu().tolist()
            coordinates = result.boxes.xyxy.cpu().tolist()

            for track_id, box in zip(track_ids, coordinates):

                track_id = int(track_id)

                if track_id not in vehicle_history:
                    continue

                x1, y1, x2, y2 = map(int, box)

                speed = vehicle_history[track_id]["speed"]

                color = (
                    (0, 0, 255)
                    if track_id in current_alerts
                    else (255, 255, 0)
                )

                cv2.putText(
                    annotated_frame,
                    f"{speed:.1f} km/h",
                    (x1, max(y1 - 10, 20)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    color,
                    2
                )

        # ---------------- VEHICLE COUNTS ----------------

        data = prepare_statistics()

        total = data["total_vehicles"]

        traffic_status, traffic_color = get_traffic_status(total)

        y = 35

        for name, ids in vehicle_ids.items():

            cv2.putText(
                annotated_frame,
                f"{name}: {len(ids)}",
                (20, y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 255, 0),
                2
            )

            y += 35

        cv2.putText(
            annotated_frame,
            f"Total Vehicles: {total}",
            (20, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 0, 255),
            2
        )

        cv2.putText(
            annotated_frame,
            f"Traffic Status: {traffic_status}",
            (20, y + 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            traffic_color,
            2
        )

        # Display the latest dashboard speed limit
        cv2.putText(
            annotated_frame,
            f"DEMO SPEED LIMIT: {SPEED_LIMIT_KMH} km/h",
            (20, y + 80),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 255, 0),
            2
        )

        # ---------------- OVERSPEED WARNING ----------------

        if current_alerts:

            warning_text = (
                f"OVERSPEED ALERT! "
                f"{len(current_alerts)} vehicle(s)"
            )

            cv2.rectangle(
                annotated_frame,
                (10, y + 100),
                (width - 10, y + 145),
                (0, 0, 255),
                -1
            )

            cv2.putText(
                annotated_frame,
                warning_text,
                (20, y + 132),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (255, 255, 255),
                2
            )

        # ---------------- SAVE VIDEO ----------------

        out.write(annotated_frame)

        # ---------------- DISPLAY VIDEO ----------------

        cv2.imshow(
            "VisionTrack AI - Traffic Monitoring",
            annotated_frame
        )

        # ---------------- SEND LIVE API UPDATES ----------------

        if frame_count % UPDATE_INTERVAL == 0:

            send_api_data(API_STATS_URL, data)

            send_api_data(
                API_SPEED_URL,
                {
                    "alerts": list(current_alerts.values())
                }
            )

        if cv2.waitKey(1) & 0xFF == ord("q"):

            print("Tracking stopped by user.")
            break

finally:

    cap.release()
    out.release()
    cv2.destroyAllWindows()


# ---------------- FINAL UPDATES ----------------

final_data = prepare_statistics()

print("\n===== FINAL VEHICLE STATISTICS =====")
print(json.dumps(final_data, indent=4))

send_api_data(API_STATS_URL, final_data)

send_api_data(
    API_SPEED_URL,
    {
        "alerts": list(current_alerts.values())
    }
)

print("\n===== FINAL SPEED ALERTS =====")
print(json.dumps(list(current_alerts.values()), indent=4))

print("\nFinal speed limit:", SPEED_LIMIT_KMH, "km/h")

print("\nProcessed video saved:", OUTPUT_PATH)
print("VisionTrack AI tracking completed.")