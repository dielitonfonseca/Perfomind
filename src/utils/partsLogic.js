// utils/partsLogic.js

export const processPartsData = (inputText) => {
    if (!inputText || inputText.trim() === '') {
        return { error: 'Nenhum dado inserido.' };
    }

    const rows = inputText.trim().split('\n').map(row => row.split('\t'));
    const headers = rows[0].map(h => h.trim());

    // --- ALTERAÇÃO AQUI: Agora busca especificamente por "SO Nro." ---
    const dateIdx = headers.findIndex(h => h.toLowerCase().includes('data'));
    const osIdx = headers.findIndex(h => h.toLowerCase().includes('so nro') || h.toLowerCase().includes('os') || h.toLowerCase().includes('ordem'));
    const modelIdx = headers.findIndex(h => h.toLowerCase().includes('modelo') || h.toLowerCase().includes('model'));

    // Identificar pares de colunas de Peças (Código e Descrição)
    const partColumns = [];
    for (let i = 1; i <= 20; i++) {
        const numStr = i.toString().padStart(2, '0');
        const codeIdx = headers.findIndex(h => h.toLowerCase().includes(`código da peça${numStr}`) || h.toLowerCase().includes(`codigo da peca${numStr}`));
        const descIdx = headers.findIndex(h => h.toLowerCase().includes(`peças description ${numStr}`) || h.toLowerCase().includes(`pecas description ${numStr}`));
        
        if (codeIdx !== -1) {
            partColumns.push({ codeIdx, descIdx });
        }
    }

    if (partColumns.length === 0) {
        return { error: 'Colunas de "Código da peça" não encontradas. Verifique o cabeçalho do Excel.' };
    }

    const partsMap = {};
    const transactions = [];
    let totalPartsUsed = 0;
    const dates = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2) continue;

        const rowDateStr = dateIdx !== -1 ? row[dateIdx] : null;
        const rowModel = modelIdx !== -1 ? (row[modelIdx] || 'OUTROS') : 'OUTROS';
        
        // --- PEGA O VALOR CORRETO DO "SO Nro." ---
        const rowOS = osIdx !== -1 ? row[osIdx] : `N/A`;

        let rowDate = null;
        if (rowDateStr) {
            const dateParts = rowDateStr.split('/');
            if (dateParts.length === 3) {
                rowDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
                if (!isNaN(rowDate.getTime())) dates.push(rowDate);
            }
        }

        const usedPartsInRow = [];

        partColumns.forEach(col => {
            const partCode = row[col.codeIdx] ? row[col.codeIdx].trim() : '';
            const partDesc = col.descIdx !== -1 && row[col.descIdx] ? row[col.descIdx].trim() : 'Sem descrição';

            if (partCode && partCode !== '-' && partCode.toLowerCase() !== 'null') {
                usedPartsInRow.push(partCode);
                totalPartsUsed++;

                if (!partsMap[partCode]) {
                    partsMap[partCode] = { count: 0, desc: partDesc, category: 'OUTROS' };
                }
                partsMap[partCode].count += 1;
                if (partsMap[partCode].desc === 'Sem descrição' && partDesc !== 'Sem descrição') {
                    partsMap[partCode].desc = partDesc;
                }
            }
        });

        transactions.push({
            date: rowDate,
            osNumber: rowOS, // Vinculado corretamente aqui
            model: rowModel,
            partsList: usedPartsInRow,
            hasParts: usedPartsInRow.length > 0,
            category: 'OUTROS'
        });
    }

    const sortedParts = Object.entries(partsMap)
        .map(([code, info]) => ({
            code,
            desc: info.desc,
            count: info.count,
            category: info.category
        }))
        .sort((a, b) => b.count - a.count);

    let startStr = 'N/A';
    let endStr = 'N/A';
    let calculatedDays = 1;

    if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        
        startStr = minDate.toLocaleDateString('pt-BR');
        endStr = maxDate.toLocaleDateString('pt-BR');

        const diffTime = Math.abs(maxDate - minDate);
        calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    return {
        dateRange: { start: startStr, end: endStr },
        days: calculatedDays,
        transactions: transactions,
        parts: sortedParts,
        totalPartsUsed: totalPartsUsed
    };
};