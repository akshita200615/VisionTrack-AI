
from ultralytics import YOLO
import cv2
from collections import Counter

model = YOLO("yolo11n.pt")

vehicle_classes = {
    2: "Car",
    3: "Motorcycle",
    5: "Bus",
    7: "Truck"
}

def detect_vehicles(image_path):
    image = cv2.imread(image_path)

    if image is None:
        print("Error: Image not found!")
        return

    results = model(image)
    counts = Counter()

    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0])

            if class_id in vehicle_classes:
                label = vehicle_classes[class_id]
                counts[label] += 1

                x1, y1, x2, y2 = map(int, box.xyxy[0])

                cv2.rectangle(
                    image, (x1, y1), (x2, y2),
                    (0, 255, 0), 2
                )

                cv2.putText(
                    image, label, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                    (0, 255, 0), 2
                )

    total = sum(counts.values())

    cv2.putText(
        image, f"Total Vehicles: {total}",
        (20, 40), cv2.FONT_HERSHEY_SIMPLEX,
        1, (0, 0, 255), 2
    )

    cv2.imwrite("../outputs/detected_vehicles.jpg", image)

    print("\n----- VEHICLE COUNT REPORT -----")
    for vehicle, count in counts.items():
        print(f"{vehicle}: {count}")

    print(f"Total Vehicles: {total}")
    print("Detection and counting completed!")

if __name__ == "__main__":
    detect_vehicles("../datasets/traffic.png")
