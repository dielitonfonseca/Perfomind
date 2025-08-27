// src/pages/DashboardPage.js
import React from 'react';
import Dashboard from '../components/Dashboard';

function DashboardPage({ showPopup, setShowPopup }) {
  return (
    <div className="dashboard-page">
      <h2>Métricas e Desempenho</h2>
      <Dashboard showPopup={showPopup} setShowPopup={setShowPopup} />
    </div>
  );
}

export default DashboardPage;