import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    DndContext, closestCorners, PointerSensor, useSensor, useSensors, useDroppable
} from '@dnd-kit/core';
import {
    SortableContext, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, User } from 'lucide-react';
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

    const entityClass = investor.entity.toLowerCase();
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
                {investor.investorType && (
                    <span className="kanban-card-type">{investor.investorType}</span>
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
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        })
    );

    const columns = useMemo(() => {
        let list = getInvestors();
        const allInteractions = getAllInteractions();

        list = list.map((inv) => {
            const ixs = allInteractions.filter((i) => i.investorId === inv.id).sort((a, b) => new Date(b.date) - new Date(a.date));
            return {
                ...inv,
                lastContact: ixs[0]?.date || null,
                daysSince: getDaysSinceContact(inv.id),
            };
        });

        // Apply filters
        if (filters.search) {
            const q = filters.search.toLowerCase();
            list = list.filter((i) => i.name.toLowerCase().includes(q) || i.fund.toLowerCase().includes(q));
        }
        if (filters.entity) list = list.filter((i) => i.entity === filters.entity);
        if (filters.nda === 'true') list = list.filter((i) => i.ndaSigned);
        if (filters.nda === 'false') list = list.filter((i) => !i.ndaSigned);
        if (filters.tag) list = list.filter((i) => (i.tags || []).includes(filters.tag));

        return STAGES.map((stage) => ({
            stage,
            investors: list.filter((i) => i.stage === stage),
        }));
    }, [filters, refreshKey]);

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over) return;

        // Find which column the item was dropped into
        const overStage = over.data?.current?.stage;
        const activeInvestor = getInvestors().find((i) => i.id === active.id);
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
            updateInvestor(active.id, { stage: targetStage });
            if (onUpdate) onUpdate();
        }
    };

    const stageColors = {
        'First Reach': 'var(--stage-first-reach)',
        'Follow-up': 'var(--stage-follow-up)',
        'NDA': 'var(--stage-nda)',
        'Diligence': 'var(--stage-diligence)',
        'Passed': 'var(--stage-passed)',
        'Committed': 'var(--stage-committed)',
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="kanban-board">
                {columns.map((col) => (
                    <div key={col.stage} className="kanban-column">
                        <div className="kanban-column-header">
                            <div className="kanban-column-dot" style={{ background: stageColors[col.stage] }}></div>
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
