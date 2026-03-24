import { useEffect, useState } from 'react';
import { getStats } from '../data/store';
import { motion } from 'framer-motion';
import { Users, Shield, Share2, AlertCircle, TrendingUp } from 'lucide-react';
import './StatsBar.css';

export default function StatsBar({ refreshKey }) {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        async function load() {
            const data = await getStats();
            setStats(data);
        }
        load();
    }, [refreshKey]);

    if (!stats) return null;

    const statItems = [
        { icon: Users, label: 'Total', value: stats.total, color: 'var(--accent-primary)' },
        { icon: TrendingUp, label: 'Active', value: stats.active, color: 'var(--accent-secondary)' },
        { icon: Shield, label: 'NDAs', value: stats.ndaSigned, color: 'var(--stage-nda)' },
        { icon: Share2, label: 'Info Shared', value: stats.infoShared, color: 'var(--stage-diligence)' },
        { icon: AlertCircle, label: 'Overdue', value: stats.overdueTodos, color: stats.overdueTodos > 0 ? 'var(--accent-danger)' : 'var(--text-tertiary)' },
    ];

    return (
        <div className="stats-bar">
            <div className="stats-cards">
                {statItems.map((item, idx) => (
                    <motion.div
                        key={item.label}
                        className="stat-card"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                    >
                        <div className="stat-icon" style={{ color: item.color }}>
                            <item.icon size={16} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value" style={{ color: item.color }}>{item.value}</div>
                            <div className="stat-label">{item.label}</div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

