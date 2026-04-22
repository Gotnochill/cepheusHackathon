import React from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <h1 className="title">Disaster Management System</h1>
      <p className="subheading">Bangalore Region — Real-time Relief Coordination</p>

      <div className="mode-grid">
        <div className="mode-card" onClick={() => navigate("/admin")}>
          <div className="mode-tag">DEMO</div>
          <h2>Demo Simulation</h2>
          <p>
            Watch the system in action. Live Bangalore map with simulated
            disaster reports, priority routing, and automated truck dispatch.
          </p>
          <span className="mode-cta">Watch Demo</span>
        </div>

        <div className="mode-card mode-card--user" onClick={() => navigate("/user")}>
          <div className="mode-tag mode-tag--user">SOS</div>
          <h2>Realistic Simulation</h2>
          <p>
            End-user mode. Log in, share your GPS location, and submit an
            emergency SOS request with specific resource needs.
          </p>
          <span className="mode-cta mode-cta--user">Start Simulation</span>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
