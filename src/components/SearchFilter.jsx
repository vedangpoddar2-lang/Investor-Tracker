import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { STAGES, ENTITIES, getAllTags } from '../data/store';
import './SearchFilter.css';

export default function SearchFilter({ filters, onFilterChange }) {
    const [showFilters, setShowFilters] = useState(false);
    const tags = getAllTags();
    const hasActiveFilters = filters.entity || filters.stage || filters.nda !== '' || filters.tag;

    return (
        <div className="search-filter">
            <div className="search-filter-row">
                <div className="search-box">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search investors, notes, to-dos..."
                        value={filters.search}
                        onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                    />
                    {filters.search && (
                        <button className="search-clear" onClick={() => onFilterChange({ ...filters, search: '' })}>
                            <X size={14} />
                        </button>
                    )}
                </div>
                <button
                    className={`btn btn-secondary btn-filter ${hasActiveFilters ? 'active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter size={14} />
                    Filters
                    {hasActiveFilters && <span className="filter-dot"></span>}
                </button>
            </div>

            {showFilters && (
                <div className="filter-panel">
                    <div className="filter-group">
                        <label className="form-label">Entity</label>
                        <select
                            className="select"
                            value={filters.entity}
                            onChange={(e) => onFilterChange({ ...filters, entity: e.target.value })}
                        >
                            <option value="">All</option>
                            {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label className="form-label">Stage</label>
                        <select
                            className="select"
                            value={filters.stage}
                            onChange={(e) => onFilterChange({ ...filters, stage: e.target.value })}
                        >
                            <option value="">All</option>
                            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label className="form-label">NDA</label>
                        <select
                            className="select"
                            value={filters.nda}
                            onChange={(e) => onFilterChange({ ...filters, nda: e.target.value })}
                        >
                            <option value="">All</option>
                            <option value="true">Signed</option>
                            <option value="false">Unsigned</option>
                        </select>
                    </div>
                    {tags.length > 0 && (
                        <div className="filter-group">
                            <label className="form-label">Tag</label>
                            <select
                                className="select"
                                value={filters.tag}
                                onChange={(e) => onFilterChange({ ...filters, tag: e.target.value })}
                            >
                                <option value="">All</option>
                                {tags.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    )}
                    {hasActiveFilters && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => onFilterChange({ search: filters.search, entity: '', stage: '', nda: '', tag: '' })}
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
