import { useState, useEffect, useMemo } from 'react';
import { getInvestors, STAGES } from '../data/store';

// Stage color mapping
// Stage color mapping - Subtle & Professional
const STAGE_COLORS = {
    'Lead': { bg: '#f8fafc', text: '#64748b', dot: '#94a3b8' },
    'Reached out': { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
    'Initial call': { bg: '#f1f5f9', text: '#1e293b', dot: '#64748b' },
    'Follow up': { bg: '#fffbeb', text: '#b45309', dot: '#f59e0b' },
    'NDA signed': { bg: '#ecfdf5', text: '#047857', dot: '#10b981' },
    'Shared Info': { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
    'Reviewing': { bg: '#fdf2f8', text: '#be185d', dot: '#db2777' },
};

const EXCLUDED = ['Passed', 'Hold'];

export default function StagePillsBar({ refreshKey }) {
    const [investors, setInvestors] = useState([]);

    useEffect(() => {
        async function load() {
            const data = await getInvestors();
            setInvestors(data);
        }
        load();
    }, [refreshKey]);

    const stageCounts = useMemo(() => {
        return STAGES
            .filter(s => !EXCLUDED.includes(s))
            .map(stage => ({
                stage,
                count: investors.filter(i => i.stage === stage).length,
                colors: STAGE_COLORS[stage] || { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
            }));
    }, [investors]);

    const total = stageCounts.reduce((sum, s) => sum + s.count, 0);

    return (
        <div className="stage-pills-bar">
            <div className="stage-pills-inner">
                <span className="stage-pills-total">{total} active</span>
                {stageCounts.map(({ stage, count, colors }) => (
                    <span
                        key={stage}
                        className="stage-pill"
                        style={{ background: colors.bg, color: colors.text }}
                    >
                        <span className="stage-pill-dot" style={{ background: colors.dot }} />
                        {stage}
                        <span className="stage-pill-count">{count}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

