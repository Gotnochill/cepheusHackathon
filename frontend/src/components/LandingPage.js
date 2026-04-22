import React from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <h1 className="title">Rapid Crisis Response</h1>
      <p className="subheading">Hospitality Emergency Coordination Platform</p>

      <div className="mode-grid">
        <div className="mode-card" onClick={() => navigate("/admin")}>
          <div className="mode-tag">DEMO</div>
          <h2>Live Simulation</h2>
          <p>
            Automated crisis detection across the venue area. Watch incoming
            incidents get prioritised, routed, and dispatched to response teams
            in real time.
          </p>
          <span className="mode-cta">Watch Demo</span>
        </div>

        <div className="mode-card mode-card--user" onClick={() => navigate("/realistic")}>
          <div className="mode-tag mode-tag--user">SOS</div>
          <h2>Live Coordination</h2>
          <p>
            Guest or staff submits an SOS with GPS location and crisis type.
            Command centre receives it instantly, dispatches the nearest
            response team, and notifies emergency services.
          </p>
          <span className="mode-cta mode-cta--user">Start</span>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
