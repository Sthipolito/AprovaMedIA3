
import React, { useState, useEffect, useMemo, FC } from 'react';
import { Course, Module, Discipline, OfficialSummary, QuestionSet } from '../types';
import * as academicService from '../services/academicService';
import * as geminiService from '../services/geminiService';
import * as questionBankService from '../services/questionBankService';
import { FileTextIcon, ChevronRightIcon, XIcon, EditIcon, TrashIcon, SaveIcon, BrainCircuitIcon, PlusCircleIcon, SearchIcon, RefreshCwIcon, DownloadIcon, SlidersHorizontalIcon, LayersIcon, SparklesIcon } from './IconComponents';
import { jsPDF } from 'jspdf';
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

// ... (HiddenWord, SummaryContent, SummaryReaderModal, CreateSummaryModal logic remains the same)
// Re-declaring for completeness as per instructions

const HiddenWord: FC<{ word: string }> = ({ word }) => {
    const [isRevealed, setIsRevealed] = useState(false);
    if (isRevealed) {
        return <strong className="text-primary animate-pulse">{word}</strong>;
    }
    return (
        <button
            onClick={() => setIsRevealed(true)}
            className="px-2 py-0.5 bg-gray-300 rounded-md text-gray-300 hover:bg-gray-400 hover:text-gray-400 transition-colors"
            style={{ minWidth: `${word.length * 0.5}rem` }}
        >
            {word}
        </button>
    );
};

const SummaryContent: FC<{ content: string; isStudyMode: boolean }> = ({ content, isStudyMode }) => {
    const processContent = (text: string) => {
        if (isStudyMode) {
            const parts = text.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    const word = part.slice(2, -2);
                    return <HiddenWord key={index} word={word} />;
                }
                return <span key={index}>{part}</span>;
            });
        }
        const htmlContent = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\* (.*$)/gm, '<li>$1</li>')
            .replace(/<\/li>\n<li>/g, '</li><li>') 
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
            .replace(/\n/g, '<br>'); 

        return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
    };

    return <div className="prose prose-lg max-w-none whitespace-pre-wrap">{processContent(content)}</div>;
};

