
import React, { useState, useEffect, useMemo } from 'react';
import * as questionBankService from '../services/questionBankService';
import * as testService from '../services/testService';
import * as academicService from '../services/academicService';
import { Course, Module, Discipline, QuestionSet, QuizQuestion, Student } from '../types';
import { UserIcon, LayersIcon, SlidersHorizontalIcon, XIcon, MoreVerticalIcon, LayoutGridIcon, ListTreeIcon, SearchIcon, BookOpenIcon, ClipboardListIcon, UsersIcon, PlusCircleIcon } from './IconComponents';
import { QuestionSetDetailModal } from './QuestionSetDetailModal';
import EditContentModal from './EditContentModal';
import ContentDetailModal from './ContentDetailModal';
import FlashcardModal from './FlashcardModal';
import SelectStudentModal from './SelectStudentModal';
import MoveItemModal from './MoveItemModal';
import ColumnNavigation, { ColumnDefinition } from './ColumnNavigation';
import AdvancedFilterPanel from './AdvancedFilterPanel';
import CreateTestModal from './CreateTestModal';

type EditingItem = { item: any; type: 'course' | 'module' | 'discipline' | 'question_set' };
type DetailsItem = { level: 'course' | 'module' | 'discipline'; contentId: string; contentName: string; };

interface FilterState {
    searchTerm: string;
    selectedDisciplines: string[];
    selectedYears: string[];
    selectedInstitutions: string[];
}

