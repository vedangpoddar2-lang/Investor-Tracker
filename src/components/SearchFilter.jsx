import { Search } from 'lucide-react';
import { STAGES, ENTITIES, NDA_STATUSES, INFO_SHARED_STATUSES } from '../data/store';
import './SearchFilter.css';

export default function SearchFilter({ filters, onFilterChange }) {
    return (
        <div className="search-filter">
            <div className="search-filter-row">
                <div className="search-input-wrapper">
                    <Search size={14} className="search-icon" />
                    <input
                        type="text"
                        className="input search-input"
                        placeholder="Search investors..."
                        value={filters.search}
                        onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                    />
                </div>
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
                <select
                    className="select filter-select"
                    value={filters.ndaStatus}
                    onChange={(e) => onFilterChange({ ...filters, ndaStatus: e.target.value })}
                >
                    <option value="">All NDA status</option>
                    {NDA_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                    className="select filter-select"
                    value={filters.infoShared}
                    onChange={(e) => onFilterChange({ ...filters, infoShared: e.target.value })}
                >
                    <option value="">All info shared</option>
                    {INFO_SHARED_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
        </div>
    );
}