const SummaryReaderModal: FC<{
    summary: OfficialSummary;
    onClose: () => void;
    onSave: (id: string, updates: { title: string; content: string }) => Promise<void>;
    onDelete: (id: string) => void;
    isEditable: boolean;
}> = ({ summary, onClose, onSave, onDelete, isEditable }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isStudyMode, setIsStudyMode] = useState(false);
    const [title, setTitle] = useState(summary.title);
    const [content, setContent] = useState(summary.content);
    const [isSaving, setIsSaving] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(summary.id, { title, content });
        setIsSaving(false);
        setIsEditing(false);
    };

    const handleDelete = () => {
        if (window.confirm("Tem certeza que deseja excluir este resumo?")) {
            onDelete(summary.id);
            onClose();
        }
    };

    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        try {
            const logoUrl = "https://pub-872633efa2d545638be12ea86363c2ca.r2.dev/WhatsApp%20Image%202025-11-09%20at%2013.47.15%20(1).png";
            let base64Logo = '';
            try {
                const response = await fetch(logoUrl);
                const blob = await response.blob();
                base64Logo = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            } catch (e) { console.warn("Logo load fail", e); }

            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const htmlContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^\* (.*$)/gm, '<li>$1</li>').replace(/<\/li>\n<li>/g, '</li><li>').replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>').replace(/\n/g, '<br>');

            const printableElement = document.createElement('div');
            printableElement.innerHTML = `
                <div style="width: 170mm; min-height: 280mm; font-family: Helvetica, Arial, sans-serif; font-size: 12pt; line-height: 1.6; color: #333; position: relative; background-color: #ffffff; padding: 20px;">
                    ${base64Logo ? `<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 0; pointer-events: none; overflow: hidden;"><img src="${base64Logo}" style="width: 80%; opacity: 0.08; object-fit: contain;" /></div>` : ''}
                    <div style="position: relative; z-index: 1;">
                        <h1 style="color: #0D9488; font-size: 20pt; margin-bottom: 15px; border-bottom: 2px solid #0D9488; padding-bottom: 10px;">${title}</h1>
                        <div style="text-align: justify;">${htmlContent}</div>
                        <div style="margin-top: 50px; border-top: 1px solid #ddd; padding-top: 10px; text-align: center; font-size: 9pt; color: #888;"><span style="color: #0D9488; font-weight: bold;">AprovaMed IA</span> • Seu Segundo Cérebro Acadêmico</div>
                    </div>
                </div>`;
            
            printableElement.style.position = 'absolute'; printableElement.style.top = '0'; printableElement.style.left = '0'; printableElement.style.zIndex = '-9999';
            document.body.appendChild(printableElement);

            doc.html(printableElement, {
                callback: (doc) => { doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`); document.body.removeChild(printableElement); setIsDownloading(false); },
                x: 15, y: 15, width: 180, windowWidth: 1000, 
            });
        } catch (error) { console.error("PDF Error", error); alert("Erro ao gerar PDF."); setIsDownloading(false); }
    };
    
    return (
         <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b bg-gray-50 flex-shrink-0 flex justify-between items-center">
                    {isEditing ? <input value={title} onChange={e => setTitle(e.target.value)} className="text-xl font-bold text-gray-800 bg-white border-b-2 border-primary focus:outline-none w-full mr-4"/> : <h2 className="text-xl font-bold text-gray-800 truncate flex-1 mr-4">{title}</h2>}
                    <div className="flex items-center gap-2">
                        <button onClick={handleDownloadPDF} disabled={isDownloading} className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 disabled:opacity-50 flex items-center gap-2 font-medium text-sm">
                            {isDownloading ? <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div> : <DownloadIcon className="w-5 h-5" />}
                        </button>
                        <button onClick={() => setIsStudyMode(!isStudyMode)} className={`px-3 py-1.5 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${isStudyMode ? 'bg-primary/20 text-primary' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}><BrainCircuitIcon className="w-4 h-4" /> Modo Estudo</button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><XIcon className="w-5 h-5 text-gray-600" /></button>
                    </div>
                </header>
                <main className="flex-grow p-6 overflow-y-auto">{isEditing ? <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full h-full p-2 border rounded-md resize-none"/> : <SummaryContent content={content} isStudyMode={isStudyMode} />}</main>
                 {isEditable && (
                    <footer className="p-3 bg-gray-100 border-t flex-shrink-0 flex justify-end items-center gap-3">
                        {isEditing ? <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg flex items-center gap-2 disabled:bg-gray-400"><SaveIcon className="w-5 h-5" /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}</button> : <><button onClick={handleDelete} className="px-4 py-2 bg-red-100 text-red-700 font-semibold rounded-lg flex items-center gap-2 hover:bg-red-200"><TrashIcon className="w-5 h-5" /> Excluir</button><button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-300"><EditIcon className="w-5 h-5" /> Editar</button></>}
                    </footer>
                )}
            </div>
        </div>
    );
};

interface CreateSummaryModalProps { onClose: () => void; onSave: (details: { disciplineId: string; title: string; content: string }) => Promise<void>; }
const CreateSummaryModal: FC<CreateSummaryModalProps> = ({ onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [selectedDisciplineId, setSelectedDisciplineId] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [contentSource, setContentSource] = useState<'manual' | 'ai'>('manual');
    const [availableQuestionSets, setAvailableQuestionSets] = useState<QuestionSet[]>([]);
    const [selectedQuestionSetIds, setSelectedQuestionSetIds] = useState<Set<string>>(new Set());
    const [isLoadingSets, setIsLoadingSets] = useState(false);

    useEffect(() => { academicService.getCourses().then(setCourses); }, []);
    useEffect(() => { if (selectedCourseId) { academicService.getModules(selectedCourseId).then(setModules); setSelectedModuleId(''); setDisciplines([]); setSelectedDisciplineId(''); } }, [selectedCourseId]);
    useEffect(() => { if (selectedModuleId) { academicService.getDisciplines(selectedModuleId).then(setDisciplines); setSelectedDisciplineId(''); } }, [selectedModuleId]);
    useEffect(() => { if (selectedDisciplineId) { setIsLoadingSets(true); questionBankService.getQuestionSetsByDiscipline(selectedDisciplineId).then(sets => { setAvailableQuestionSets(sets); setIsLoadingSets(false); setSelectedQuestionSetIds(new Set()); }); } else { setAvailableQuestionSets([]); } }, [selectedDisciplineId]);

    const handleToggleQuestionSet = (id: string) => { setSelectedQuestionSetIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; }); };

    const handleSaveClick = async () => {
        setError('');
        if (!title.trim() || !selectedDisciplineId) { setError('Título e disciplina são obrigatórios.'); return; }
        setIsSaving(true);
        let finalContent = content;
        try {
            if (contentSource === 'ai') {
                if (selectedQuestionSetIds.size === 0) throw new Error('Por favor, selecione ao menos um assunto.');
                const selectedSets = availableQuestionSets.filter(qs => selectedQuestionSetIds.has(qs.id));
                const allQuestions = selectedSets.flatMap(qs => qs.questions);
                if (allQuestions.length === 0) throw new Error('Os assuntos selecionados não contêm questões.');
                const context = allQuestions.map((q, i) => `Questão ${i + 1}: ${q.question}\n` + q.options.map((opt, oi) => `  Opção ${String.fromCharCode(65 + oi)}: ${opt}`).join('\n') + `\nResposta Correta: ${q.correctAnswerIndex !== null ? q.options[q.correctAnswerIndex] : 'N/A'}` + (q.explanation ? `\nExplicação: ${q.explanation}\n` : '\n')).join('\n---\n');
                finalContent = await geminiService.generateSummaryFromQuestions(context);
            } else { if (!content.trim()) throw new Error('O conteúdo do resumo não pode estar vazio.'); }
            await onSave({ disciplineId: selectedDisciplineId, title: title.trim(), content: finalContent });
        } catch(err) { setError((err as Error).message); } finally { setIsSaving(false); }
    };

    const renderSelect = (id: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: {id: string, name: string}[], placeholder: string) => ( <select id={id} value={value} onChange={onChange} className="w-full p-2 border border-gray-300 rounded-md bg-white"> <option value="">{placeholder}</option> {options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)} </select> );

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center"><h2 className="text-xl font-bold text-gray-800">Criar Novo Resumo</h2><button onClick={onClose}><XIcon className="w-5 h-5"/></button></header>
                <main className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Vincular a:</label><div className="space-y-2 p-2 bg-gray-50 border rounded-md">{renderSelect("course-select", selectedCourseId, e => setSelectedCourseId(e.target.value), courses, "Selecione um curso")}{renderSelect("module-select", selectedModuleId, e => setSelectedModuleId(e.target.value), modules, "Selecione um módulo")}{renderSelect("discipline-select", selectedDisciplineId, e => setSelectedDisciplineId(e.target.value), disciplines, "Selecione uma disciplina")}</div></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Título</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-md"/></div>
                     <div><label className="block text-sm font-medium text-gray-700 mb-2">Fonte</label><div className="flex gap-4"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="contentSource" value="manual" checked={contentSource === 'manual'} onChange={() => setContentSource('manual')} className="h-4 w-4 text-primary focus:ring-primary"/>Manual</label><label className={`flex items-center gap-2 ${!selectedDisciplineId ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'}`}><input type="radio" name="contentSource" value="ai" checked={contentSource === 'ai'} onChange={() => setContentSource('ai')} disabled={!selectedDisciplineId} className="h-4 w-4 text-primary focus:ring-primary"/>Gerar com IA</label></div></div>
                    {contentSource === 'manual' ? (<div><label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label><textarea value={content} onChange={e => setContent(e.target.value)} rows={8} className="w-full p-2 border rounded-md"/></div>) : (<div><label className="block text-sm font-medium text-gray-700 mb-1">Selecione os Assuntos</label>{isLoadingSets ? <div className="p-4 text-center text-gray-500 border rounded-md">Carregando...</div> : availableQuestionSets.length > 0 ? (<div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1 bg-white">{availableQuestionSets.map(qs => (<label key={qs.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer border-b last:border-0 border-gray-50"><input type="checkbox" checked={selectedQuestionSetIds.has(qs.id)} onChange={() => handleToggleQuestionSet(qs.id)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/><div><p className="text-sm font-medium text-gray-800">{qs.subjectName}</p><p className="text-xs text-gray-500">{qs.questions.length} questões</p></div></label>))}</div>) : <p className="text-sm text-gray-500 italic p-3 border rounded-md bg-gray-50">Sem assuntos.</p>}</div>)}
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </main>
                <footer className="p-4 bg-gray-50 flex justify-end gap-3"><button onClick={onClose} className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg">Cancelar</button><button onClick={handleSaveClick} disabled={isSaving} className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark disabled:bg-gray-400 flex items-center gap-2">{isSaving ? 'Salvando...' : 'Salvar Resumo'}</button></footer>
            </div>
        </div>
    );
};

