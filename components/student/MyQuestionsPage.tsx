
import React, { useState, useEffect, useMemo } from 'react';
import { Course, Module, Discipline, QuestionSet, Student, StudentFlashcardSession } from '../../types';
import FlashcardModal from '../FlashcardModal';
import { getStructuredQuestionBank } from '../../services/questionBankService';
import * as crmService from '../../services/crmService';
import { LayersIcon, SlidersHorizontalIcon, XIcon } from '../IconComponents';
import ColumnNavigation, { ColumnDefinition } from '../ColumnNavigation';
import AdvancedFilterPanel from '../AdvancedFilterPanel';

interface MyQuestionsPageProps {
    student: Student;
}

interface FilterState {
    searchTerm: string;
    selectedDisciplines: string[];
    selectedYears: string[];
    selectedInstitutions: string[];
}

const MyQuestionsPage: React.FC<MyQuestionsPageProps> = ({ student }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [setForStudy, setSetForStudy] = useState<QuestionSet | null>(null);

    const [activeTab, setActiveTab] = useState<'explore' | 'sessions'>('explore');
    const [inProgressSessions, setInProgressSessions] = useState<StudentFlashcardSession[]>([]);

    // Navigation state
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
    const [selectedDisciplineId, setSelectedDisciplineId] = useState<string | null>(null);

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
            const [allCourses, allSessions] = await Promise.all([
                getStructuredQuestionBank(),
                crmService.getStudentFlashcardSessions(student.id),
            ]);
            setCourses(allCourses);
            
            const ongoing = allSessions.filter(s => s.status === 'in_progress' && s.question_sets && s.current_question_index < (s.question_sets.questions?.length || 0));
            setInProgressSessions(ongoing);

            if (ongoing.length > 0) {
                setActiveTab('sessions');
            }

            setIsLoading(false);
        };
        loadData();
    }, [student.id]);

    // --- Data Processing for Filters ---
    const allDisciplines = useMemo(() => {
        return courses.flatMap(c => c.modules?.flatMap(m => m.disciplines || []) || []).filter(d => d !== undefined) as Discipline[];
    }, [courses]);

    const allQuestionSets = useMemo(() => {
        return allDisciplines.flatMap(d => d.question_sets?.map(qs => ({ 
            ...qs, 
            disciplineName: d.name,
            // Mocking data for visual consistency (until backend provides it)
            relevance: qs.relevance || (Math.random() > 0.5 ? 'Alta' : 'Média'),
            incidence: qs.incidence !== undefined ? qs.incidence : Number((Math.random() * 5).toFixed(2)),
            difficulty: qs.difficulty || (Math.random() > 0.6 ? 'Difícil' : Math.random() > 0.3 ? 'Média' : 'Fácil')
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
        if (!isFiltering) return [];
        
        return allQuestionSets.filter(qs => {
            const matchesSearch = filters.searchTerm === '' || 
                qs.subjectName.toLowerCase().includes(filters.searchTerm.toLowerCase());
            
            const matchesDiscipline = filters.selectedDisciplines.length === 0 || 
                filters.selectedDisciplines.includes(qs.disciplineId);

            const matchesYear = filters.selectedYears.length === 0 || 
                filters.selectedYears.some(year => qs.subjectName.includes(year));

            const matchesInstitution = filters.selectedInstitutions.length === 0 || 
                filters.selectedInstitutions.some(inst => qs.subjectName.includes(inst));

            return matchesSearch && matchesDiscipline && matchesYear && matchesInstitution;
        });
    }, [allQuestionSets, filters, isFiltering]);

    const handleApplyFilters = () => {
        const hasActiveFilters = 
            filters.searchTerm !== '' || 
            filters.selectedDisciplines.length > 0 || 
            filters.selectedYears.length > 0 || 
            filters.selectedInstitutions.length > 0;
        
        setIsFiltering(hasActiveFilters);
        setIsFilterPanelOpen(false);
        setActiveTab('explore'); // Switch to explore tab to show results
    };

    const handleClearFilters = () => {
        setIsFiltering(false);
        setIsFilterPanelOpen(false);
    };

    const handleStartStudy = (set: QuestionSet) => {
        setSetForStudy(set);
    };
    
    const handleContinueStudy = (session: StudentFlashcardSession) => {
        if (session.question_sets) {
            setSetForStudy({
                id: session.question_sets.id,
                subjectName: session.question_sets.subject_name,
                questions: session.question_sets.questions,
                disciplineId: 'unknown',
                createdAt: session.created_at,
            });
        }
    };

    // Computed Data for Columns
    const selectedCourse = courses.find(c => c.id === selectedCourseId);
    const modules = selectedCourse?.modules || [];
    const selectedModule = modules.find(m => m.id === selectedModuleId);
    const disciplines = selectedModule?.disciplines || [];
    const selectedDiscipline = disciplines.find(d => d.id === selectedDisciplineId);
    const questionSets = selectedDiscipline?.question_sets || [];

    const columns: ColumnDefinition[] = [
        {
            id: 'courses',
            title: 'Meus Cursos',
            items: courses.map(c => ({ id: c.id, name: c.name, subTitle: `${c.modules?.length || 0} módulos`, imageUrl: c.image_url })),
            selectedId: selectedCourseId,
            onSelect: (item) => { setSelectedCourseId(item.id); setSelectedModuleId(null); setSelectedDisciplineId(null); },
            emptyMessage: "Nenhum curso disponível."
        }
    ];

    if (selectedCourseId) {
        columns.push({
            id: 'modules',
            title: 'Módulos',
            items: modules.map(m => ({ id: m.id, name: m.name, subTitle: `${m.disciplines?.length || 0} disciplinas`, imageUrl: m.image_url })),
            selectedId: selectedModuleId,
            onSelect: (item) => { setSelectedModuleId(item.id); setSelectedDisciplineId(null); },
            emptyMessage: "Nenhum módulo encontrado."
        });
    }

    if (selectedModuleId) {
        columns.push({
            id: 'disciplines',
            title: 'Disciplinas',
            items: disciplines.map(d => ({ id: d.id, name: d.name, subTitle: `${d.question_sets?.length || 0} assuntos`, imageUrl: d.image_url })),
            selectedId: selectedDisciplineId,
            onSelect: (item) => setSelectedDisciplineId(item.id),
            emptyMessage: "Nenhuma disciplina encontrada."
        });
    }

    if (selectedDisciplineId) {
        columns.push({
            id: 'questionSets',
            title: 'Assuntos para Estudar',
            items: questionSets.map(qs => ({ id: qs.id, name: qs.subjectName, subTitle: `${qs.questions.length} questões`, imageUrl: qs.image_url })),
            selectedId: null,
            onSelect: (item) => {
                const set = questionSets.find(qs => qs.id === item.id);
                if (set) handleStartStudy(set);
            },
            renderCustomItem: (item) => (
                <div className="flex items-center gap-3 w-full group">
                    {item.imageUrl ? (
                        <img src={item.imageUrl} className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-gray-100 flex-shrink-0"/>
                    ) : (
                        <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors flex-shrink-0">
                            <LayersIcon className="w-5 h-5" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                         <p className="font-medium truncate text-sm text-gray-800">{item.name}</p>
                         <p className="text-xs text-gray-500 truncate">{item.subTitle}</p>
                    </div>
                </div>
            ),
            emptyMessage: "Nenhum assunto disponível."
        });
    }

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50 overflow-hidden">
                <header className="px-8 py-4 border-b border-gray-200 bg-white flex-shrink-0 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Minhas Questões</h1>
                        <p className="text-gray-500 mt-1 text-sm">Navegue pelo conteúdo do seu curso e pratique.</p>
                    </div>
                    <button 
                        onClick={() => setIsFilterPanelOpen(true)}
                        className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-2 shadow-sm text-sm transition-all ${isFiltering ? 'bg-primary text-white hover:bg-primary-dark' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                        <SlidersHorizontalIcon className="w-4 h-4" />
                        {isFiltering ? 'Filtros Ativos' : 'Filtrar Conteúdo'}
                    </button>
                </header>
                <div className="px-8 py-4 border-b border-gray-200 bg-white flex-shrink-0">
                    <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                        <button onClick={() => setActiveTab('sessions')} className={`px-4 py-2 font-medium text-sm rounded-md transition-all ${activeTab === 'sessions' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                            Sessões em Andamento ({inProgressSessions.length})
                        </button>
                        <button onClick={() => setActiveTab('explore')} className={`px-4 py-2 font-medium text-sm rounded-md transition-all ${activeTab === 'explore' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                            {isFiltering ? 'Resultados da Busca' : 'Explorar Conteúdo'}
                        </button>
                    </nav>
                </div>
                <main className="flex-grow p-6 overflow-hidden">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                    ) : activeTab === 'explore' ? (
                        isFiltering ? (
                             // --- Filtered Grid View with Rich Cards (Student) ---
                             <div className="h-full flex flex-col">
                                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                   <h2 className="text-lg font-bold text-gray-700">Resultados da Busca ({filteredResults.length})</h2>
                                   <button onClick={() => {setIsFiltering(false); setFilters({ searchTerm: '', selectedDisciplines: [], selectedYears: [], selectedInstitutions: [] });}} className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
                                       <XIcon className="w-4 h-4"/> Limpar Filtros
                                   </button>
                               </div>
                               <div className="flex-grow overflow-y-auto custom-scrollbar">
                                   {filteredResults.length > 0 ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
                                           {filteredResults.map(qs => (
                                               <div 
                                                   key={qs.id} 
                                                   className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full hover:shadow-md transition-all"
                                               >
                                                   {/* Header */}
                                                   <div className="p-4 flex gap-4">
                                                        {qs.image_url ? (
                                                           <img src={qs.image_url} alt={qs.subjectName} className="w-20 h-20 rounded-lg object-cover border border-gray-100 flex-shrink-0"/>
                                                       ) : (
                                                           <div className="w-20 h-20 rounded-lg bg-primary/5 flex items-center justify-center text-primary flex-shrink-0 border border-primary/10">
                                                               <LayersIcon className="w-8 h-8" />
                                                           </div>
                                                       )}
                                                       <div className="flex-grow min-w-0">
                                                           <h3 className="font-bold text-gray-800 text-base line-clamp-2 leading-tight mb-1" title={qs.subjectName}>
                                                               {qs.subjectName}
                                                           </h3>
                                                           <p className="text-xs text-gray-500 font-medium truncate">
                                                               {(qs as any).disciplineName || 'Disciplina'}
                                                           </p>
                                                           <p className="text-[10px] text-gray-400 mt-1">{qs.questions.length} Questões</p>
                                                       </div>
                                                   </div>
   
                                                   {/* Metrics Bar */}
                                                   <div className="grid grid-cols-3 border-t border-b border-gray-100 divide-x divide-gray-100 bg-gray-50/30">
                                                       <div className="p-2 text-center">
                                                           <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Relevância</p>
                                                           <p className={`text-sm font-bold ${qs.relevance === 'Alta' ? 'text-green-600' : qs.relevance === 'Baixa' ? 'text-gray-400' : 'text-yellow-600'}`}>{qs.relevance}</p>
                                                       </div>
                                                       <div className="p-2 text-center">
                                                           <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Incidência</p>
                                                           <p className="text-sm font-bold text-gray-700">{qs.incidence}%</p>
                                                       </div>
                                                       <div className="p-2 text-center">
                                                           <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Dificuldade</p>
                                                           <p className={`text-sm font-bold ${qs.difficulty === 'Difícil' ? 'text-red-600' : qs.difficulty === 'Fácil' ? 'text-blue-600' : 'text-orange-600'}`}>{qs.difficulty}</p>
                                                       </div>
                                                   </div>
   
                                                   {/* Action Footer */}
                                                   <div className="mt-auto p-3 flex justify-around items-center bg-white rounded-b-xl">
                                                       <button 
                                                           onClick={() => alert("Funcionalidade de Resumo em breve!")}
                                                           className="text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded-md transition-colors"
                                                       >
                                                           Resumo
                                                       </button>
                                                       <button 
                                                           onClick={() => handleStartStudy(qs)}
                                                           className="text-sm font-semibold text-primary hover:text-primary-dark hover:bg-primary/5 px-3 py-1.5 rounded-md transition-colors"
                                                       >
                                                           Estudar Agora
                                                       </button>
                                                   </div>
                                               </div>
                                           ))}
                                       </div>
                                   ) : (
                                       <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                           <p className="text-lg font-medium">Nenhum resultado encontrado.</p>
                                           <p className="text-sm">Tente ajustar seus filtros de busca.</p>
                                       </div>
                                   )}
                               </div>
                           </div>
                        ) : (
                            <ColumnNavigation columns={columns} />
                        )
                    ) : (
                        <div className="space-y-4 overflow-y-auto h-full p-2">
                             {inProgressSessions.length === 0 && (
                                <div className="text-center py-20 text-gray-500">
                                    <LayersIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>Você não tem sessões em andamento.</p>
                                </div>
                             )}
                             {inProgressSessions.map(session => {
                                if (!session.question_sets) return null;
                                const totalQuestions = session.question_sets.questions.length;
                                const progressPercent = totalQuestions > 0 ? ((session.current_question_index) / totalQuestions) * 100 : 0;

                                return (
                                    <div key={session.id} className="bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="flex-grow w-full">
                                            <h3 className="font-bold text-gray-800 text-lg">{session.question_sets.subject_name}</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Parou na questão <span className="font-semibold text-primary">{session.current_question_index + 1}</span> de {totalQuestions}
                                            </p>
                                            <div className="w-full bg-gray-100 rounded-full h-2 mt-3 overflow-hidden">
                                                <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleContinueStudy(session)}
                                            className="px-6 py-2.5 bg-primary text-white font-semibold rounded-lg text-sm hover:bg-primary-dark transition-colors flex-shrink-0 w-full sm:w-auto shadow-sm"
                                        >
                                            Continuar
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>

            {/* Advanced Filter Drawer */}
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

            {setForStudy && (
                <FlashcardModal
                    studentId={student.id}
                    questionSet={setForStudy as { id: string; subjectName: string; questions: any[]}}
                    onClose={() => setSetForStudy(null)}
                />
            )}
        </>
    );
};

export default MyQuestionsPage;
