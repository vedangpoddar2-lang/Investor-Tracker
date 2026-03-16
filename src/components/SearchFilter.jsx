import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { STAGES, ENTITIES, getAllTags } from '../data/store';
import './SearchFilter.css';

export default function SearchFilter({ filters, onFilterChange }) {
    return (
        <div className="search-filter">
            <div className="search-filter-row">
                <input
                    type="text"
                    className="input search-input"
                    placeholder="Search by name or fund..."
                    value={filters.search}
                    onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                />
                <select
                    className="select filter-select"
                    value={filters.entity}
                    onChange={(e) => onFilterChange({ ...filters, entity: e.target.value })}
                >
                    <option value="">All entities</option>
                    {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <select
                    className="select filter-select"
                    value={filters.stage}
                    onChange={(e) => onFilterChange({ ...filters, stage: e.target.value })}
                >
                    <option value="">All stages</option>
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
        </div>
    );
}
