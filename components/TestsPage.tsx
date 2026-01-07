
import React, { useState, useEffect, useMemo } from 'react';
import { ClipboardListIcon, PlusCircleIcon, UploadCloudIcon, XIcon, FileTextIcon, SlidersHorizontalIcon, UsersIcon, CalendarIcon } from './IconComponents';
import * as testService from '../services/testService';
import { TestWithAnalytics } from '../services/testService';
import * as academicService from '../services/academicService';
import { usePdfParser } from '../hooks/usePdfParser';
import * as geminiService from '../services/geminiService';
import TestCard from './TestCard';
import CreateTestModal from './CreateTestModal';
import TestDetailModal from './TestDetailModal';
import EditTestModal from './EditTestModal';
import AdvancedFilterPanel from './AdvancedFilterPanel';

// --- Components ---

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; color?: string }> = ({ title, value, icon: Icon, color = "text-primary" }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4 transition-all hover:shadow-md">
        <div className={`p-3 rounded-full bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
            <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div>
            <p className="text-sm font-semibold text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

type ActiveTab = 'fixed' | 'scheduled';

type TestWithContext = TestWithAnalytics & {
    moduleName?: string;
    disciplineName?: string;
};

interface FilterState {
    searchTerm: string;
    selectedDisciplines: string[];
    selectedYears: string[];
    selectedInstitutions: string[]; // Maps to 'Banca'
}

// --- Mini Extractor Modal for Full Exams ---
const UploadExamModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
    const { parsePdf, isLoading: isParsing, error: parseError } = usePdfParser();
    const [file, setFile] = useState<File | null>(null);
    const [examName, setExamName] = useState('');
    const [banca, setBanca] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            if(!examName) setExamName(e.target.files[0].name.replace('.pdf', ''));
        }
    };

    const handleUpload = async () => {
        if (!file || !examName.trim() || !banca.trim()) {
            alert("Preencha todos os campos.");
            return;
        }
        setIsExtracting(true);
        try {
            const parsed = await parsePdf(file);
            if (!parsed || !parsed.text) throw new Error("Falha ao ler PDF.");
            
            const questions = await geminiService.extractQuestionsFromPdf(parsed.text);
            if (!questions || questions.length === 0) throw new Error("Nenhuma questão encontrada.");

            await testService.createTest(examName, questions, 'fixed', { banca: banca });
            
            alert(`Prova "${examName}" criada com ${questions.length} questões!`);
            onCreated();
            onClose();
        } catch (e: any) {
            alert(`Erro: ${e.message}`);
        } finally {
            setIsExtracting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Upload de Prova na Íntegra</h3>
                    <button onClick={onClose}><XIcon className="w-5 h-5"/></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Prova</label>
                        <input type="text" value={examName} onChange={e => setExamName(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Ex: ENARE 2024"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Banca Examinadora</label>
                        <input type="text" value={banca} onChange={e => setBanca(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Ex: FGV, Cebraspe..."/>
                    </div>
                    <label className="block w-full p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 text-center">
                        <UploadCloudIcon className="w-8 h-8 text-gray-400 mx-auto mb-2"/>
                        <span className="text-sm text-gray-600">{file ? file.name : "Selecionar PDF da Prova"}</span>
                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                    </label>
                    {parseError && <p className="text-red-500 text-sm">{parseError}</p>}
                    
                    <button 
                        onClick={handleUpload} 
                        disabled={isParsing || isExtracting || !file}
                        className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark disabled:bg-gray-300 flex justify-center items-center gap-2"
                    >
                        {(isParsing || isExtracting) && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        {isParsing ? 'Lendo PDF...' : isExtracting ? 'Extraindo Questões...' : 'Processar e Criar Prova'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const TestsPage: React.FC = () => {
    const [allTests, setAllTests] = useState<TestWithContext[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ActiveTab>('fixed');
    
    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [viewingTest, setViewingTest] = useState<TestWithContext | null>(null);
    const [editingTest, setEditingTest] = useState<TestWithContext | null>(null);
    
    // Filters and Data for Filter Panel
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [allDisciplines, setAllDisciplines] = useState<{id: string, name: string}[]>([]);
    const [filters, setFilters] = useState<FilterState>({
        searchTerm: '',
        selectedDisciplines: [],
        selectedYears: [],
        selectedInstitutions: []
    });
    const [isFiltering, setIsFiltering] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [testsData, bankData] = await Promise.all([
                testService.getTestsWithAnalytics(),
                academicService.getStructuredDataForManagement(),
            ]);

            const moduleMap = new Map<string, { name: string; }>();
            const disciplineMap = new Map<string, { name: string; moduleId: string }>();
            const extractedDisciplines: {id: string, name: string}[] = [];

            bankData.forEach(course => {
                course.modules?.forEach(module => {
                    moduleMap.set(module.id, { name: module.name });
                    module.disciplines?.forEach(discipline => {
                        disciplineMap.set(discipline.id, { name: discipline.name, moduleId: module.id });
                        extractedDisciplines.push({ id: discipline.id, name: discipline.name });
                    });
                });
            });
            setAllDisciplines(extractedDisciplines);

            const testsWithContext = testsData.map(test => {
                const discipline = test.discipline_id ? disciplineMap.get(test.discipline_id) : undefined;
                const module = test.module_id 
                    ? moduleMap.get(test.module_id) 
                    : (discipline ? moduleMap.get(discipline.moduleId) : undefined);
                
                return {
                    ...test,
                    disciplineName: discipline?.name,
                    moduleName: module?.name,
                };
            });

            setAllTests(testsWithContext);
        } catch (error) {
            console.error("Failed to fetch tests:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDeleteTest = async (testId: string) => {
        if (window.confirm("Tem certeza de que deseja excluir esta prova? Esta ação é irreversível.")) {
            try {
                await testService.deleteTest(testId);
                alert("Prova excluída com sucesso.");
                fetchData();
            } catch (err: any) {
                const errorMessage = `Falha ao excluir a prova: ${err.message}`;
                console.error(errorMessage, err);
                alert(errorMessage);
            }
        }
    };

    // Derived Data for Filter Panel
    const { availableYears, availableInstitutions } = useMemo(() => {
        const years = new Set<string>();
        const institutions = new Set<string>();
        const yearRegex = /\b(19|20)\d{2}\b/g;
        
        allTests.forEach(test => {
            // Extract Year from name
            const foundYears = test.name.match(yearRegex);
            if (foundYears) foundYears.forEach(y => years.add(y));

            // Use 'banca' field as Institution if available
            if (test.banca) {
                institutions.add(test.banca);
            }
        });

        return {
            availableYears: Array.from(years).sort().reverse(),
            availableInstitutions: Array.from(institutions).sort()
        };
    }, [allTests]);

    // Metrics Calculation
    const stats = useMemo(() => {
        const totalTests = allTests.length;
        const totalQuestions = allTests.reduce((acc, t) => acc + (t.questions?.length || 0), 0);
        const totalAttempts = allTests.reduce((acc, t) => acc + (t.attemptCount || 0), 0);
        const activeSchedules = allTests.filter(t => t.test_type === 'scheduled').length;
        return { totalTests, totalQuestions, totalAttempts, activeSchedules };
    }, [allTests]);

    // Apply Filters
    const filteredTests = useMemo(() => {
        return allTests.filter(test => {
            const matchesSearch = filters.searchTerm === '' || 
                test.name.toLowerCase().includes(filters.searchTerm.toLowerCase());
            
            const matchesDiscipline = filters.selectedDisciplines.length === 0 || 
                (test.discipline_id && filters.selectedDisciplines.includes(test.discipline_id));

            const matchesYear = filters.selectedYears.length === 0 || 
                filters.selectedYears.some(year => test.name.includes(year));

            // Filter by "Banca" using the Institutions filter array
            const matchesInstitution = filters.selectedInstitutions.length === 0 || 
                (test.banca && filters.selectedInstitutions.includes(test.banca));

            return matchesSearch && matchesDiscipline && matchesYear && matchesInstitution;
        });
    }, [allTests, filters]);

    // Split by Tab (Apply tab filter AFTER advanced filters)
    const { fixedTests, scheduledTests } = useMemo(() => {
        const fixed = filteredTests.filter(t => t.test_type === 'fixed');
        const scheduled = filteredTests.filter(t => t.test_type === 'scheduled');
        return { fixedTests: fixed, scheduledTests: scheduled };
    }, [filteredTests]);

    const testsToDisplay = activeTab === 'fixed' ? fixedTests : scheduledTests;

    const handleApplyFilters = () => {
        setIsFiltering(true);
        setIsFilterPanelOpen(false);
    };

    const handleClearFilters = () => {
        setIsFiltering(false);
        setFilters({ searchTerm: '', selectedDisciplines: [], selectedYears: [], selectedInstitutions: [] });
        setIsFilterPanelOpen(false);
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-gray-200 h-64 rounded-lg"></div>
                    ))}
                </div>
            );
        }

        if (testsToDisplay.length > 0) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {testsToDisplay.map(test => (
                        <div key={test.id} className="relative">
                            {test.banca && (
                                <span className="absolute top-0 right-0 bg-gray-800 text-white text-[10px] px-2 py-1 rounded-bl-lg rounded-tr-lg z-10 font-bold uppercase tracking-wider">
                                    {test.banca}
                                </span>
                            )}
                            <TestCard 
                                test={test} 
                                onResultsClick={() => setViewingTest(test)}
                                onEdit={() => setEditingTest(test)}
                                onDelete={() => handleDeleteTest(test.id)}
                            />
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="text-center py-20">
                <div className="p-4 bg-white rounded-full mb-4 inline-block shadow-md">
                    <ClipboardListIcon className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-700">Nenhuma Prova Encontrada</h2>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                    {isFiltering 
                        ? 'Tente ajustar seus filtros para encontrar o que procura.' 
                        : (activeTab === 'fixed' ? 'Carregue uma prova na íntegra para disponibilizar aos alunos.' : 'Agende um novo simulado com data e hora para avaliação.')}
                </p>
                {isFiltering && (
                    <button onClick={handleClearFilters} className="mt-4 text-primary font-bold hover:underline">
                        Limpar Filtros
                    </button>
                )}
            </div>
        );
    };

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
                <header className="p-8 border-b border-gray-200 bg-white">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                                <ClipboardListIcon className="w-8 h-8 text-primary" />
                                Provas na Íntegra
                            </h1>
                            <p className="text-gray-500 mt-1">Gerencie provas completas, simulados e avaliações.</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsUploadModalOpen(true)}
                                className="px-4 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <FileTextIcon className="w-5 h-5" />
                                Upload Prova PDF
                            </button>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-4 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
                            >
                                <PlusCircleIcon className="w-5 h-5" />
                                Criar Manualmente
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center gap-4">
                        <nav className="flex gap-2">
                            <button onClick={() => setActiveTab('fixed')} className={`px-4 py-2 font-semibold text-sm rounded-lg transition-all ${activeTab === 'fixed' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'}`}>
                                Provas Fixas
                            </button>
                            <button onClick={() => setActiveTab('scheduled')} className={`px-4 py-2 font-semibold text-sm rounded-lg transition-all ${activeTab === 'scheduled' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'}`}>
                                Simulados (Agendados)
                            </button>
                        </nav>
                        
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setIsFilterPanelOpen(true)}
                                className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-2 text-sm transition-all border ${isFiltering ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            >
                                <SlidersHorizontalIcon className="w-4 h-4" />
                                {isFiltering ? 'Filtros Ativos' : 'Filtrar Provas'}
                            </button>
                            {isFiltering && (
                                <span className="text-sm text-gray-500">Exibindo {testsToDisplay.length} provas</span>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-grow p-8">
                    {/* Metrics Header */}
                    {!isLoading && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <StatCard title="Provas Criadas" value={stats.totalTests} icon={ClipboardListIcon} color="text-blue-600"/>
                            <StatCard title="Questões em Banco" value={stats.totalQuestions} icon={FileTextIcon} color="text-indigo-600"/>
                            <StatCard title="Total de Tentativas" value={stats.totalAttempts} icon={UsersIcon} color="text-green-600"/>
                            <StatCard title="Simulados Agendados" value={stats.activeSchedules} icon={CalendarIcon} color="text-orange-600"/>
                        </div>
                    )}

                    {renderContent()}
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
                institutionLabel="Banca"
            />

            {isCreateModalOpen && (
                <CreateTestModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onTestCreated={() => {
                        setIsCreateModalOpen(false);
                        fetchData();
                    }}
                />
            )}
            
            {isUploadModalOpen && (
                <UploadExamModal 
                    onClose={() => setIsUploadModalOpen(false)}
                    onCreated={() => {
                        setIsUploadModalOpen(false);
                        fetchData();
                    }}
                />
            )}

            {editingTest && (
                <EditTestModal
                    test={editingTest}
                    onClose={() => setEditingTest(null)}
                    onTestUpdated={() => {
                        setEditingTest(null);
                        fetchData();
                    }}
                />
            )}

            {viewingTest && (
                <TestDetailModal
                    test={viewingTest}
                    onClose={() => setViewingTest(null)}
                />
            )}
        </>
    );
};

export default TestsPage;
