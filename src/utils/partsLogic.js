export const processPartsData = (text) => {
  if (!text) return { error: "Sem dados para processar." };

  const rows = text.split('\n').map(row => row.split('\t'));
  if (rows.length < 2) return { error: "Formato inválido. Cole a planilha do Excel." };

  const headers = rows[0].map(h => h.trim());
  const getIndex = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
  
  const idxDesc = getIndex("Service Product  Description"); 
  const idxDate = getIndex("Data de Solicitação"); 
  const idxModel = getIndex("Modelo");
  const idxOS = getIndex("SO Nro."); // Verifique se o nome da coluna é este mesmo

  const partIndices = [];
  for (let i = 1; i <= 10; i++) {
    const num = i < 10 ? `0${i}` : `${i}`;
    const idx = getIndex(`Código da peça${num}`);
    if (idx !== -1) partIndices.push(idx);
  }

  let minDate = null;
  let maxDate = null;
  let totalPartsCount = 0;
  const partsMap = {}; 
  const transactions = []; 

  for (let i = 1; i < rows.length; i++) {
    const col = rows[i];
    if (col.length < headers.length) continue;

    const rawDesc = col[idxDesc] ? col[idxDesc].trim().toUpperCase() : "";
    let category = "Outros";
    
    if (rawDesc.startsWith("LED LCD TV") || rawDesc.startsWith("LARGE FORMAT") || rawDesc.startsWith("TFT LCD MONITOR") || rawDesc.startsWith("HTS")) category = "VD";
    else if (rawDesc.startsWith("WASHING MACHINE")) category = "WSM";
    else if (rawDesc.startsWith("REFRIGERATOR")) category = "REF";
    else if (rawDesc.startsWith("ROOM AIR CONDITIONER")) category = "RAC";

    const dateStr = idxDate !== -1 ? col[idxDate] : null;
    let dateObj = null;
    if (dateStr && dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/').map(Number);
      dateObj = new Date(year, month - 1, day);
      if (!isNaN(dateObj)) {
        if (!minDate || dateObj < minDate) minDate = dateObj;
        if (!maxDate || dateObj > maxDate) maxDate = dateObj;
      }
    }

    const model = idxModel !== -1 ? col[idxModel] : "DESCONHECIDO";
    const osNumber = idxOS !== -1 ? col[idxOS] : "";
    
    const partsInOrder = [];

    partIndices.forEach(pIdx => {
      const partCode = col[pIdx] ? col[pIdx].trim() : "";
      if (partCode && partCode.length > 3) { 
        partsInOrder.push(partCode);
        totalPartsCount++;
        
        if (!partsMap[partCode]) {
          partsMap[partCode] = { code: partCode, count: 0, category: category, desc: rawDesc };
        }
        partsMap[partCode].count++;
      }
    });

    transactions.push({
      category,
      model,
      osNumber,
      hasParts: partsInOrder.length > 0,
      partsList: partsInOrder, // Salva lista de peças da ordem
      date: dateObj
    });
  }

  const daysDiff = minDate && maxDate ? Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1 : 1;
  const sortedParts = Object.values(partsMap).sort((a, b) => b.count - a.count);

  return {
    transactions,
    parts: sortedParts,
    totalPartsUsed: totalPartsCount,
    days: daysDiff,
    dateRange: {
      start: minDate ? minDate.toLocaleDateString('pt-BR') : '-',
      end: maxDate ? maxDate.toLocaleDateString('pt-BR') : '-'
    }
  };
};