// src/components/LandingPage.js
import React from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const LandingPage = () => {
  const navigate = useNavigate();
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  return (
    <div className="landing-container">
      <h1 className="title">Disaster Management System</h1>
      <p className="subheading">
        Real-time map, dashboard, and latest alerts for disaster management.
      </p>

      <div className="options-container">
        <button className="option-button" onClick={() => window.open(apiUrl, '_blank')}>
          Live Map
        </button>
        <button className="option-button" onClick={() => navigate("/latest-alerts")}>
          Latest Alerts/Requests
        </button>
      </div>
    </div>
  );
};

export default LandingPage;
