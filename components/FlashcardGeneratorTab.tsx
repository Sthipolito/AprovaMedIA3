import React, { useState, useEffect } from 'react';
import { LayersIcon, SparklesIcon, SaveIcon, XIcon } from './IconComponents';
import * as geminiService from '../services/geminiService';
import * as academicService from '../services/academicService';
import { TrueFlashcard, Course, Module, Discipline } from '../types';

// --- Inline Modal Component ---
interface SaveFlashcardsModalProps {
    onClose: () => void;
    onSave: (details: { disciplineId: string; subjectName: string; }) => void;
}

const SaveFlashcardsModal: React.FC<SaveFlashcardsModalProps> = ({ onClose, onSave }) => {
    const [subjectName, setSubjectName] = useState('');
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
        if (!subjectName.trim() || !selectedDisciplineId) {
            setError('Por favor, forneça um nome para o conjunto e selecione uma disciplina.');
            return;
        }
        onSave({ disciplineId: selectedDisciplineId, subjectName: subjectName.trim() });
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
                    <h2 className="text-xl font-bold text-gray-800">Salvar Conjunto de Flashcards</h2>
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
                        <label htmlFor="subject-name" className="block text-sm font-medium text-gray-700 mb-2">
                            Nome do Assunto (Este Conjunto)
                        </label>
                        <input
                            type="text"
                            id="subject-name"
                            value={subjectName}
                            onChange={(e) => setSubjectName(e.target.value)}
                            placeholder="Ex: Conceitos de Cardiologia"
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
interface FlashcardGeneratorTabProps {
    pdfText: string;
}

const FlashcardGeneratorTab: React.FC<FlashcardGeneratorTabProps> = ({ pdfText }) => {
    const [flashcards, setFlashcards] = useState<TrueFlashcard[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

    const handleExtract = async () => {
        setIsLoading(true);
        setFlashcards(null);
        const result = await geminiService.extractTrueFlashcards(pdfText);
        setFlashcards(result);
        setIsLoading(false);
    };

    const handleSave = async (details: { disciplineId: string; subjectName: string; }) => {
        if (!flashcards) return;
        const success = await academicService.saveFlashcardSet(details.disciplineId, details.subjectName, flashcards);
        if (success) {
            alert(`Conjunto de flashcards "${details.subjectName}" salvo com sucesso!`);
        } else {
            alert("Falha ao salvar o conjunto de flashcards.");
        }
        setIsSaveModalOpen(false);
    };
    
    const handleCardChange = (index: number, field: 'question' | 'answer', value: string) => {
        if (!flashcards) return;
        const newFlashcards = [...flashcards];
        newFlashcards[index] = { ...newFlashcards[index], [field]: value };
        setFlashcards(newFlashcards);
    };

    return (
        <div className="flex-grow flex flex-col h-full bg-gray-50">
            {flashcards === null && !isLoading && (
                <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
                    <div className="p-4 bg-primary/10 rounded-full mb-4">
                        <LayersIcon className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Criador de Flashcards</h3>
                    <p className="text-gray-600 max-w-sm mb-6">
                        Extraia flashcards de pergunta e resposta do seu PDF, ideais para memorização, que poderão ser salvos na nova seção de Flashcards.
                    </p>
                    <button
                        onClick={handleExtract}
                        className="w-full max-w-xs px-4 py-3 bg-primary text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        <span>Extrair Flashcards</span>
                    </button>
                </div>
            )}
            
            {isLoading && (
                <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600 font-semibold">A IA está criando seus flashcards...</p>
                </div>
            )}

            {flashcards !== null && (
                <>
                    <div className="flex-grow p-6 overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-gray-800">Flashcards Extraídos ({flashcards.length})</h3>
                            <button
                                onClick={() => setIsSaveModalOpen(true)}
                                disabled={flashcards.length === 0}
                                className="px-4 py-2 bg-primary text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors disabled:bg-gray-300"
                            >
                                <SaveIcon className="w-5 h-5" />
                                Salvar Conjunto
                            </button>
                        </div>
                        {flashcards.length > 0 ? (
                            <div className="space-y-4">
                                {flashcards.map((card, index) => (
                                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                                        <div className="mb-2">
                                            <label className="text-xs font-bold text-gray-500">PERGUNTA</label>
                                            <textarea
                                                value={card.question}
                                                onChange={(e) => handleCardChange(index, 'question', e.target.value)}
                                                className="w-full p-1 border-b-2 border-transparent focus:border-primary focus:outline-none bg-transparent resize-none"
                                                rows={2}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500">RESPOSTA</label>
                                            <textarea
                                                value={card.answer}
                                                onChange={(e) => handleCardChange(index, 'answer', e.target.value)}
                                                className="w-full p-1 border-b-2 border-transparent focus:border-primary focus:outline-none bg-transparent resize-none"
                                                rows={3}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <h3 className="text-lg font-semibold text-gray-700">Nenhum Flashcard Encontrado</h3>
                                <p className="text-gray-500 mt-2">A IA não conseguiu identificar nenhum conceito para transformar em flashcard neste documento.</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {isSaveModalOpen && (
                <SaveFlashcardsModal
                    onClose={() => setIsSaveModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default FlashcardGeneratorTab;