const StudyBankPage: React.FC = () => {
    const [structuredBank, setStructuredBank] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'columns' | 'grid'>('columns');
    
    // Navigation state
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
    const [selectedDisciplineId, setSelectedDisciplineId] = useState<string | null>(null);

    // Modal States
    const [viewingSet, setViewingSet] = useState<QuestionSet | null>(null);
    const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
    const [viewingDetails, setViewingDetails] = useState<DetailsItem | null>(null);
    const [movingItem, setMovingItem] = useState<QuestionSet | null>(null);

    // Study Flow States
    const [students, setStudents] = useState<Student[]>([]);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [setForStudy, setSetForStudy] = useState<QuestionSet | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Create Test Flow
    const [pendingTestCreation, setPendingTestCreation] = useState<{ name: string, questions: QuizQuestion[], disciplineId: string } | null>(null);

    // Filter States
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        searchTerm: '',
        selectedDisciplines: [],
        selectedYears: [],
        selectedInstitutions: []
    });
    const [isFiltering, setIsFiltering] = useState(false);

    const selectedStudent = useMemo(() => {
        if (!students || students.length === 0 || !selectedStudentId) return null;
        return students.find(s => s.id === selectedStudentId) || null;
    }, [students, selectedStudentId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [data, studentsData] = await Promise.all([
                questionBankService.getStructuredQuestionBank(),
                academicService.getAllStudentsWithDetails()
            ]);
            setStructuredBank(data || []);
            setStudents(studentsData || []);
        } catch (error) {
            console.error("Error loading StudyBank data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Flattened Data for Metrics & Grid
    const allDisciplines = useMemo(() => {
        return structuredBank.flatMap(c => c.modules?.flatMap(m => m.disciplines || []) || []).filter(d => d !== undefined) as Discipline[];
    }, [structuredBank]);

    const allQuestionSets = useMemo(() => {
        return allDisciplines.flatMap(d => d.question_sets?.map(qs => ({ 
            ...qs, 
            disciplineName: d.name,
            relevance: qs.relevance || 'Média',
            incidence: qs.incidence !== undefined ? qs.incidence : 0,
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

    // Filter Logic
    const filteredResults = useMemo(() => {
        if (!isFiltering && viewMode === 'columns') return [];
        
        const baseList = allQuestionSets;

        return baseList.filter(qs => {
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
    }, [allQuestionSets, filters, isFiltering, viewMode]);

    const handleApplyFilters = () => {
        setIsFiltering(true);
        setIsFilterPanelOpen(false);
        setViewMode('grid');
    };

    const handleClearFilters = () => {
        setIsFiltering(false);
        setFilters({ searchTerm: '', selectedDisciplines: [], selectedYears: [], selectedInstitutions: [] });
        setIsFilterPanelOpen(false);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFilters(prev => ({ ...prev, searchTerm: val }));
        if (val.trim() !== '') {
            setIsFiltering(true);
            setViewMode('grid');
        } else if (!filters.selectedDisciplines.length && !filters.selectedYears.length && !filters.selectedInstitutions.length) {
            setIsFiltering(false);
        }
    };

    // Handlers
    const handleCreateTestRequest = async (testName: string, questions: QuizQuestion[], disciplineId: string) => {
        // Instead of creating directly, we open the full CreateTestModal in "Config Mode"
        // This allows the user to set Fixed/Scheduled and select classes/students
        setPendingTestCreation({
            name: testName,
            questions: questions,
            disciplineId: disciplineId
        });
        return true; // Return true to close the inline detail modal
    };
    
    const handleSaveEdit = async (updates: { name: string; image_url: string }) => {
        if (!editingItem) return;
        try {
            const { item, type } = editingItem;
            switch (type) {
                case 'course': await academicService.updateCourse(item.id, updates); break;
                case 'module': await academicService.updateModule(item.id, updates); break;
                case 'discipline': await academicService.updateDiscipline(item.id, updates); break;
                case 'question_set': await questionBankService.updateQuestionSetDetails(item.id, { subjectName: updates.name, imageUrl: updates.image_url }); break;
            }
            setEditingItem(null);
            loadData();
        } catch (err: any) {
            alert(`Falha ao salvar: ${err.message}`);
        }
    };

    const handleDelete = async (id: string, type: string) => { 
        if (!window.confirm("Tem certeza que deseja excluir este item? A ação apagará todo o conteúdo relacionado e não pode ser desfeita.")) return;
        
        setIsDeleting(true);
        try {
            switch (type) {
                case 'course': 
                    await academicService.deleteCourse(id); 
                    setSelectedCourseId(null); 
                    break;
                case 'module': 
                    await academicService.deleteModule(id); 
                    setSelectedModuleId(null); 
                    break;
                case 'discipline': 
                    await academicService.deleteDiscipline(id); 
                    setSelectedDisciplineId(null); 
                    break;
                case 'question_set': 
                    await questionBankService.deleteQuestionSet(id); 
                    setViewingSet(null); 
                    break;
            }
            await loadData();
            alert("Item excluído com sucesso!");
        } catch (err: any) {
            alert(`Falha ao excluir: ${err.message}`);
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleConfirmMove = async (itemId: string, newDisciplineId: string) => {
        const success = await questionBankService.moveQuestionSet(itemId, newDisciplineId);
        if (success) {
            alert("Assunto movido com sucesso!");
            setMovingItem(null);
            await loadData();
        } else {
            alert("Falha ao mover o assunto.");
        }
    };
    
    const handleUpdateSetQuestions = async (setId: string, questions: QuizQuestion[]): Promise<boolean> => {
        const success = await questionBankService.updateQuestionSetQuestions(setId, questions);
        if (success) loadData();
        return success;
    };
    
    const handleStartStudy = (originalSet: QuestionSet, selectedQs: QuizQuestion[]) => {
        const studySet: QuestionSet = { ...originalSet, questions: selectedQs };
        if (selectedStudentId) {
            setSetForStudy(studySet);
        } else {
            setSetForStudy(studySet);
            setIsStudentModalOpen(true);
        }
    };
    
    const handleStudentSelected = (studentId: string) => {
        setSelectedStudentId(studentId);
        setIsStudentModalOpen(false);
    };
    
    const createItem = async (type: 'course' | 'module' | 'discipline' | 'class', parentId: string | null) => {
        const name = prompt(`Nome do novo ${type === 'class' ? 'Turma' : type === 'course' ? 'Curso' : type === 'module' ? 'Módulo' : 'Disciplina'}:`);
        if (!name) return;
        
        try {
            switch (type) {
                case 'course': await academicService.addCourse(name); break;
                case 'module': if(parentId) await academicService.addModule(parentId, name); break;
                case 'discipline': if(parentId) await academicService.addDiscipline(parentId, name); break;
                case 'class': if(parentId) await academicService.addClass(parentId, name); break;
            }
            loadData();
        } catch (e) {
            alert("Erro ao criar item: " + (e as Error).message);
        }
    };


    // Computed Data for Columns
    const selectedCourse = structuredBank.find(c => c.id === selectedCourseId);
    const modules = selectedCourse?.modules || [];
    const selectedModule = modules.find(m => m.id === selectedModuleId);
    const disciplines = selectedModule?.disciplines || [];
    const selectedDiscipline = disciplines.find(d => d.id === selectedDisciplineId);
    const questionSets = selectedDiscipline?.question_sets || [];

    // --- Columns Definition ---
    const columns: ColumnDefinition[] = [
        {
            id: 'courses',
            title: 'Cursos',
            items: structuredBank.map(c => ({ id: c.id, name: c.name, subTitle: `${c.modules?.length || 0} módulos`, imageUrl: c.image_url })),
            selectedId: selectedCourseId,
            onSelect: (item) => { setSelectedCourseId(item.id); setSelectedModuleId(null); setSelectedDisciplineId(null); },
            onAdd: () => createItem('course', null),
            onEdit: (item) => setEditingItem({ item: structuredBank.find(c => c.id === item.id), type: 'course' } as any),
            onDelete: (id) => handleDelete(id, 'course'),
            emptyMessage: "Nenhum curso encontrado."
        }
    ];

    if (selectedCourseId) {
        columns.push({
            id: 'modules',
            title: 'Módulos',
            items: modules.map(m => ({ id: m.id, name: m.name, subTitle: `${m.disciplines?.length || 0} disciplinas`, imageUrl: m.image_url })),
            selectedId: selectedModuleId,
            onSelect: (item) => { setSelectedModuleId(item.id); setSelectedDisciplineId(null); },
            onAdd: () => createItem('module', selectedCourseId),
            onEdit: (item) => setEditingItem({ item: modules.find(m => m.id === item.id), type: 'module' } as any),
            onDelete: (id) => handleDelete(id, 'module'),
            emptyMessage: "Nenhum módulo neste curso."
        });
    }

    if (selectedModuleId) {
        columns.push({
            id: 'disciplines',
            title: 'Disciplinas',
            items: disciplines.map(d => ({ id: d.id, name: d.name, subTitle: `${d.question_sets?.length || 0} assuntos`, imageUrl: d.image_url })),
            selectedId: selectedDisciplineId,
            onSelect: (item) => setSelectedDisciplineId(item.id),
            onAdd: () => createItem('discipline', selectedModuleId),
            onEdit: (item) => setEditingItem({ item: disciplines.find(d => d.id === item.id), type: 'discipline' } as any),
            onDelete: (id) => handleDelete(id, 'discipline'),
            emptyMessage: "Nenhuma disciplina neste módulo."
        });
    }

    if (selectedDisciplineId) {
        columns.push({
            id: 'questionSets',
            title: 'Assuntos',
            items: questionSets.map(qs => ({ 
                id: qs.id, 
                name: qs.subjectName, 
                subTitle: `${qs.question_count ?? qs.questions?.length ?? 0} questões`, 
                imageUrl: qs.image_url 
            })),
            selectedId: viewingSet?.id || null,
            onSelect: (item) => setViewingSet(questionSets.find(qs => qs.id === item.id) || null),
            onEdit: (item) => setEditingItem({ item: questionSets.find(qs => qs.id === item.id), type: 'question_set' } as any),
            onDelete: (id) => handleDelete(id, 'question_set'),
            renderCustomItem: (item) => (
                <div className="flex items-center gap-3 w-full">
                     {item.imageUrl ? (
                        <img src={item.imageUrl} className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-gray-100 flex-shrink-0"/>
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                            <LayersIcon className="w-5 h-5" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                         <p className="font-medium truncate text-sm text-gray-800">{item.name}</p>
                         <p className="text-xs text-gray-500 truncate">{item.subTitle}</p>
                    </div>
                </div>
            ),
            emptyMessage: "Nenhum assunto criado."
        });
    }

    const totalQuestions = allQuestionSets.reduce((acc, curr) => acc + (curr.question_count ?? curr.questions.length), 0);

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto md:overflow-hidden">
            {/* Hero Metrics & Spotlight Section */}
            <div className="bg-white border-b border-gray-200 p-8 flex-shrink-0 shadow-sm relative z-20">
                {/* ... existing header content ... */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Hub de Conhecimento</h1>
                        <p className="text-gray-500 mt-1 text-sm">Gerencie e explore todo o conteúdo acadêmico da plataforma.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isDeleting && (
                            <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg animate-pulse">
                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs font-bold">Excluindo...</span>
                            </div>
                        )}
                        <div className="bg-gray-100 p-1 rounded-lg flex items-center border border-gray-200">
                            <button 
                                onClick={() => setViewMode('columns')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'columns' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Modo Finder (Estrutura)"
                            >
                                <ListTreeIcon className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Modo Explorador (Visual)"
                            >
                                <LayoutGridIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <button 
                            onClick={() => setIsFilterPanelOpen(true)}
                            className={`px-4 py-2.5 font-semibold rounded-lg flex items-center gap-2 text-sm transition-all border ${isFiltering ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                            <SlidersHorizontalIcon className="w-4 h-4" />
                            Filtros
                        </button>
                         {selectedStudent ? (
                            <div className="bg-primary/5 px-4 py-2 rounded-lg border border-primary/10 flex items-center gap-3">
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Modo Prática</p>
                                    <p className="font-bold text-primary text-sm leading-none">{selectedStudent.name}</p>
                                </div>
                                <button onClick={() => setSelectedStudentId(null)} className="text-gray-400 hover:text-gray-600"><XIcon className="w-4 h-4"/></button>
                            </div>
                        ) : (
                             <button onClick={() => setIsStudentModalOpen(true)} className="px-4 py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-black transition-colors flex items-center gap-2 text-sm shadow-lg shadow-900/20">
                                <UserIcon className="w-4 h-4" />
                                Praticar como Aluno
                            </button>
                        )}
                    </div>
                </div>

                {/* Spotlight Search Bar */}
                <div className="relative max-w-3xl w-full mx-auto -mt-2 mb-10">
                    <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        value={filters.searchTerm}
                        onChange={handleSearchChange}
                        placeholder="Buscar conteúdos, disciplinas ou questões..."
                        className="w-full pl-14 pr-4 py-4 bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 focus:ring-4 focus:ring-primary/10 focus:border-primary text-lg outline-none transition-all placeholder:text-gray-400 text-gray-800"
                    />
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-xl border border-blue-100 flex items-center gap-4">
                        <div className="p-3 bg-blue-500 text-white rounded-lg shadow-sm">
                            <BookOpenIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{structuredBank.length}</p>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Cursos Ativos</p>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 rounded-xl border border-purple-100 flex items-center gap-4">
                         <div className="p-3 bg-purple-500 text-white rounded-lg shadow-sm">
                            <ClipboardListIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{allDisciplines.length}</p>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Disciplinas</p>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 p-4 rounded-xl border border-teal-100 flex items-center gap-4">
                         <div className="p-3 bg-teal-500 text-white rounded-lg shadow-sm">
                            <LayersIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{allQuestionSets.length}</p>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Assuntos</p>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-4 rounded-xl border border-orange-100 flex items-center gap-4">
                         <div className="p-3 bg-orange-500 text-white rounded-lg shadow-sm">
                            <UsersIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{totalQuestions}</p>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Questões Totais</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-grow bg-gray-50 p-6 relative flex flex-col md:overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full min-h-[200px]"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                ) : viewMode === 'columns' && !isFiltering ? (
                     <div className="h-[500px] md:h-full w-full rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm flex-shrink-0">
                        <ColumnNavigation columns={columns} />
                    </div>
                ) : (
                    // Grid View (Explorer)
                    <div className="h-auto md:h-full md:overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-700">
                                {isFiltering ? `Resultados da Busca (${filteredResults.length})` : `Todos os Assuntos (${allQuestionSets.length})`}
                            </h2>
                            {isFiltering && (
                                <button onClick={handleClearFilters} className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
                                    <XIcon className="w-4 h-4"/> Limpar Filtros
                                </button>
                            )}
                        </div>
                        
                        {filteredResults.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
                                {filteredResults.map(qs => (
                                    <div 
                                        key={qs.id} 
                                        onClick={() => setViewingSet(qs)}
                                        className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full hover:shadow-lg hover:border-primary/30 transition-all group relative overflow-hidden cursor-pointer"
                                    >
                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                        {/* Header */}
                                        <div className="p-4 flex gap-4">
                                             {qs.image_url ? (
                                                <img src={qs.image_url} alt={qs.subjectName} className="w-20 h-20 rounded-lg object-cover border border-gray-100 flex-shrink-0"/>
                                            ) : (
                                                <div className="w-20 h-20 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0 border border-gray-100">
                                                    <LayersIcon className="w-8 h-8" />
                                                </div>
                                            )}
                                            <div className="flex-grow min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-bold text-gray-800 text-base line-clamp-2 leading-tight mb-1" title={qs.subjectName}>
                                                        {qs.subjectName}
                                                    </h3>
                                                    <div className="relative">
                                                        <button onClick={(e) => { e.stopPropagation(); setEditingItem({ item: qs, type: 'question_set' }); }} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                                                            <MoreVerticalIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 font-medium truncate">
                                                    {(qs as any).disciplineName || 'Disciplina'}
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-md border border-gray-200">
                                                        {qs.question_count ?? qs.questions.length} Qs
                                                    </span>
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${qs.difficulty === 'Difícil' ? 'bg-red-50 text-red-600 border-red-100' : qs.difficulty === 'Fácil' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                        {qs.difficulty}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Metrics Bar */}
                                        <div className="grid grid-cols-2 border-t border-b border-gray-100 divide-x divide-gray-100 bg-gray-50/30">
                                            <div className="p-2 text-center">
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Relevância</p>
                                                <p className={`text-sm font-bold ${qs.relevance === 'Alta' ? 'text-green-600' : qs.relevance === 'Baixa' ? 'text-gray-400' : 'text-yellow-600'}`}>{qs.relevance}</p>
                                            </div>
                                            <div className="p-2 text-center">
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Incidência</p>
                                                <p className="text-sm font-bold text-gray-700">{qs.incidence}%</p>
                                            </div>
                                        </div>

                                        {/* Action Footer */}
                                        <div className="mt-auto p-3 flex justify-between items-center bg-white">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleCreateTestRequest(qs.subjectName, qs.questions, qs.disciplineId); }}
                                                className="text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
                                            >
                                                Criar Teste
                                            </button>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setViewingSet(qs)}
                                                    className="text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
                                                >
                                                    Detalhes
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleStartStudy(qs, qs.questions); }}
                                                    className="text-xs font-bold text-white bg-gray-900 hover:bg-black px-4 py-2 rounded-lg transition-colors shadow-md hover:shadow-lg"
                                                >
                                                    Estudar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center h-96 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-white/50">
                                <SearchIcon className="w-12 h-12 mb-3 opacity-20" />
                                <p className="text-lg font-medium text-gray-500">Nenhum assunto encontrado.</p>
                                <p className="text-sm">Tente ajustar os filtros ou criar um novo conteúdo.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

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

             {/* Management Modals */}
             {viewingSet && (
                <QuestionSetDetailModal 
                    questionSet={viewingSet}
                    onClose={() => setViewingSet(null)}
                    onDelete={(id) => handleDelete(id, 'question_set')}
                    onStudy={handleStartStudy}
                    onCreateTest={(name, questions) => handleCreateTestRequest(name, questions, viewingSet.disciplineId)}
                    onUpdate={handleUpdateSetQuestions}
                    onMoveRequest={(item) => setMovingItem(item)}
                />
            )}
            {editingItem && (
                <EditContentModal
                    item={editingItem.item}
                    type={editingItem.type}
                    onClose={() => setEditingItem(null)}
                    onSave={handleSaveEdit}
                />
            )}
             {viewingDetails && (
                <ContentDetailModal
                    level={viewingDetails.level}
                    contentId={viewingDetails.contentId}
                    contentName={viewingDetails.contentName}
                    onClose={() => setViewingDetails(null)}
                />
            )}
             {movingItem && (
                <MoveItemModal
                    itemToMove={movingItem}
                    structuredData={structuredBank}
                    onClose={() => setMovingItem(null)}
                    onConfirmMove={handleConfirmMove}
                />
            )}
            {isStudentModalOpen && (
                <SelectStudentModal 
                    onClose={() => {
                        setIsStudentModalOpen(false);
                        setSetForStudy(null);
                    }}
                    onStudentSelect={handleStudentSelected}
                />
            )}
            {setForStudy && selectedStudentId && (
                <FlashcardModal
                    studentId={selectedStudentId}
                    questionSet={setForStudy}
                    onClose={() => setSetForStudy(null)}
                />
            )}
            {pendingTestCreation && (
                <CreateTestModal
                    onClose={() => setPendingTestCreation(null)}
                    onTestCreated={() => setPendingTestCreation(null)}
                    initialData={pendingTestCreation}
                />
            )}
        </div>
    );
};

export default StudyBankPage;
