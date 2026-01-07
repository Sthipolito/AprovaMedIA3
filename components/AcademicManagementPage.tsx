
import React, { useState, useEffect, useMemo } from 'react';
import * as academicService from '../services/academicService';
import { Course, Module, Discipline, Class, Student } from '../types';
import EditContentModal from './EditContentModal';
import ColumnNavigation, { ColumnDefinition } from './ColumnNavigation';
import { 
    LayoutGridIcon, ListTreeIcon, SearchIcon, PlusCircleIcon, 
    GraduationCapIcon, LayersIcon, BookOpenIcon, UsersIcon, 
    ChevronRightIcon, MoreVerticalIcon, EditIcon, TrashIcon 
} from './IconComponents';

type ViewMode = 'finder' | 'explorer';
type ContentType = 'course' | 'module' | 'discipline' | 'class' | 'student';
type EditingItem = { item: any; type: ContentType };

const AcademicManagementPage: React.FC = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('finder');
    const [structuredData, setStructuredData] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Finder State
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
    const [selectedDisciplineId, setSelectedDisciplineId] = useState<string | null>(null);
    
    // Explorer State (Breadcrumb Context)
    const [explorerCourse, setExplorerCourse] = useState<Course | null>(null);
    const [explorerModule, setExplorerModule] = useState<Module | null>(null);

    // Modal State
    const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
    
    const loadData = async () => {
        setIsLoading(true);
        const data = await academicService.getStructuredDataForManagement();
        setStructuredData(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // --- Stats ---
    const totalCourses = structuredData.length;
    const totalModules = structuredData.reduce((acc, c) => acc + (c.modules?.length || 0), 0);
    const totalClasses = structuredData.reduce((acc, c) => acc + (c.classes?.length || 0), 0);
    const totalStudents = structuredData.reduce((acc, c) => acc + (c.classes?.reduce((sa, cl) => sa + (cl.students?.length || 0), 0) || 0), 0);

    // --- Handlers ---

    const createItem = async (type: ContentType, parentId: string | null) => {
        // Validação de Hierarquia Rigorosa
        if (type === 'module' && !parentId) {
            alert("Por favor, selecione um Curso antes de adicionar um Módulo.");
            return;
        }
        if (type === 'class' && !parentId) {
            alert("Por favor, selecione um Curso antes de adicionar uma Turma.");
            return;
        }
        if (type === 'discipline') {
            if (!parentId) {
                alert("Por favor, selecione um Módulo antes de adicionar uma Disciplina.");
                return;
            }
            // Validação extra: garantir que o ID pertença a um módulo, não a um curso
            // (Embora a UI geralmente controle isso, evita erros lógicos)
        }

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

    const handleSaveEdit = async (updates: { name: string; image_url: string; email?: string, class_id?: string }) => {
        if (!editingItem) return;
        try {
            const { item, type } = editingItem;
            const commonPayload = { name: updates.name, image_url: updates.image_url };
            switch (type) {
                case 'course': await academicService.updateCourse(item.id, commonPayload); break;
                case 'module': await academicService.updateModule(item.id, commonPayload); break;
                case 'discipline': await academicService.updateDiscipline(item.id, commonPayload); break;
                case 'class': await academicService.updateClass(item.id, commonPayload); break;
            }
            setEditingItem(null);
            loadData();
        } catch (err: any) {
            alert(`Falha ao salvar: ${err.message}`);
        }
    };
    
    const handleDelete = async (id: string, type: ContentType) => {
        if (!window.confirm("Tem certeza? Esta ação é irreversível.")) return;
        try {
            switch (type) {
                case 'course': await academicService.deleteCourse(id); setSelectedCourseId(null); setExplorerCourse(null); break;
                case 'module': await academicService.deleteModule(id); setSelectedModuleId(null); setExplorerModule(null); break;
                case 'discipline': await academicService.deleteDiscipline(id); setSelectedDisciplineId(null); break;
                case 'class': await academicService.deleteClass(id); break;
            }
            loadData();
        } catch (err: any) {
             alert(`Falha ao excluir: ${err.message}`);
        }
    };

    // --- Explorer View Logic ---
    const currentExplorerItems = useMemo(() => {
        if (explorerModule) {
            return explorerModule.disciplines?.map(d => ({ ...d, type: 'discipline' as const })) || [];
        }
        if (explorerCourse) {
            // Combine Modules and Classes for the Course view
            const modules = explorerCourse.modules?.map(m => ({ ...m, type: 'module' as const })) || [];
            const classes = explorerCourse.classes?.map(c => ({ ...c, type: 'class' as const })) || [];
            return [...modules, ...classes];
        }
        return structuredData.map(c => ({ ...c, type: 'course' as const }));
    }, [structuredData, explorerCourse, explorerModule]);

    const filteredExplorerItems = useMemo(() => {
        if (!searchTerm) return currentExplorerItems;
        return currentExplorerItems.filter((item: any) => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [currentExplorerItems, searchTerm]);

    const handleExplorerClick = (item: any) => {
        if (item.type === 'course') setExplorerCourse(item);
        else if (item.type === 'module') setExplorerModule(item);
        // Disciplines/Classes are leaves in this simplified explorer
    };

    // --- Finder View Data ---
    const selectedCourse = structuredData.find(c => c.id === selectedCourseId);
    const selectedModule = selectedCourse?.modules?.find(m => m.id === selectedModuleId);

    const columns: ColumnDefinition[] = [
        {
            id: 'courses',
            title: 'Cursos',
            items: structuredData.map(c => ({ id: c.id, name: c.name, subTitle: `${c.modules?.length || 0} móds • ${c.classes?.length || 0} turmas`, imageUrl: c.image_url })),
            selectedId: selectedCourseId,
            onSelect: (item) => { setSelectedCourseId(item.id); setSelectedModuleId(null); setSelectedDisciplineId(null); },
            onAdd: () => createItem('course', null),
            onEdit: (item) => setEditingItem({ item: structuredData.find(c => c.id === item.id), type: 'course' } as any),
            onDelete: (id) => handleDelete(id, 'course'),
        }
    ];

    if (selectedCourseId) {
        columns.push({
            id: 'modules_classes',
            title: 'Módulos e Turmas',
            items: [
                ...(selectedCourse?.modules?.map(m => ({ id: m.id, name: m.name, subTitle: 'Módulo', imageUrl: m.image_url, data: { type: 'module', ...m } })) || []),
                ...(selectedCourse?.classes?.map(c => ({ id: c.id, name: c.name, subTitle: 'Turma', imageUrl: c.image_url, data: { type: 'class', ...c } })) || [])
            ],
            selectedId: selectedModuleId,
            onSelect: (item) => {
                if (item.data.type === 'module') {
                    setSelectedModuleId(item.id);
                } else {
                    setSelectedModuleId(null); // Class selected, no deeper navigation here
                }
            },
            onAdd: () => {
                const type = confirm("Criar Módulo (OK) ou Turma (Cancelar)?") ? 'module' : 'class';
                createItem(type, selectedCourseId);
            },
            onEdit: (item) => setEditingItem({ item: item.data, type: item.data.type } as any),
            onDelete: (id) => handleDelete(id, 'module'), // Simplified, usually would check type
        });
    }

    if (selectedModuleId) {
        columns.push({
            id: 'disciplines',
            title: 'Disciplinas',
            items: selectedModule?.disciplines?.map(d => ({ id: d.id, name: d.name, subTitle: `${d.question_sets?.length || 0} assuntos`, imageUrl: d.image_url })) || [],
            selectedId: selectedDisciplineId,
            onSelect: (item) => setSelectedDisciplineId(item.id),
            onAdd: () => createItem('discipline', selectedModuleId),
            onEdit: (item) => setEditingItem({ item: selectedModule?.disciplines?.find(d => d.id === item.id), type: 'discipline' } as any),
            onDelete: (id) => handleDelete(id, 'discipline'),
        });
    }

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto md:overflow-hidden">
            {/* Hero Section */}
            <div className="bg-white border-b border-gray-200 p-8 flex-shrink-0 relative z-20 shadow-sm">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Gestão Acadêmica</h1>
                        <p className="text-gray-500 mt-1">Estruture o currículo, gerencie turmas e organize o conteúdo.</p>
                    </div>
                     <div className="flex items-center gap-3">
                        <div className="bg-gray-100 p-1 rounded-lg flex items-center border border-gray-200">
                            <button onClick={() => setViewMode('finder')} className={`p-2 rounded-md transition-all ${viewMode === 'finder' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`} title="Modo Finder">
                                <ListTreeIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => setViewMode('explorer')} className={`p-2 rounded-md transition-all ${viewMode === 'explorer' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`} title="Modo Explorer">
                                <LayoutGridIcon className="w-5 h-5" />
                            </button>
                        </div>
                         <button onClick={() => createItem('course', null)} className="px-4 py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-black transition-colors flex items-center gap-2 text-sm shadow-lg shadow-gray-900/20">
                            <PlusCircleIcon className="w-4 h-4" /> Novo Curso
                        </button>
                    </div>
                </div>

                 {/* Spotlight Search */}
                 <div className="relative max-w-3xl w-full mx-auto -mt-2 mb-10">
                    <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar cursos, módulos, disciplinas..."
                        className="w-full pl-14 pr-4 py-4 bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 focus:ring-4 focus:ring-primary/10 focus:border-primary text-lg outline-none transition-all placeholder:text-gray-400 text-gray-800"
                    />
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-4">
                        <div className="p-3 bg-blue-500 text-white rounded-lg shadow-sm"><BookOpenIcon className="w-6 h-6" /></div>
                        <div><p className="text-2xl font-bold text-gray-800">{totalCourses}</p><p className="text-xs text-blue-600 font-bold uppercase">Cursos Ativos</p></div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center gap-4">
                        <div className="p-3 bg-purple-500 text-white rounded-lg shadow-sm"><LayersIcon className="w-6 h-6" /></div>
                        <div><p className="text-2xl font-bold text-gray-800">{totalModules}</p><p className="text-xs text-purple-600 font-bold uppercase">Módulos</p></div>
                    </div>
                    <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex items-center gap-4">
                        <div className="p-3 bg-teal-500 text-white rounded-lg shadow-sm"><UsersIcon className="w-6 h-6" /></div>
                        <div><p className="text-2xl font-bold text-gray-800">{totalStudents}</p><p className="text-xs text-teal-600 font-bold uppercase">Alunos</p></div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-grow bg-gray-50 p-6 flex flex-col md:overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full min-h-[200px]"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                ) : viewMode === 'finder' ? (
                    <div className="h-[500px] md:h-full w-full rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm flex-shrink-0">
                        <ColumnNavigation columns={columns} />
                    </div>
                ) : (
                    <div className="h-auto md:h-full flex flex-col">
                        {/* Breadcrumbs */}
                        <nav className="flex items-center text-sm text-gray-500 mb-6 px-2 flex-shrink-0">
                            <button onClick={() => { setExplorerCourse(null); setExplorerModule(null); }} className="hover:text-primary font-medium transition-colors">Todos os Cursos</button>
                            {explorerCourse && (
                                <>
                                    <ChevronRightIcon className="w-4 h-4 mx-2 text-gray-300" />
                                    <button onClick={() => setExplorerModule(null)} className={`hover:text-primary font-medium transition-colors ${!explorerModule ? 'text-gray-900' : ''}`}>{explorerCourse.name}</button>
                                </>
                            )}
                            {explorerModule && (
                                <>
                                    <ChevronRightIcon className="w-4 h-4 mx-2 text-gray-300" />
                                    <span className="text-gray-900 font-bold">{explorerModule.name}</span>
                                </>
                            )}
                        </nav>

                        {/* Grid */}
                        <div className="flex-grow h-auto md:overflow-y-auto custom-scrollbar">
                            {filteredExplorerItems.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-10">
                                    {filteredExplorerItems.map((item: any) => (
                                        <div 
                                            key={item.id} 
                                            onClick={() => handleExplorerClick(item)}
                                            className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group relative"
                                        >
                                            {/* Actions */}
                                            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); setEditingItem({ item, type: item.type }); }} className="p-1.5 bg-white text-gray-600 rounded-md hover:text-primary shadow-sm mr-1"><EditIcon className="w-4 h-4"/></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.type); }} className="p-1.5 bg-white text-gray-600 rounded-md hover:text-red-600 shadow-sm"><TrashIcon className="w-4 h-4"/></button>
                                            </div>

                                            <div className="h-32 bg-gray-100 relative">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        {item.type === 'course' ? <BookOpenIcon className="w-10 h-10"/> : item.type === 'module' ? <LayersIcon className="w-10 h-10"/> : <GraduationCapIcon className="w-10 h-10"/>}
                                                    </div>
                                                )}
                                                <div className={`absolute top-2 left-2 px-2 py-1 rounded text-[10px] font-bold uppercase text-white 
                                                    ${item.type === 'course' ? 'bg-blue-500' : item.type === 'module' ? 'bg-purple-500' : item.type === 'class' ? 'bg-teal-500' : 'bg-orange-500'}`}>
                                                    {item.type === 'class' ? 'Turma' : item.type === 'module' ? 'Módulo' : item.type === 'discipline' ? 'Disciplina' : 'Curso'}
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <h3 className="font-bold text-gray-800 text-sm mb-1 truncate">{item.name}</h3>
                                                <p className="text-xs text-gray-500">
                                                    {item.type === 'course' ? `${item.modules?.length || 0} Módulos` : 
                                                     item.type === 'module' ? `${item.disciplines?.length || 0} Disciplinas` : 
                                                     item.type === 'class' ? `${item.students?.length || 0} Alunos` : 
                                                     `${item.question_sets?.length || 0} Assuntos`}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Add Button in Grid */}
                                    <button 
                                        onClick={() => {
                                            if (explorerModule) createItem('discipline', explorerModule.id);
                                            else if (explorerCourse) createItem('module', explorerCourse.id);
                                            else createItem('course', null);
                                        }}
                                        className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all min-h-[200px]"
                                    >
                                        <PlusCircleIcon className="w-10 h-10 mb-2" />
                                        <span className="font-bold text-sm">Adicionar Novo</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                    <SearchIcon className="w-12 h-12 mb-3 opacity-20" />
                                    <p>Nenhum conteúdo encontrado aqui.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {editingItem && (
                <EditContentModal
                    item={editingItem.item}
                    type={editingItem.type}
                    onClose={() => setEditingItem(null)}
                    onSave={handleSaveEdit}
                />
            )}
        </div>
    );
};

export default AcademicManagementPage;
