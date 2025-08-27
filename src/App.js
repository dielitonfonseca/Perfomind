// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Form from './components/Form';
import Output from './components/Output';
import DashboardPage from './pages/DashboardPage';
import KpisPage from './pages/KpisPage';

function App() {
  const [formData, setFormData] = useState(null);
  const [showDashboardPopup, setShowDashboardPopup] = useState(false);
  const [dashboardClickCount, setDashboardClickCount] = useState(0);
  const [lastDashboardClickTime, setLastDashboardClickTime] = useState(0);

  const handleDashboardClick = () => {
    const now = Date.now();
    if (now - lastDashboardClickTime < 5000) {
      const newCount = dashboardClickCount + 1;
      setDashboardClickCount(newCount);
      if (newCount === 3) {
        setShowDashboardPopup(true);
        setDashboardClickCount(0);
      }
    } else {
      setDashboardClickCount(1);
    }
    setLastDashboardClickTime(now);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (Date.now() - lastDashboardClickTime > 5000) {
        setDashboardClickCount(0);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [lastDashboardClickTime]);


  return (
    <Router>
      <div className="App">
        {/* Header com os links de navegação visíveis no lado direito */}
        <header className="app-header">
          <h1 className="app-title">Perfomind</h1>
            {/* <h2 className="subtitle">Performance com inteligência</h2>*/}
          <nav className="main-nav">
            <ul>
              <li>
                <Link to="/">Início</Link>
              </li>
              <li>
                <Link to="/dashboard" onClick={handleDashboardClick}>Dashboard</Link>
              </li>
              {/* O link para "Gerar PDF" foi removido pois a funcionalidade agora está na página principal */}
            </ul>
          </nav>
        </header>

        {/* Conteúdo principal */}
        <div className="main-content">
          <Routes>
            <Route path="/" element={
              <>
                <Form setFormData={setFormData} />
                {formData && <Output data={formData} />}
              </>
            } />
            <Route path="/dashboard" element={<DashboardPage showPopup={showDashboardPopup} setShowPopup={setShowDashboardPopup} />} />
            <Route path="/kpis" element={<KpisPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;