// --- Main Page Component ---
type ExtendedSummary = OfficialSummary & { disciplineName: string, moduleName: string, courseName: string };

interface FilterState {
    searchTerm: string;
    selectedDisciplines: string[];
    selectedYears: string[];
    selectedInstitutions: string[];
}

const OfficialSummariesPage: React.FC = () => {
    const [summaries, setSummaries] = useState<ExtendedSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingSummary, setViewingSummary] = useState<OfficialSummary | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // Filter State
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [allDisciplines, setAllDisciplines] = useState<{id: string, name: string}[]>([]);
    const [filters, setFilters] = useState<FilterState>({
        searchTerm: '',
        selectedDisciplines: [],
        selectedYears: [],
        selectedInstitutions: []
    });
    const [isFiltering, setIsFiltering] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        const [summariesData, bankData] = await Promise.all([
            academicService.getAllSummariesWithContext(),
            academicService.getStructuredDataForManagement()
        ]);
        setSummaries(summariesData);
        
        // Extract disciplines from bank structure for filters
        const disciplines = bankData.flatMap(c => c.modules?.flatMap(m => m.disciplines || []) || []);
        setAllDisciplines(disciplines.map(d => ({ id: d.id, name: d.name })));
        
        setIsLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    // Derived Data for Filters
    const { availableYears, availableInstitutions } = useMemo(() => {
        const years = new Set<string>();
        const institutions = new Set<string>();
        const yearRegex = /\b(19|20)\d{2}\b/g;
        const instRegex = /\b[A-Z]{2,6}\b/g;

        summaries.forEach(s => {
            const title = s.title;
            const foundYears = title.match(yearRegex);
            if (foundYears) foundYears.forEach(y => years.add(y));

            const foundInsts = title.match(instRegex);
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
    }, [summaries]);

    const filteredSummaries = useMemo(() => {
        return summaries.filter(s => {
            const matchesSearch = filters.searchTerm === '' || 
                s.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                s.disciplineName.toLowerCase().includes(filters.searchTerm.toLowerCase());
            
            const matchesDiscipline = filters.selectedDisciplines.length === 0 || 
                filters.selectedDisciplines.includes(s.discipline_id);

            const matchesYear = filters.selectedYears.length === 0 || 
                filters.selectedYears.some(year => s.title.includes(year));

            const matchesInstitution = filters.selectedInstitutions.length === 0 || 
                filters.selectedInstitutions.some(inst => s.title.includes(inst));

            return matchesSearch && matchesDiscipline && matchesYear && matchesInstitution;
        });
    }, [summaries, filters]);

    // Metrics Calculation
    const stats = useMemo(() => {
        const totalSummaries = summaries.length;
        const uniqueDisciplines = new Set(summaries.map(s => s.discipline_id)).size;
        // Mock recent for simplicity (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentCount = summaries.filter(s => new Date(s.created_at) > thirtyDaysAgo).length;
        return { totalSummaries, uniqueDisciplines, recentCount };
    }, [summaries]);

    const handleApplyFilters = () => {
        setIsFiltering(true);
        setIsFilterPanelOpen(false);
    };

    const handleClearFilters = () => {
        setIsFiltering(false);
        setFilters({ searchTerm: '', selectedDisciplines: [], selectedYears: [], selectedInstitutions: [] });
        setIsFilterPanelOpen(false);
    };

    const handleCreateSummary = async (details: { disciplineId: string; title: string; content: string }) => {
        try { const success = await academicService.saveSummary(details.disciplineId, details.title, details.content); if (success) { alert('Resumo criado!'); setIsCreateModalOpen(false); await loadData(); } else throw new Error("Erro ao salvar."); } catch (error) { alert((error as Error).message); }
    };

    const handleSave = async (id: string, updates: { title: string, content: string }) => { await academicService.updateSummary(id, updates); setViewingSummary(prev => prev ? { ...prev, ...updates } : null); await loadData(); };
    const handleDelete = async (id: string) => { await academicService.deleteSummary(id); await loadData(); };

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
                <header className="p-8 border-b border-gray-200 bg-white">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                                <FileTextIcon className="w-8 h-8 text-primary" />
                                Resumos Oficiais
                            </h1>
                            <p className="text-gray-500 mt-1">Todos os resumos disponíveis para estudo na plataforma.</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={loadData} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors bg-white border border-gray-200" title="Atualizar">
                                <RefreshCwIcon className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setIsCreateModalOpen(true)} 
                                className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors flex items-center gap-2 shadow-md"
                            >
                                <PlusCircleIcon className="w-5 h-5" /> Criar Novo Resumo
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsFilterPanelOpen(true)}
                            className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-2 text-sm transition-all border ${isFiltering ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                            <SlidersHorizontalIcon className="w-4 h-4" />
                            {isFiltering ? 'Filtros Ativos' : 'Filtrar Resumos'}
                        </button>
                        {isFiltering && (
                            <span className="text-sm text-gray-500">Exibindo {filteredSummaries.length} de {summaries.length} resumos</span>
                        )}
                    </div>
                </header>

                <main className="flex-grow p-8">
                    {/* Metrics Header */}
                    {!isLoading && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <StatCard title="Resumos Disponíveis" value={stats.totalSummaries} icon={FileTextIcon} color="text-orange-500"/>
                            <StatCard title="Disciplinas Cobertas" value={stats.uniqueDisciplines} icon={LayersIcon} color="text-blue-500"/>
                            <StatCard title="Novos (Este Mês)" value={stats.recentCount} icon={SparklesIcon} color="text-yellow-500"/>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex justify-center items-center h-64"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                    ) : filteredSummaries.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredSummaries.map(summary => (
                                <div 
                                    key={summary.id} 
                                    onClick={() => setViewingSummary(summary)}
                                    className="group relative bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full"
                                >
                                    <div className="p-5 flex-grow">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shadow-inner">
                                                <FileTextIcon className="w-6 h-6" />
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded-md border border-gray-100">{new Date(summary.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-2 leading-tight group-hover:text-primary transition-colors" title={summary.title}>{summary.title}</h3>
                                        <div className="mt-2 text-xs text-gray-500 font-medium">
                                            {summary.courseName} <span className="text-gray-300 mx-1">/</span> {summary.moduleName} <span className="text-gray-300 mx-1">/</span> <span className="text-primary">{summary.disciplineName}</span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white border-t border-gray-100">
                                        <button className="w-full py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                                            Ler Resumo
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <div className="bg-gray-100 p-4 rounded-full inline-block mb-4"><FileTextIcon className="w-12 h-12 text-gray-400" /></div>
                            <h2 className="text-xl font-semibold text-gray-600">Nenhum resumo encontrado</h2>
                            <p className="text-gray-500 mt-2">Tente ajustar seus filtros de busca.</p>
                            {isFiltering && (
                                <button onClick={handleClearFilters} className="mt-4 text-primary font-bold hover:underline">
                                    Limpar Filtros
                                </button>
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

            {viewingSummary && <SummaryReaderModal summary={viewingSummary} onClose={() => setViewingSummary(null)} onSave={handleSave} onDelete={handleDelete} isEditable={true}/>}
            {isCreateModalOpen && <CreateSummaryModal onClose={() => setIsCreateModalOpen(false)} onSave={handleCreateSummary}/>}
        </>
    );
};

export default OfficialSummariesPage;
