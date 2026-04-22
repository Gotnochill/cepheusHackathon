import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const ADMIN_PIN = "admin";

const modalOverlay = {
  position: "fixed", inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000,
};

const modalBox = {
  background: "#fff", borderRadius: 10,
  padding: "32px 28px", maxWidth: 340, width: "90%",
  boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
  textAlign: "center",
};

const RealisticGateway = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [pin, setPin]             = useState("");
  const [pinErr, setPinErr]       = useState("");

  const openModal = () => { setShowModal(true); setPin(""); setPinErr(""); };
  const closeModal = () => setShowModal(false);

  const submitPin = () => {
    if (pin === ADMIN_PIN) {
      navigate("/realistic/admin");
    } else {
      setPinErr("Incorrect PIN. Try again.");
      setPin("");
    }
  };

  return (
    <>
      {showModal && (
        <div style={modalOverlay} onClick={closeModal}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>🔐</div>
            <h3 style={{ margin: "0 0 8px", color: "#2c3e50", fontSize: "1.15rem" }}>
              Admin Access
            </h3>
            <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: 18 }}>
              Enter the command centre PIN to continue.
            </p>
            <input
              type="password"
              value={pin}
              autoFocus
              placeholder="Enter PIN"
              onChange={e => { setPin(e.target.value); setPinErr(""); }}
              onKeyDown={e => e.key === "Enter" && submitPin()}
              style={{
                width: "100%", padding: "10px 13px",
                border: `1.5px solid ${pinErr ? "#e74c3c" : "#dde1e7"}`,
                borderRadius: 7, fontSize: "1rem",
                outline: "none", marginBottom: 6, textAlign: "center",
                letterSpacing: 4,
              }}
            />
            {pinErr && (
              <p style={{ color: "#e74c3c", fontSize: "0.8rem", margin: "0 0 10px" }}>
                {pinErr}
              </p>
            )}
            <p style={{ color: "#bbb", fontSize: "0.72rem", marginBottom: 16 }}>
              Hint: the word "admin"
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={closeModal}
                style={{
                  flex: 1, padding: "10px", border: "1px solid #ddd",
                  borderRadius: 6, background: "#f8f9fa",
                  cursor: "pointer", fontSize: "0.88rem", color: "#555",
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitPin}
                style={{
                  flex: 1, padding: "10px", border: "none",
                  borderRadius: 6, background: "#007bff", color: "#fff",
                  cursor: "pointer", fontSize: "0.88rem", fontWeight: 700,
                }}
              >
                Enter
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="landing-container">
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "6px 14px", background: "transparent",
              color: "#888", border: "1px solid #ddd",
              borderRadius: 4, cursor: "pointer", fontSize: "0.82rem",
            }}
          >
            Back
          </button>
        </div>

        <h1 className="title">Realistic Mode</h1>
        <p className="subheading">Live coordination — Bangalore Region</p>

        <div className="mode-grid">
          <div className="mode-card" onClick={openModal}>
            <div className="mode-tag">ADMIN</div>
            <h2>Command Center</h2>
            <p>
              Monitor live SOS requests, select a depot, tag supplies, and
              dispatch trucks in real time. PIN-protected access.
            </p>
            <span className="mode-cta">Login &amp; Enter</span>
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
    </>
  );
};

export default RealisticGateway;
