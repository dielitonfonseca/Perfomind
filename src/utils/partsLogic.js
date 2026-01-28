// utils/partsLogic.js

export const processPartsData = (inputText) => {
    if (!inputText || inputText.trim() === '') {
        return { error: 'Nenhum dado inserido.' };
    }

    const rows = inputText.trim().split('\n').map(row => row.split('\t'));
    const headers = rows[0].map(h => h.trim().toLowerCase());

    // --- Colunas Originais ---
    const osIdx = headers.findIndex(h => h.includes('so nro') || h.includes('os') || h.includes('ordem'));
    const modelIdx = headers.findIndex(h => h.includes('modelo') || h.includes('model'));

    // --- Coluna TIPO DE SERVIÇO ---
    const serviceTypeIdx = headers.findIndex(h => h.includes('tipo de servi') || h.includes('service type'));

    // --- Colunas de LTP ---
    const solDateIdx = headers.findIndex(h => h.includes('solicita')); 
    const finishDateIdx = headers.findIndex(h => h.includes('reparo finalizado')); 
    const warrantyIdx = headers.findIndex(h => h.includes('warranty') || h.includes('garantia'));

    const dateIdx = headers.findIndex(h => h.includes('data') && !h.includes('solicita') && !h.includes('reparo'));

    // Identificar pares de colunas de Peças
    const partColumns = [];
    for (let i = 1; i <= 20; i++) {
        const numStr = i.toString().padStart(2, '0');
        const codeIdx = headers.findIndex(h => h.includes(`código da peça${numStr}`) || h.includes(`codigo da peca${numStr}`));
        const descIdx = headers.findIndex(h => h.includes(`peças description ${numStr}`) || h.includes(`pecas description ${numStr}`));
        
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

    const parseDate = (dateStr) => {
        if (!dateStr || dateStr.trim() === '-' || dateStr.trim() === '') return null;
        const dateOnly = dateStr.trim().split(' ')[0]; 
        const parts = dateOnly.split('/');
        if (parts.length === 3) {
            const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
            return isNaN(d.getTime()) ? null : d;
        }
        return null;
    };

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2) continue;

        const rowDateStr = dateIdx !== -1 ? row[dateIdx] : null;
        const rowModel = modelIdx !== -1 ? (row[modelIdx] || 'OUTROS') : 'OUTROS';
        const rowOS = osIdx !== -1 ? row[osIdx] : `N/A`;
        
        // --- Captura o Tipo de Serviço ---
        const rowServiceType = serviceTypeIdx !== -1 ? row[serviceTypeIdx].toUpperCase().trim() : 'OUTROS';

        // --- LÓGICA DE LTP: Captura e Cálculo ---
        const solDateStr = solDateIdx !== -1 ? row[solDateIdx] : null;
        const finishDateStr = finishDateIdx !== -1 ? row[finishDateIdx] : null;
        const warrantyFlag = warrantyIdx !== -1 ? row[warrantyIdx] : 'N/A';

        const solDate = parseDate(solDateStr);
        const finishDate = parseDate(finishDateStr);

        let durationDays = null;
        if (solDate && finishDate) {
            const diffTime = finishDate - solDate;
            durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            if (durationDays < 0) durationDays = 0; 
        }

        const rowDate = parseDate(rowDateStr);
        if (rowDate) dates.push(rowDate);

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
            osNumber: rowOS,
            model: rowModel,
            partsList: usedPartsInRow,
            hasParts: usedPartsInRow.length > 0,
            category: 'OUTROS',
            serviceType: rowServiceType, 
            solDateObj: solDate,
            finishDateObj: finishDate,
            durationDays: durationDays,
            warrantyFlag: warrantyFlag ? warrantyFlag.toUpperCase().trim() : 'N/A'
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