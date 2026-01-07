import React, { useState, useEffect, useMemo, FC } from 'react';
import { Course, Module, Discipline, OfficialSummary, Student } from '../../types';
import * as academicService from '../../services/academicService';
import { FileTextIcon, ChevronRightIcon, XIcon, BrainCircuitIcon } from '../IconComponents';

// --- Helper Components ---

// Renders a single hidden word for study mode
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

// Renders the summary content, parsing markdown for bold and handling study mode
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
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

        return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
    };

    return <div className="prose prose-lg max-w-none whitespace-pre-wrap">{processContent(content)}</div>;
};


// The modal for reading and studying a summary
const SummaryReaderModal: FC<{ summary: OfficialSummary; onClose: () => void; }> = ({ summary, onClose }) => {
    const [isStudyMode, setIsStudyMode] = useState(false);
    
    return (
         <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b bg-gray-50 flex-shrink-0 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 truncate">{summary.title}</h2>
                    <div className="flex items-center gap-2">
                         <button onClick={() => setIsStudyMode(!isStudyMode)} className={`px-3 py-1.5 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${isStudyMode ? 'bg-primary/20 text-primary' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                           <BrainCircuitIcon className="w-4 h-4" /> Modo Estudo
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><XIcon className="w-5 h-5 text-gray-600" /></button>
                    </div>
                </header>
                <main className="flex-grow p-6 overflow-y-auto">
                    <SummaryContent content={summary.content} isStudyMode={isStudyMode} />
                </main>
            </div>
        </div>
    );
};


interface StudentSummariesPageProps {
    student: Student;
}

const StudentSummariesPage: React.FC<StudentSummariesPageProps> = ({ student }) => {
    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
    const [viewingSummary, setViewingSummary] = useState<OfficialSummary | null>(null);

    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const data = await academicService.getStudentSummariesStructure(student.id);
            setCourse(data);
            setIsLoading(false);
        };
        loadData();
    }, [student.id]);

    const toggleModule = (id: string) => setExpandedModules(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    return (
        <>
            <div className="h-full w-full flex bg-gray-50 overflow-hidden">
                {/* Left Navigation Panel */}
                <div className="w-80 h-full bg-white border-r flex flex-col">
                    <header className="p-4 border-b">
                        <h1 className="text-xl font-bold text-gray-800">{course?.name || 'Seu Curso'}</h1>
                        <p className="text-sm text-gray-500">Navegue pelos resumos.</p>
                    </header>
                    <nav className="flex-grow p-2 overflow-y-auto">
                        {isLoading ? <p className="p-4 text-gray-500">Carregando...</p> : (
                            <ul className="space-y-1">
                                {course?.modules?.map(module => (
                                    <li key={module.id}>
                                        <button onClick={() => toggleModule(module.id)} className="w-full flex justify-between items-center text-left p-2 rounded-md hover:bg-gray-100 font-semibold">
                                            {module.name}
                                            <ChevronRightIcon className={`w-5 h-5 transition-transform ${expandedModules.has(module.id) ? 'rotate-90' : ''}`} />
                                        </button>
                                        {expandedModules.has(module.id) && (
                                            <ul className="pl-4 mt-1 space-y-1 border-l-2 ml-2">
                                                {module.disciplines?.map(discipline => (
                                                    <li key={discipline.id}>
                                                        <button onClick={() => setSelectedDiscipline(discipline)} className={`w-full text-left p-2 rounded-md text-sm ${selectedDiscipline?.id === discipline.id ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-gray-100'}`}>
                                                            {discipline.name}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </nav>
                </div>
                
                {/* Right Content Panel */}
                <main className="flex-1 flex flex-col overflow-y-auto">
                     <header className="p-6 bg-white border-b sticky top-0">
                         <h1 className="text-2xl font-bold text-gray-800">{selectedDiscipline ? selectedDiscipline.name : 'Selecione uma Disciplina'}</h1>
                         <p className="text-gray-500 mt-1">{selectedDiscipline ? 'Veja os resumos disponíveis para estudo.' : 'Use o painel à esquerda para navegar.'}</p>
                    </header>
                    <div className="p-6">
                        {selectedDiscipline ? (
                            (selectedDiscipline.official_summaries?.length || 0) > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {selectedDiscipline.official_summaries?.map(summary => (
                                        <button key={summary.id} onClick={() => setViewingSummary(summary)} className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md hover:border-primary transition-all text-left">
                                            <h3 className="font-bold text-gray-800">{summary.title}</h3>
                                            <p className="text-xs text-gray-500 mt-1">Criado em: {new Date(summary.created_at).toLocaleDateString()}</p>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-gray-500">
                                    <FileTextIcon className="w-12 h-12 mx-auto mb-2" />
                                    <p>Nenhum resumo encontrado para esta disciplina.</p>
                                </div>
                            )
                        ) : (
                             <div className="text-center py-20 text-gray-400">
                                <FileTextIcon className="w-16 h-16 mx-auto mb-4" />
                                <h2 className="text-xl font-semibold">Bem-vindo aos Resumos Oficiais</h2>
                                <p>Selecione uma disciplina no painel à esquerda para começar.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            {viewingSummary && (
                <SummaryReaderModal 
                    summary={viewingSummary} 
                    onClose={() => setViewingSummary(null)} 
                />
            )}
        </>
    );
};

export default StudentSummariesPage;
