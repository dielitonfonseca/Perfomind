import React, { useState } from 'react';
import './App.css';
import Form from './components/Form';
import Output from './components/Output';
import Dashboard from './components/Dashboard'; // Importa o novo componente

function App() {
  const [formData, setFormData] = useState(null); // Estado para armazenar os dados do formulário preenchido

  return (
    <div className="App">
      <h2>Encerramento de Ordem de Serviço THE</h2>
      <Form setFormData={setFormData} /> {/* Passa a função para atualizar os dados do formulário */}
      {formData && <Output data={formData} />} {/* Renderiza o Output apenas se houver dados */}
      <Dashboard /> {/* Adiciona o Dashboard para visualização dos dados */}
    </div>
  );
}

export default App;