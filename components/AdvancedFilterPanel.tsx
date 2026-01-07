import React, { useState, useEffect } from 'react';
import { XIcon, SearchIcon, CheckCircleIcon, FilterIcon } from './IconComponents';

interface FilterState {
    searchTerm: string;
    selectedDisciplines: string[]; // IDs
    selectedYears: string[];
    selectedInstitutions: string[];
}

interface AdvancedFilterPanelProps {
    isOpen: boolean;
    onClose: () => void;
    disciplines: { id: string; name: string }[];
    availableYears: string[];
    availableInstitutions: string[];
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    onApply: () => void;
    onClear: () => void;
    institutionLabel?: string; // Optional prop for custom label
}

const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
    isOpen,
    onClose,
    disciplines,
    availableYears,
    availableInstitutions,
    filters,
    setFilters,
    onApply,
    onClear,
    institutionLabel = "Instituição" // Default value
}) => {
    const [localFilters, setLocalFilters] = useState<FilterState>(filters);

    useEffect(() => {
        if (isOpen) {
            setLocalFilters(filters);
        }
    }, [isOpen, filters]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalFilters(prev => ({ ...prev, searchTerm: e.target.value }));
    };

    const toggleDiscipline = (id: string) => {
        setLocalFilters(prev => {
            const newSelection = prev.selectedDisciplines.includes(id)
                ? prev.selectedDisciplines.filter(d => d !== id)
                : [...prev.selectedDisciplines, id];
            return { ...prev, selectedDisciplines: newSelection };
        });
    };

    const toggleYear = (year: string) => {
        setLocalFilters(prev => {
            const newSelection = prev.selectedYears.includes(year)
                ? prev.selectedYears.filter(y => y !== year)
                : [...prev.selectedYears, year];
            return { ...prev, selectedYears: newSelection };
        });
    };

    const toggleInstitution = (inst: string) => {
        setLocalFilters(prev => {
            const newSelection = prev.selectedInstitutions.includes(inst)
                ? prev.selectedInstitutions.filter(i => i !== inst)
                : [...prev.selectedInstitutions, inst];
            return { ...prev, selectedInstitutions: newSelection };
        });
    };

    const handleApply = () => {
        setFilters(localFilters);
        onApply();
    };

    const handleClear = () => {
        const cleared = {
            searchTerm: '',
            selectedDisciplines: [],
            selectedYears: [],
            selectedInstitutions: []
        };
        setLocalFilters(cleared);
        setFilters(cleared);
        onClear();
    };
    
    // Calculate counts for badges
    const activeCount = (
        (localFilters.searchTerm ? 1 : 0) +
        localFilters.selectedDisciplines.length +
        localFilters.selectedYears.length +
        localFilters.selectedInstitutions.length
    );

    return (
        <>
            {/* Backdrop */}
            <div 
                className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                onClick={onClose}
            />

            {/* Drawer */}
            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                
                {/* Header */}
                <header className="p-5 border-b bg-gray-50 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <FilterIcon className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">Filtros Avançados</h2>
                        {activeCount > 0 && (
                            <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {activeCount}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <XIcon className="w-6 h-6 text-gray-600" />
                    </button>
                </header>

                {/* Content */}
                <main className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    
                    {/* Search */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Busca Textual</h3>
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={localFilters.searchTerm}
                                onChange={handleSearchChange}
                                placeholder="Busque por temas, palavras-chave..."
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-800 placeholder:text-gray-400 font-medium"
                            />
                        </div>
                    </section>

                    {/* Disciplines (Areas) */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider flex justify-between">
                            Áreas (Disciplinas)
                            <span className="text-gray-400 font-normal normal-case text-xs">{localFilters.selectedDisciplines.length} selecionadas</span>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {disciplines.length > 0 ? disciplines.map(d => {
                                const isSelected = localFilters.selectedDisciplines.includes(d.id);
                                return (
                                    <button
                                        key={d.id}
                                        onClick={() => toggleDiscipline(d.id)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                                            isSelected 
                                            ? 'bg-primary/10 border-primary text-primary' 
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {d.name}
                                    </button>
                                );
                            }) : <p className="text-sm text-gray-400 italic">Nenhuma disciplina disponível.</p>}
                        </div>
                    </section>

                    {/* Years */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Ano</h3>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                            {availableYears.length > 0 ? availableYears.map(year => {
                                const isSelected = localFilters.selectedYears.includes(year);
                                return (
                                    <button
                                        key={year}
                                        onClick={() => toggleYear(year)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                                            isSelected 
                                            ? 'bg-gray-800 border-gray-800 text-white' 
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                                        }`}
                                    >
                                        {year}
                                    </button>
                                );
                            }) : <p className="text-sm text-gray-400 italic">Nenhum ano identificado nos títulos.</p>}
                        </div>
                    </section>

                    {/* Institutions (or Banca) */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">{institutionLabel}</h3>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                            {availableInstitutions.length > 0 ? availableInstitutions.map(inst => {
                                const isSelected = localFilters.selectedInstitutions.includes(inst);
                                return (
                                    <button
                                        key={inst}
                                        onClick={() => toggleInstitution(inst)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                                            isSelected 
                                            ? 'bg-blue-50 border-blue-500 text-blue-700' 
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {isSelected && <CheckCircleIcon className="w-3 h-3" />}
                                        {inst}
                                    </button>
                                );
                            }) : <p className="text-sm text-gray-400 italic">Nenhuma instituição identificada.</p>}
                        </div>
                    </section>

                </main>

                {/* Footer */}
                <footer className="p-5 border-t bg-white flex justify-between items-center flex-shrink-0 gap-4">
                    <button 
                        onClick={handleClear}
                        className="px-4 py-3 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-colors w-1/3"
                    >
                        Limpar
                    </button>
                    <button 
                        onClick={handleApply}
                        className="px-4 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/30 w-2/3 flex justify-center items-center gap-2"
                    >
                        Ver Resultados
                    </button>
                </footer>
            </div>
        </>
    );
};

export default AdvancedFilterPanel;