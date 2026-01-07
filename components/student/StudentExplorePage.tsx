
import React, { useState, useEffect, useMemo } from 'react';
import { Course, Discipline, QuestionSet, Student } from '../../types';
import { getStructuredQuestionBank } from '../../services/questionBankService';
import * as studyLibraryService from '../../services/studyLibraryService';
import { LayersIcon, SlidersHorizontalIcon, XIcon, CheckCircleIcon, PlusCircleIcon, GlobeIcon } from '../IconComponents';
import AdvancedFilterPanel from '../AdvancedFilterPanel';

interface StudentExplorePageProps {
    student: Student;
}

interface FilterState {
    searchTerm: string;
    selectedDisciplines: string[];
    selectedYears: string[];
    selectedInstitutions: string[];
}

const StudentExplorePage: React.FC<StudentExplorePageProps> = ({ student }) => {
    const [structuredBank, setStructuredBank] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [librarySetIds, setLibrarySetIds] = useState<Set<string>>(new Set());
    const [isAdding, setIsAdding] = useState<string | null>(null);

    // Filter States
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        searchTerm: '',
        selectedDisciplines: [],
        selectedYears: [],
        selectedInstitutions: []
    });
    const [isFiltering, setIsFiltering] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const [bankData, libIds] = await Promise.all([
                getStructuredQuestionBank(),
                studyLibraryService.getLibrarySetIds(student.id)
            ]);
            setStructuredBank(bankData);
            setLibrarySetIds(libIds);
            setIsLoading(false);
        };
        loadData();
    }, [student.id]);

    // --- Data Processing for Filters ---
    const allDisciplines = useMemo(() => {
        return structuredBank.flatMap(c => c.modules?.flatMap(m => m.disciplines || []) || []).filter(d => d !== undefined) as Discipline[];
    }, [structuredBank]);

    const allQuestionSets = useMemo(() => {
        return allDisciplines.flatMap(d => d.question_sets?.map(qs => ({ 
            ...qs, 
            disciplineName: d.name,
            // Mock metadata if missing
            relevance: qs.relevance || 'Média',
            incidence: qs.incidence !== undefined ? qs.incidence : 1.5,
            difficulty: qs.difficulty || 'Média'
        })) || []);
    }, [allDisciplines]);

    const { availableYears, availableInstitutions } = useMemo(() => {
        const years = new Set<string>();
        const institutions = new Set<string>();
        
        const yearRegex = /\b(19|20)\d{2}\b/g;
        const instRegex = /\b[A-Z]{2,6}\b/g;

        allQuestionSets.forEach(qs => {
            const name = qs.subjectName;
            const foundYears = name.match(yearRegex);
            if (foundYears) foundYears.forEach(y => years.add(y));

            const foundInsts = name.match(instRegex);
            if (foundInsts) {
                foundInsts.forEach(inst => {
                    if (!['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'EM', 'NA', 'DA', 'DO', 'DE'].includes(inst)) {
                        institutions.add(inst);
                    }
                });
            }
        });

        return {
            availableYears: Array.from(years).sort().reverse(),
            availableInstitutions: Array.from(institutions).sort()
        };
    }, [allQuestionSets]);

    const filteredResults = useMemo(() => {
        const activeItems = isFiltering ? allQuestionSets.filter(qs => {
            const matchesSearch = filters.searchTerm === '' || 
                qs.subjectName.toLowerCase().includes(filters.searchTerm.toLowerCase());
            const matchesDiscipline = filters.selectedDisciplines.length === 0 || 
                filters.selectedDisciplines.includes(qs.disciplineId);
            const matchesYear = filters.selectedYears.length === 0 || 
                filters.selectedYears.some(year => qs.subjectName.includes(year));
            const matchesInstitution = filters.selectedInstitutions.length === 0 || 
                filters.selectedInstitutions.some(inst => qs.subjectName.includes(inst));
            return matchesSearch && matchesDiscipline && matchesYear && matchesInstitution;
        }) : allQuestionSets; // Show all if not filtering

        return activeItems;
    }, [allQuestionSets, filters, isFiltering]);

    const handleApplyFilters = () => {
        setIsFiltering(true);
        setIsFilterPanelOpen(false);
    };

    const handleClearFilters = () => {
        setIsFiltering(false);
        setFilters({ searchTerm: '', selectedDisciplines: [], selectedYears: [], selectedInstitutions: [] });
        setIsFilterPanelOpen(false);
    };

    const handleToggleLibrary = async (setId: string) => {
        if (isAdding) return;
        setIsAdding(setId);
        
        if (librarySetIds.has(setId)) {
            const success = await studyLibraryService.removeFromLibrary(student.id, setId);
            if (success) {
                const newSet = new Set(librarySetIds);
                newSet.delete(setId);
                setLibrarySetIds(newSet);
            }
        } else {
            const success = await studyLibraryService.addToLibrary(student.id, setId);
            if (success) {
                const newSet = new Set(librarySetIds);
                newSet.add(setId);
                setLibrarySetIds(newSet);
            }
        }
        setIsAdding(null);
    };

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50 overflow-hidden">
                <header className="px-8 py-6 border-b border-gray-200 bg-white flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <GlobeIcon className="w-7 h-7 text-primary" />
                                Explorar Banco
                            </h1>
                            <p className="text-gray-500 mt-1 text-sm">Encontre e adicione novos materiais à sua biblioteca de estudos.</p>
                        </div>
                         <button 
                            onClick={() => setIsFilterPanelOpen(true)}
                            className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-2 shadow-sm text-sm transition-all ${isFiltering ? 'bg-primary text-white hover:bg-primary-dark' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                            <SlidersHorizontalIcon className="w-4 h-4" />
                            {isFiltering ? 'Filtros Ativos' : 'Filtrar Conteúdo'}
                        </button>
                    </div>
                    
                    {/* Quick Tags / Categories (Optional Visual Enhancement) */}
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 whitespace-nowrap">Mais Recentes</span>
                        <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 whitespace-nowrap">Alta Relevância</span>
                        <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 whitespace-nowrap">Cardiologia</span>
                         <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 whitespace-nowrap">Pediatria</span>
                    </div>
                </header>

                <main className="flex-grow p-6 overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                    ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredResults.length > 0 ? filteredResults.map(qs => {
                                const isAdded = librarySetIds.has(qs.id);
                                return (
                                    <div key={qs.id} className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full hover:shadow-md transition-all group">
                                        <div className="p-5 flex gap-4">
                                             {qs.image_url ? (
                                                <img src={qs.image_url} alt={qs.subjectName} className="w-20 h-20 rounded-xl object-cover border border-gray-100 flex-shrink-0"/>
                                            ) : (
                                                <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                                                    <LayersIcon className="w-8 h-8" />
                                                </div>
                                            )}
                                            <div className="flex-grow min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-bold text-gray-800 text-base line-clamp-2 leading-tight mb-1" title={qs.subjectName}>
                                                        {qs.subjectName}
                                                    </h3>
                                                </div>
                                                <p className="text-xs text-gray-500 font-medium truncate mb-2">
                                                    {(qs as any).disciplineName || 'Disciplina Geral'}
                                                </p>
                                                 <div className="flex gap-2">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${qs.difficulty === 'Difícil' ? 'bg-red-100 text-red-700' : qs.difficulty === 'Fácil' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {qs.difficulty}
                                                    </span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">
                                                        {qs.questions.length} Questões
                                                    </span>
                                                 </div>
                                            </div>
                                        </div>

                                        {/* Metrics Strip */}
                                        <div className="grid grid-cols-2 border-t border-b border-gray-100 divide-x divide-gray-100 bg-gray-50/50">
                                            <div className="p-2 text-center">
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Relevância</p>
                                                <p className="text-sm font-bold text-gray-700">{qs.relevance}</p>
                                            </div>
                                            <div className="p-2 text-center">
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Incidência</p>
                                                <p className="text-sm font-bold text-gray-700">{qs.incidence}%</p>
                                            </div>
                                        </div>

                                        {/* Footer Action */}
                                        <div className="mt-auto p-4">
                                            <button 
                                                onClick={() => handleToggleLibrary(qs.id)}
                                                disabled={isAdding === qs.id}
                                                className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all
                                                    ${isAdded 
                                                        ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700 border border-green-200 hover:border-red-200 group-hover:content-["Remover"]' 
                                                        : 'bg-primary text-white hover:bg-primary-dark shadow-sm hover:shadow'
                                                    }`}
                                            >
                                                {isAdding === qs.id ? (
                                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                ) : isAdded ? (
                                                    <>
                                                        <CheckCircleIcon className="w-5 h-5" />
                                                        <span>Adicionado</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <PlusCircleIcon className="w-5 h-5" />
                                                        <span>Adicionar à Biblioteca</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-500">
                                    <GlobeIcon className="w-12 h-12 text-gray-300 mb-2" />
                                    <p className="text-lg font-medium">Nenhum conteúdo encontrado.</p>
                                    <p className="text-sm">Tente buscar por outros termos.</p>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

             <AdvancedFilterPanel 
                isOpen={isFilterPanelOpen}
                onClose={() => setIsFilterPanelOpen(false)}
                disciplines={allDisciplines}
                availableYears={availableYears}
                availableInstitutions={availableInstitutions}
                filters={filters}
                setFilters={setFilters}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
            />
        </>
    );
};

export default StudentExplorePage;
