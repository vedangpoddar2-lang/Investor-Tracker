import { useState, useEffect, useMemo } from 'react';
import { getInvestors, STAGES } from '../data/store';

// Stage color mapping
// Stage color mapping - Muted & Professional (Linear style)
const STAGE_COLORS = {
    'Not Contacted': '#71717A', // Gray
    'Contacted': '#3B82F6',     // Blue
    'Intro Call': '#8B5CF6',    // Violet
    'NDA Shared': '#D97706',    // Amber
    'Deck Shared': '#52A06E',   // Sage
    'Term Sheet': '#10B981',    // Emerald
    'Closed / Dropped': '#E11D48' // Rose
};

const EXCLUDED = ['Closed / Dropped'];

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
            .filter(tag => !EXCLUDED.includes(tag))
            .map(stage => ({
                stage,
                count: investors.filter(i => i.stage === stage).length,
                color: STAGE_COLORS[stage] || '#71717A',
            }));
    }, [investors]);

    const activeTotal = investors.filter(i => !EXCLUDED.includes(i.stage)).length;

    return (
        <div className="stage-pills-bar">
            <div className="stage-pills-inner">
                <div className="active-summary">
                    <span className="summary-count">{activeTotal}</span>
                    <span className="summary-label">ACTIVE</span>
                </div>

                <div className="stage-pills-list">
                    {stageCounts.map(({ stage, count, color }) => (
                        <div
                            key={stage}
                            className="stage-pill"
                            style={{
                                '--pill-color': color,
                                '--pill-bg': `${color}14` // ~8% opacity
                            }}
                        >
                            <span className="stage-pill-dot" />
                            <span className="stage-pill-label">{stage}</span>
                            <span className="stage-pill-count">{count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

