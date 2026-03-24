import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    DndContext, closestCorners, PointerSensor, useSensor, useSensors, useDroppable
} from '@dnd-kit/core';
import {
    SortableContext, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock } from 'lucide-react';
import { getInvestors, updateInvestor, STAGES, getDaysSinceContact, getAllInteractions } from '../data/store';
import './KanbanView.css';

function KanbanCard({ investor, onClick }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: investor.id,
        data: { stage: investor.stage },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const entityClass = (investor.entity || '').toLowerCase();
    const daysSince = investor.daysSince;
    const staleClass = daysSince >= 14 ? 'card-stale-danger' : daysSince >= 7 ? 'card-stale-warning' : '';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`kanban-card ${staleClass}`}
            onClick={onClick}
        >
            <div className="kanban-card-header">
                <span className="kanban-card-name">{investor.name}</span>
                <span className={`badge badge-${entityClass}`} style={{ fontSize: '0.625rem' }}>
                    {investor.entity}
                </span>
            </div>
            {investor.fund && <div className="kanban-card-fund">{investor.fund}</div>}
            <div className="kanban-card-footer">
                {investor.lastContact && (
                    <span className="kanban-card-date">
                        <Clock size={10} />
                        {new Date(investor.lastContact).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                )}
                {investor.investor_type && (
                    <span className="kanban-card-type">{investor.investor_type}</span>
                )}
            </div>
        </div>
    );
}

function DroppableColumn({ stage, children }) {
    const { setNodeRef } = useDroppable({
        id: stage,
        data: { current: { stage } }
    });
    return (
        <div ref={setNodeRef} className="kanban-column-body" id={stage}>
            {children}
        </div>
    );
}

export default function KanbanView({ filters, onOpenDrawer, refreshKey, onUpdate }) {
    const [rawInvestors, setRawInvestors] = useState([]);
    const [rawInteractions, setRawInteractions] = useState([]);
    const [loading, setLoading] = useState(true);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        })
    );

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [invs, ixs] = await Promise.all([
                    getInvestors(),
                    getAllInteractions()
                ]);
                setRawInvestors(invs);
                setRawInteractions(ixs);
            } catch (err) {
                console.error('Failed to load Kanban data:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [refreshKey]);

    const columns = useMemo(() => {
        let list = rawInvestors.map((inv) => {
            const ixs = rawInteractions.filter((i) => i.investor_id === inv.id).sort((a, b) => new Date(b.date) - new Date(a.date));
            return {
                ...inv,
                lastContact: ixs[0]?.date || null,
                daysSince: getDaysSinceContact(inv),
            };
        });

        // Apply filters
        if (filters.search) {
            const q = filters.search.toLowerCase();
            list = list.filter((i) => i.name.toLowerCase().includes(q) || (i.fund || '').toLowerCase().includes(q));
        }
        if (filters.entity) list = list.filter((i) => i.entity === filters.entity);
        if (filters.ndaStatus) list = list.filter((i) => i.nda_status === filters.ndaStatus);
        if (filters.tag) list = list.filter((i) => (i.tags || []).includes(filters.tag));

        return STAGES.map((stage) => ({
            stage,
            investors: list.filter((i) => i.stage === stage),
        }));
    }, [rawInvestors, rawInteractions, filters]);

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over) return;

        // Find which column the item was dropped into
        const overStage = over.data?.current?.stage;
        const activeInvestor = rawInvestors.find((i) => i.id === active.id);
        if (!activeInvestor) return;

        // If dropped on a card, use that card's stage
        let targetStage;
        if (overStage) {
            targetStage = overStage;
        } else {
            // Dropped on a column droppable
            targetStage = over.id;
        }

        if (targetStage && STAGES.includes(targetStage) && activeInvestor.stage !== targetStage) {
            await updateInvestor(active.id, { stage: targetStage });
            if (onUpdate) onUpdate();
        }
    };

    const stageColors = {
        'Lead': '#FEF3C7',
        'Reached out': '#FEF3C7',
        'Initial call': '#FEF3C7',
        'Follow up': '#DBEAFE',
        'NDA signed': '#DBEAFE',
        'Shared Info': '#D1FAE5',
        'Reviewing': '#D1FAE5',
        'Passed': '#FEE2E2',
        'Hold': '#F3F4F6',
    };

    if (loading && rawInvestors.length === 0) {
        return <div className="kanban-loading">Loading Kanban board...</div>;
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="kanban-board">
                {columns.map((col) => (
                    <div key={col.stage} className="kanban-column">
                        <div className="kanban-column-header">
                            <div className="kanban-column-dot" style={{ background: stageColors[col.stage] || '#ccc' }}></div>
                            <span className="kanban-column-title">{col.stage}</span>
                            <span className="kanban-column-count">{col.investors.length}</span>
                        </div>
                        <SortableContext
                            items={col.investors.map((i) => i.id)}
                            strategy={verticalListSortingStrategy}
                            id={col.stage}
                        >
                            <DroppableColumn stage={col.stage}>
                                {col.investors.map((inv, idx) => (
                                    <motion.div
                                        key={inv.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                    >
                                        <KanbanCard investor={inv} onClick={() => onOpenDrawer(inv.id)} />
                                    </motion.div>
                                ))}
                                {col.investors.length === 0 && (
                                    <div className="kanban-empty">No investors</div>
                                )}
                            </DroppableColumn>
                        </SortableContext>
                    </div>
                ))}
            </div>
        </DndContext>
    );
}
