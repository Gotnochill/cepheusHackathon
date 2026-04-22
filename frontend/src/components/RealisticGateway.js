import React from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const RealisticGateway = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "6px 14px",
            background: "transparent",
            color: "#888",
            border: "1px solid #ddd",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: "0.82rem",
          }}
        >
          Back
        </button>
      </div>

      <h1 className="title">Realistic Mode</h1>
      <p className="subheading">Live coordination — Bangalore Region</p>

      <div className="mode-grid">
        <div className="mode-card" onClick={() => navigate("/realistic/admin")}>
          <div className="mode-tag">ADMIN</div>
          <h2>Command Center</h2>
          <p>
            Monitor live SOS requests on the map. Select a depot, load a truck
            with supplies, and dispatch it to any active SOS location in real time.
          </p>
          <span className="mode-cta">Open Command Center</span>
        </div>

        <div className="mode-card mode-card--user" onClick={() => navigate("/realistic/user")}>
          <div className="mode-tag mode-tag--user">SOS</div>
          <h2>Send SOS</h2>
          <p>
            Share your GPS location and submit an emergency request with your
            specific resource needs. Responders are notified instantly.
          </p>
          <span className="mode-cta mode-cta--user">Send Emergency SOS</span>
        </div>
      </div>
    </div>
  );
};

export default RealisticGateway;
