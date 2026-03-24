import { useState, useEffect, useMemo } from 'react';
import { getInvestors, STAGES } from '../data/store';

// Stage color mapping
const STAGE_COLORS = {
    'Lead': { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
    'Reached out': { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
    'Initial call': { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
    'Follow up': { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
    'NDA signed': { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
    'Shared Info': { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
    'Reviewing': { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
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

