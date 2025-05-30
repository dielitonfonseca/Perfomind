import React, { useState } from 'react';
import './App.css';
import Form from './components/Form';
import Output from './components/Output';

function App() {
  const [formData, setFormData] = useState(null); // Estado para armazenar os dados do formulário preenchido

  return (
    <div className="App">
      <h2>Encerramento de Ordem de Serviço</h2>
      <Form setFormData={setFormData} /> {/* Passa a função para atualizar os dados do formulário */}
      {formData && <Output data={formData} />} {/* Renderiza o Output apenas se houver dados */}
    </div>
  );
}

export default App;