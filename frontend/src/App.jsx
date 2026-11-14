import { useEffect, useRef, useState } from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

import "./App.css";

function App() {
  const [stats, setStats] = useState({
    car: 0,
    motorcycle: 0,
    bus: 0,
    truck: 0,
    total_vehicles: 0,
    traffic_status: "LOW TRAFFIC",
    congestion_level: "LOW",
    congestion_indicator: 25,
  });

  const [connected, setConnected] = useState(false);
  const [trafficHistory, setTrafficHistory] = useState([]);
  const [activityLog, setActivityLog] = useState([]);

  // Overspeed alert state
  const [speedAlerts, setSpeedAlerts] = useState([]);
  const [speedLimit, setSpeedLimit] = useState(40);
  const [speedLimitInput, setSpeedLimitInput] = useState(null);
  const [savingSpeedLimit, setSavingSpeedLimit] = useState(false);
  const [speedLimitMessage, setSpeedLimitMessage] = useState("");
  const [alertCount, setAlertCount] = useState(0);
  const [speedApiConnected, setSpeedApiConnected] = useState(false);

  const previousStatsRef = useRef(null);

  // Fetch vehicle statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("https://visiontrack-ai-hykq.onrender.com");

        if (!response.ok) {
          throw new Error("API error");
        }

        const data = await response.json();

        setStats(data);
        setConnected(true);

        // Live traffic history
        setTrafficHistory((previous) => [
          ...previous.slice(-19),
          {
            time: new Date().toLocaleTimeString(),
            total: data.total_vehicles,
          },
        ]);

        // Detect increases in vehicle counts
        const previousStats = previousStatsRef.current;

        if (previousStats !== null) {
          const vehicleTypes = [
            { key: "car", name: "Cars" },
            { key: "motorcycle", name: "Motorcycles" },
            { key: "bus", name: "Buses" },
            { key: "truck", name: "Trucks" },
          ];

          const newEntries = vehicleTypes
            .map((vehicle) => {
              const increase =
                Number(data[vehicle.key] || 0) -
                Number(previousStats[vehicle.key] || 0);

              if (increase <= 0) {
                return null;
              }

              return {
                id: `${Date.now()}-${vehicle.key}`,
                time: new Date().toLocaleTimeString(),
                vehicle: vehicle.name,
                count: increase,
                total: Number(data[vehicle.key] || 0),
              };
            })
            .filter(Boolean);

          if (newEntries.length > 0) {
            setActivityLog((previous) =>
              [...newEntries, ...previous].slice(0, 20)
            );
          }
        }

        previousStatsRef.current = {
          car: Number(data.car || 0),
          motorcycle: Number(data.motorcycle || 0),
          bus: Number(data.bus || 0),
          truck: Number(data.truck || 0),
        };
      } catch (error) {
        setConnected(false);
        console.error("Unable to fetch traffic statistics:", error);
      }
    };

    fetchStats();

    const interval = setInterval(fetchStats, 2000);

    return () => clearInterval(interval);
  }, []);

  // Fetch live overspeed alerts
  useEffect(() => {
    const fetchSpeedAlerts = async () => {
      try {
        const response = await fetch(
          "https://visiontrack-ai-hykq.onrender.com"
        );

        if (!response.ok) {
          throw new Error("Speed alert API error");
        }

        const data = await response.json();

        const currentLimit = Number(data.speed_limit_kmh ?? 40);

        setSpeedLimit(currentLimit);

        setSpeedLimitInput((previous) =>
          previous === null ? currentLimit : previous
        );

        setAlertCount(Number(data.alert_count ?? 0));
        setSpeedAlerts(Array.isArray(data.alerts) ? data.alerts : []);
        setSpeedApiConnected(true);
      } catch (error) {
        setSpeedApiConnected(false);
        console.error("Unable to fetch speed alerts:", error);
      }
    };

    fetchSpeedAlerts();

    const interval = setInterval(fetchSpeedAlerts, 2000);

    return () => clearInterval(interval);
  }, []);

  // Update the speed limit through the backend API
  const updateSpeedLimit = async () => {
    const requestedLimit = Number(speedLimitInput);

    if (
      !Number.isInteger(requestedLimit) ||
      requestedLimit < 10 ||
      requestedLimit > 120
    ) {
      setSpeedLimitMessage(
        "Enter a whole number between 10 and 120 km/h."
      );
      return;
    }

    try {
      setSavingSpeedLimit(true);
      setSpeedLimitMessage("");

      const response = await fetch(
        "https://visiontrack-ai-hykq.onrender.com",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            speed_limit_kmh: requestedLimit,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to update the speed limit."
        );
      }

      setSpeedLimit(Number(data.speed_limit_kmh));
      setSpeedLimitInput(Number(data.speed_limit_kmh));

      setSpeedLimitMessage(
        "Speed limit updated successfully."
      );
    } catch (error) {
      setSpeedLimitMessage(
        error.message || "Could not connect to the backend."
      );

      console.error("Unable to update speed limit:", error);
    } finally {
      setSavingSpeedLimit(false);
    }
  };

  // Vehicle data and percentages
  const vehicleData = [
    { name: "Cars", value: Number(stats.car || 0) },
    { name: "Motorcycles", value: Number(stats.motorcycle || 0) },
    { name: "Buses", value: Number(stats.bus || 0) },
    { name: "Trucks", value: Number(stats.truck || 0) },
  ].map((vehicle) => ({
    ...vehicle,
    percentage:
      stats.total_vehicles > 0
        ? (
            (vehicle.value / stats.total_vehicles) *
            100
          ).toFixed(1)
        : "0.0",
  }));

  // Most detected vehicle
  const mostDetectedVehicle = vehicleData.reduce(
    (max, vehicle) =>
      vehicle.value > max.value ? vehicle : max,
    { name: "None", value: 0 }
  );

  // Traffic insight
  const trafficInsight =
    stats.total_vehicles === 0
      ? "No vehicles detected yet. Start the vehicle tracker."
      : `${mostDetectedVehicle.name} are the most detected vehicles, with ${mostDetectedVehicle.value} detections out of ${stats.total_vehicles} total vehicles.`;

  const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#9333ea"];

  // Congestion indicator
  const congestionColors = {
    LOW: "#16a34a",
    MEDIUM: "#f59e0b",
    HIGH: "#dc2626",
  };

  const congestionLevel = stats.congestion_level || "LOW";

  const congestionPercentage = Math.max(
    0,
    Math.min(100, Number(stats.congestion_indicator ?? 25))
  );

  const congestionColor =
    congestionColors[congestionLevel] || "#16a34a";

  // Download traffic report
  const downloadReport = () => {
    const csvRows = [
      ["VisionTrack AI - Traffic Monitoring Report"],
      ["Generated At", new Date().toLocaleString()],
      [],
      ["Vehicle Type", "Count", "Percentage", "Detection Status"],
      ...vehicleData.map((vehicle) => [
        vehicle.name,
        vehicle.value,
        `${vehicle.percentage}%`,
        vehicle.value > 0 ? "Detected" : "Not Detected",
      ]),
      [],
      ["Total Vehicles", stats.total_vehicles],
      ["Traffic Status", stats.traffic_status],
      ["Congestion Level", congestionLevel],
      ["Congestion Indicator", `${congestionPercentage}%`],
      ["Most Detected Vehicle", mostDetectedVehicle.name],
      ["Traffic Insight", trafficInsight],
      [],
      ["Overspeed Monitoring"],
      ["Speed Limit (km/h)", speedLimit],
      ["Total Overspeed Alerts", alertCount],
      [],
      [
        "Vehicle Type",
        "Track ID",
        "Detected Speed (km/h)",
        "Speed Limit (km/h)",
      ],
      ...speedAlerts.map((alert) => [
        alert.vehicle_type,
        alert.track_id,
        alert.speed_kmh,
        alert.speed_limit_kmh,
      ]),
      [],
      ["Recent Traffic Activity"],
      [
        "Time",
        "Vehicle Type",
        "Newly Detected",
        "Updated Vehicle Count",
      ],
      ...activityLog.map((entry) => [
        entry.time,
        entry.vehicle,
        entry.count,
        entry.total,
      ]),
    ];

    const csvContent = csvRows
      .map((row) =>
        row
          .map((value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "VisionTrack_Traffic_Report.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard">

      {/* Header */}
      <header className="header">
        <div>
          <h1>VisionTrack AI</h1>
          <p>Intelligent Traffic Monitoring System</p>
        </div>

        <span className={connected ? "online" : "offline"}>
          {connected ? "● API Connected" : "● API Disconnected"}
        </span>
      </header>

      <main>

        {/* Dashboard Introduction */}
        <section className="hero">
          <h2>Traffic Dashboard</h2>
          <p>Real-time vehicle monitoring and analytics</p>
        </section>

        {/* High Traffic Alert */}
        {stats.traffic_status === "HIGH TRAFFIC" && (
          <div className="traffic-alert">
            ⚠️ High Traffic Alert! Heavy vehicle movement detected.
          </div>
        )}

        {/* Download Report */}
        <div style={{ textAlign: "center", margin: "20px 0" }}>
          <button
            onClick={downloadReport}
            disabled={!connected}
            style={{
              backgroundColor: connected ? "#2563eb" : "#9ca3af",
              color: "white",
              padding: "13px 25px",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: connected ? "pointer" : "not-allowed",
            }}
          >
            📥 Download Traffic Report
          </button>
        </div>

        {/* Summary Cards */}
        <section className="summary">
          <div className="total-card">
            <h3>Total Vehicles</h3>
            <h1>{stats.total_vehicles}</h1>
          </div>

          <div className="total-card">
            <h3>Traffic Status</h3>
            <h1
              className={`traffic-status ${stats.traffic_status
                .toLowerCase()
                .replace(" ", "-")}`}
            >
              {stats.traffic_status}
            </h1>
          </div>

          <div className="total-card">
            <h3>Most Detected Vehicle</h3>
            <h1>{mostDetectedVehicle.name}</h1>
            <p>{mostDetectedVehicle.value} vehicles detected</p>
          </div>
        </section>

        {/* Vehicle Count Cards */}
        <section className="vehicle-grid">
          {vehicleData.map((vehicle, index) => (
            <div className="vehicle-card" key={vehicle.name}>
              <span>{["🚗", "🏍️", "🚌", "🚚"][index]}</span>
              <h3>{vehicle.name}</h3>
              <h2>{vehicle.value}</h2>
              <p>{vehicle.percentage}% of total vehicles</p>
            </div>
          ))}
        </section>

        {/* Traffic Congestion Level */}
        <section
          style={{
            background: "white",
            padding: "25px",
            margin: "25px 0",
            borderRadius: "15px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
          }}
        >
          <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
            Traffic Congestion Level
          </h2>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "15px",
            }}
          >
            <h3 style={{ margin: 0 }}>Current Congestion</h3>

            <span
              style={{
                backgroundColor: congestionColor,
                color: "white",
                padding: "9px 18px",
                borderRadius: "20px",
                fontWeight: "bold",
              }}
            >
              {congestionLevel} TRAFFIC
            </span>
          </div>

          <div
            style={{
              width: "100%",
              height: "24px",
              backgroundColor: "#e5e7eb",
              borderRadius: "20px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${congestionPercentage}%`,
                height: "100%",
                backgroundColor: congestionColor,
                borderRadius: "20px",
                transition: "width 0.6s ease, background-color 0.6s ease",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "12px",
              fontWeight: "bold",
              color: "#475569",
            }}
          >
            <span>LOW</span>
            <span>MEDIUM</span>
            <span>HIGH</span>
          </div>

          <p style={{ textAlign: "center", marginTop: "15px" }}>
            Congestion Indicator: <strong>{congestionPercentage}%</strong>
          </p>

          <p
            style={{
              textAlign: "center",
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            Category-based indicator calculated from the total detected
            vehicles.
          </p>
        </section>

        {/* Live Overspeed Monitoring */}
        <section
          style={{
            background: "white",
            padding: "25px",
            margin: "25px 0",
            borderRadius: "15px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
          }}
        >
          <h2 style={{ textAlign: "center", marginBottom: "10px" }}>
            🚨 Live Overspeed Monitoring
          </h2>

          <p style={{ textAlign: "center", color: "#64748b" }}>
            Monitor vehicles exceeding the configured speed limit.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "30px",
              flexWrap: "wrap",
              margin: "25px 0",
            }}
          >
            <div
              style={{
                background: "#eff6ff",
                padding: "20px 35px",
                borderRadius: "12px",
                textAlign: "center",
                minWidth: "180px",
              }}
            >
              <h3 style={{ color: "#475569" }}>Speed Limit</h3>
              <h1 style={{ color: "#2563eb" }}>
                {speedLimit} km/h
              </h1>
            </div>

            <div
              style={{
                background: alertCount > 0 ? "#fee2e2" : "#dcfce7",
                padding: "20px 35px",
                borderRadius: "12px",
                textAlign: "center",
                minWidth: "180px",
              }}
            >
              <h3 style={{ color: "#475569" }}>Overspeed Alerts</h3>
              <h1 style={{ color: alertCount > 0 ? "#dc2626" : "#16a34a" }}>
                {alertCount}
              </h1>
            </div>
          </div>

          {/* Configurable speed limit */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "20px",
              maxWidth: "520px",
              margin: "0 auto 22px",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Change Speed Limit</h3>

            <p style={{ color: "#64748b", fontSize: "14px" }}>
              Set a limit from 10 to 120 km/h. The backend will apply this
              value to incoming overspeed alerts.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <input
                type="number"
                min="10"
                max="120"
                step="1"
                value={speedLimitInput ?? speedLimit}
                onChange={(event) => {
                  setSpeedLimitInput(event.target.value);
                  setSpeedLimitMessage("");
                }}
                disabled={!speedApiConnected || savingSpeedLimit}
                aria-label="Speed limit in kilometres per hour"
                style={{
                  width: "130px",
                  padding: "11px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "16px",
                }}
              />

              <span style={{ color: "#475569", fontWeight: "600" }}>
                km/h
              </span>

              <button
                onClick={updateSpeedLimit}
                disabled={!speedApiConnected || savingSpeedLimit}
                style={{
                  background:
                    !speedApiConnected || savingSpeedLimit
                      ? "#94a3b8"
                      : "#2563eb",
                  color: "white",
                  padding: "12px 20px",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor:
                    !speedApiConnected || savingSpeedLimit
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {savingSpeedLimit ? "Updating..." : "Update Limit"}
              </button>
            </div>

            {speedLimitMessage && (
              <p
                role="status"
                style={{
                  marginBottom: 0,
                  color: speedLimitMessage.includes("successfully")
                    ? "#15803d"
                    : "#b91c1c",
                  fontWeight: "600",
                }}
              >
                {speedLimitMessage}
              </p>
            )}
          </div>

          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <span
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                background: speedApiConnected ? "#dcfce7" : "#fee2e2",
                color: speedApiConnected ? "#15803d" : "#b91c1c",
                fontWeight: "bold",
              }}
            >
              {speedApiConnected
                ? "● Speed API Connected"
                : "● Speed API Disconnected"}
            </span>
          </div>

          {speedAlerts.length > 0 ? (
            <>
              <div
                style={{
                  background: "#fee2e2",
                  color: "#b91c1c",
                  padding: "15px",
                  borderRadius: "10px",
                  textAlign: "center",
                  fontWeight: "bold",
                  marginBottom: "20px",
                }}
              >
                ⚠️ OVERSPEED DETECTED! {speedAlerts.length} vehicle(s)
                currently reported by the API.
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "center",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#b91c1c", color: "white" }}>
                      <th style={{ padding: "14px" }}>Vehicle Type</th>
                      <th style={{ padding: "14px" }}>Track ID</th>
                      <th style={{ padding: "14px" }}>Detected Speed</th>
                      <th style={{ padding: "14px" }}>Speed Limit</th>
                      <th style={{ padding: "14px" }}>Alert Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {speedAlerts.map((alert, index) => (
                      <tr
                        key={`${alert.track_id}-${index}`}
                        style={{ borderBottom: "1px solid #e5e7eb" }}
                      >
                        <td style={{ padding: "14px" }}>
                          {alert.vehicle_type}
                        </td>

                        <td style={{ padding: "14px" }}>
                          {alert.track_id}
                        </td>

                        <td
                          style={{
                            padding: "14px",
                            color: "#dc2626",
                            fontWeight: "bold",
                          }}
                        >
                          {Number(alert.speed_kmh).toFixed(2)} km/h
                        </td>

                        <td style={{ padding: "14px" }}>
                          {Number(alert.speed_limit_kmh ?? speedLimit)} km/h
                        </td>

                        <td style={{ padding: "14px" }}>
                          <span
                            style={{
                              background: "#fee2e2",
                              color: "#b91c1c",
                              padding: "6px 12px",
                              borderRadius: "15px",
                              fontWeight: "bold",
                            }}
                          >
                            OVERSPEED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div
              style={{
                background: "#f0fdf4",
                color: "#15803d",
                padding: "20px",
                borderRadius: "10px",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              {speedApiConnected
                ? "✓ No overspeed vehicles currently reported."
                : "Waiting for speed monitoring data..."}
            </div>
          )}

          <p
            style={{
              textAlign: "center",
              color: "#64748b",
              fontSize: "13px",
              marginTop: "18px",
            }}
          >
            Speed readings depend on camera calibration and the tracking
            system's estimation accuracy.
          </p>
        </section>

        {/* Traffic Analytics Insight */}
        <section className="insight-card">
          <h2>Traffic Analytics Insight</h2>
          <p>{trafficInsight}</p>
        </section>

        {/* Recent Traffic Activity */}
        <section className="table-section">
          <h2>Recent Traffic Activity</h2>

          <p>
            Recent increases in vehicle counts reported by the tracking system.
          </p>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Detection Time</th>
                  <th>Vehicle Type</th>
                  <th>Newly Detected</th>
                  <th>Updated Vehicle Count</th>
                </tr>
              </thead>

              <tbody>
                {activityLog.length > 0 ? (
                  activityLog.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.time}</td>
                      <td>{entry.vehicle}</td>
                      <td>+{entry.count}</td>
                      <td>{entry.total}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center" }}>
                      {connected
                        ? "Waiting for new vehicle detections..."
                        : "Connect to the backend to view traffic activity."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Analytics */}
        <section className="analytics">
          <h2>Vehicle Analytics</h2>

          <div className="chart-grid">

            {/* Bar Chart */}
            <div className="chart-card">
              <h3>Vehicle Count Distribution</h3>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vehicleData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="chart-card">
              <h3>Vehicle Percentage Distribution</h3>

              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={vehicleData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {vehicleData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[index]}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Live Traffic History */}
          <div className="chart-card">
            <h3>Live Traffic History</h3>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trafficHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#2563eb"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Vehicle Detection Summary */}
        <section className="table-section">
          <h2>Vehicle Detection Summary</h2>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Vehicle Type</th>
                  <th>Count</th>
                  <th>Percentage</th>
                  <th>Detection Status</th>
                </tr>
              </thead>

              <tbody>
                {vehicleData.map((vehicle) => (
                  <tr key={vehicle.name}>
                    <td>{vehicle.name}</td>
                    <td>{vehicle.value}</td>
                    <td>{vehicle.percentage}%</td>
                    <td>
                      {vehicle.value > 0
                        ? "Detected"
                        : "Not Detected"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Traffic Video */}
        <section className="video-section">
          <h2>Live Traffic Monitoring</h2>
          <p>Processed vehicle detection and tracking video</p>

          <div className="video-container">
            <video controls autoPlay muted loop width="100%">
              <source src="/traffic.mp4" type="video/mp4" />
              Your browser does not support video playback.
            </video>
          </div>
        </section>

      </main>
    </div>
  );
}

export default App;
