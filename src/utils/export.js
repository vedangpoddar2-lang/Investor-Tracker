export function exportCSV(investors) {
    const headers = [
        'Name', 'Fund', 'Entity', 'Type', 'Check Size', 'Stage',
        'Last Contact', 'NDA Signed', 'Info Shared', 'Intro Source', 'Tags',
        'Last Note', 'Next To-Do'
    ];

    const escape = (val) => {
        const str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const rows = investors.map((inv) => [
        inv.name, inv.fund, inv.entity, inv.investorType, inv.checkSize, inv.stage,
        inv.lastContact || '', inv.ndaSigned ? 'Yes' : 'No', inv.infoShared ? 'Yes' : 'No',
        inv.introSource, (inv.tags || []).join('; '),
        inv.lastNote || '', inv.nextTodo || ''
    ]);

    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investor-pipeline-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
