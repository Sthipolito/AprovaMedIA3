import React, { useState, useEffect } from 'react';
import { FileTextIcon, SparklesIcon, SaveIcon, XIcon } from './IconComponents';
import * as geminiService from '../services/geminiService';
import * as academicService from '../services/academicService';
import { Course, Module, Discipline } from '../types';

// --- Inline Modal Component ---
interface SaveSummaryModalProps {
    onClose: () => void;
    onSave: (details: { disciplineId: string; title: string }) => void;
}

const SaveSummaryModal: React.FC<SaveSummaryModalProps> = ({ onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [selectedDisciplineId, setSelectedDisciplineId] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        academicService.getCourses().then(setCourses);
    }, []);

    useEffect(() => {
        if (selectedCourseId) {
            academicService.getModules(selectedCourseId).then(setModules);
            setSelectedModuleId('');
            setDisciplines([]);
            setSelectedDisciplineId('');
        } else {
            setModules([]);
        }
    }, [selectedCourseId]);

    useEffect(() => {
        if (selectedModuleId) {
            academicService.getDisciplines(selectedModuleId).then(setDisciplines);
            setSelectedDisciplineId('');
        } else {
            setDisciplines([]);
        }
    }, [selectedModuleId]);

    const handleSaveClick = () => {
        if (!title.trim() || !selectedDisciplineId) {
            setError('Por favor, forneça um título e selecione uma disciplina.');
            return;
        }
        onSave({ disciplineId: selectedDisciplineId, title: title.trim() });
    };
    
    const renderSelect = (id: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: {id: string, name: string}[], placeholder: string) => (
        <select
            id={id}
            value={value}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-primary focus:outline-none"
        >
            <option value="">{placeholder}</option>
            {options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
        </select>
    );

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Salvar Resumo Oficial</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vincular a:</label>
                        <div className="space-y-2 p-3 bg-gray-50 border rounded-md">
                             {renderSelect("course-select", selectedCourseId, e => setSelectedCourseId(e.target.value), courses, "Selecione um curso")}
                             {renderSelect("module-select", selectedModuleId, e => setSelectedModuleId(e.target.value), modules, "Selecione um módulo")}
                             {renderSelect("discipline-select", selectedDisciplineId, e => setSelectedDisciplineId(e.target.value), disciplines, "Selecione uma disciplina")}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="summary-title" className="block text-sm font-medium text-gray-700 mb-2">
                            Título do Resumo
                        </label>
                        <input
                            type="text"
                            id="summary-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex: Resumo de Fisiologia Cardíaca"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
                <div className="p-4 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg">
                        Cancelar
                    </button>
                    <button onClick={handleSaveClick} className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark">
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main Component ---
interface SummaryGeneratorTabProps {
    pdfText: string;
}

const SummaryGeneratorTab: React.FC<SummaryGeneratorTabProps> = ({ pdfText }) => {
    const [summary, setSummary] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        setSummary(null);
        const result = await geminiService.generateSummary(pdfText);
        setSummary(result);
        setIsLoading(false);
    };

    const handleSave = async (details: { disciplineId: string, title: string }) => {
        if (!summary) return;
        const success = await academicService.saveSummary(details.disciplineId, details.title, summary);
        if (success) {
            alert(`Resumo "${details.title}" salvo com sucesso!`);
        } else {
            alert("Falha ao salvar o resumo.");
        }
        setIsSaveModalOpen(false);
    };

    return (
        <div className="flex-grow flex flex-col h-full bg-gray-50">
            {summary === null && !isLoading && (
                <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
                    <div className="p-4 bg-primary/10 rounded-full mb-4">
                        <FileTextIcon className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Criador de Resumos Oficiais</h3>
                    <p className="text-gray-600 max-w-sm mb-6">
                        Use a IA para gerar um resumo conciso do conteúdo do PDF, que poderá ser salvo como um "Resumo Oficial" para os alunos estudarem.
                    </p>
                     <button
                        onClick={handleGenerate}
                        className="w-full max-w-xs px-4 py-3 bg-primary text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        <span>Gerar Resumo</span>
                    </button>
                </div>
            )}

            {isLoading && (
                <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600 font-semibold">A IA está lendo o documento e criando o resumo...</p>
                </div>
            )}
            
            {summary !== null && (
                <>
                    <div className="flex-grow p-6 overflow-y-auto">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-gray-800">Resumo Gerado pela IA</h3>
                             <button
                                onClick={() => setIsSaveModalOpen(true)}
                                className="px-4 py-2 bg-primary text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors"
                            >
                                <SaveIcon className="w-5 h-5" />
                                Salvar Resumo
                            </button>
                        </div>
                        <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            className="w-full h-full min-h-[400px] p-4 border border-gray-300 rounded-lg bg-white resize-none"
                        />
                    </div>
                    <div className="p-4 bg-white border-t">
                         <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="w-full max-w-xs mx-auto px-4 py-2 bg-primary/10 text-primary font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                            <SparklesIcon className="w-5 h-5" />
                            <span>Gerar Novamente</span>
                        </button>
                    </div>
                </>
            )}

            {isSaveModalOpen && (
                <SaveSummaryModal
                    onClose={() => setIsSaveModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default SummaryGeneratorTab;