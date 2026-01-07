
import React, { useState, useEffect, useMemo } from 'react';
import { QuestionSet, QuizQuestion } from '../types';
import { XIcon, LayersIcon, ClipboardListIcon, TrashIcon, SaveIcon, EditIcon, MoveIcon, SparklesIcon } from './IconComponents';
import EditQuestionModal from './EditQuestionModal';
import * as questionBankService from '../services/questionBankService';
import * as geminiService from '../services/geminiService';

interface QuestionSetDetailModalProps {
    questionSet: QuestionSet;
    onClose: () => void;
    onDelete: (setId: string) => void;
    onStudy: (questionSet: QuestionSet, questions: QuizQuestion[]) => void;
    onCreateTest: (name: string, questions: QuizQuestion[]) => Promise<boolean>;
    onUpdate: (setId: string, questions: QuizQuestion[]) => Promise<boolean>;
    onMoveRequest?: (item: QuestionSet) => void; 
}

export const QuestionSetDetailModal: React.FC<QuestionSetDetailModalProps> = ({
    questionSet, onClose, onDelete, onStudy, onCreateTest, onUpdate, onMoveRequest
}) => {
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [subjectName, setSubjectName] = useState(questionSet.subjectName);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<{ question: QuizQuestion; index: number } | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingExplanations, setIsGeneratingExplanations] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

    // State for Test Creation UI
    const [showTestCreation, setShowTestCreation] = useState(false);
    const [newTestName, setNewTestName] = useState('');

    useEffect(() => {
        const loadFullData = async () => {
            setIsLoading(true);
            
            // Check if we have questions (lazy loading check)
            const needsFetch = !questionSet.questions || questionSet.questions.length === 0;
            
            if (needsFetch) {
                const fullSet = await questionBankService.getQuestionSetById(questionSet.id);
                if (fullSet && fullSet.questions) {
                    setQuestions(fullSet.questions);
                    setSelectedIndices(new Set(fullSet.questions.map((_, i) => i)));
                }
            } else {
                setQuestions(JSON.parse(JSON.stringify(questionSet.questions)));
                setSelectedIndices(new Set(questionSet.questions.map((_, i) => i)));
            }
            
            setSubjectName(questionSet.subjectName);
            setHasChanges(false);
            setIsLoading(false);
        };
        loadFullData();
    }, [questionSet]);
    
    const selectedQuestions = useMemo(() => {
        return Array.from(selectedIndices).map(index => questions[index]);
    }, [selectedIndices, questions]);

    const handleSelectionChange = (index: number) => {
        const newSelection = new Set(selectedIndices);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        setSelectedIndices(newSelection);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIndices(new Set(questions.map((_, i) => i)));
        } else {
            setSelectedIndices(new Set());
        }
    };
    
    const areAllSelected = questions.length > 0 && selectedIndices.size === questions.length;

    const handleCreateTestClick = () => {
        if (selectedQuestions.length === 0) {
            alert("Por favor, selecione ao menos uma questão para criar um teste.");
            return;
        }
        setNewTestName(subjectName);
        setShowTestCreation(true);
    };

    const performCreateTest = async () => {
        if (!newTestName.trim()) return;
        
        setIsSaving(true);
        try {
            // We pass the questions and name. The logic for opening the advanced config modal happens in the parent
            const success = await onCreateTest(newTestName.trim(), selectedQuestions);
            if (success) {
                setShowTestCreation(false);
            }
        } catch (e: any) {
            console.error("Error creating test:", e);
            alert(`Erro ao criar o teste: ${e.message || "Erro desconhecido. Verifique sua conexão."}`);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleStudyClick = () => {
        if (selectedQuestions.length === 0) {
            alert("Por favor, selecione ao menos uma questão para estudar.");
            return;
        }
        onStudy(questionSet, selectedQuestions);
    };

    const handleGenerateExplanations = async () => {
        if (selectedQuestions.length === 0) {
            alert("Selecione as questões para as quais deseja gerar explicações.");
            return;
        }
        
        setIsGeneratingExplanations(true);
        
        try {
            // Merge back into the main list
            const newQuestionsList = [...questions];
            
            const sortedIndices = (Array.from(selectedIndices) as number[]).sort((a, b) => a - b);
            const questionsToSend = sortedIndices.map(idx => questions[idx]);
            
            const resultQuestions = await geminiService.generateExplanationsForQuestions(questionsToSend);
            
            let updatedCount = 0;
            sortedIndices.forEach((originalIdx, i) => {
                // Check if new explanation was actually added/changed
                if (resultQuestions[i] && resultQuestions[i].explanation && resultQuestions[i].explanation !== newQuestionsList[originalIdx].explanation) {
                    newQuestionsList[originalIdx] = {
                        ...newQuestionsList[originalIdx],
                        explanation: resultQuestions[i].explanation
                    };
                    updatedCount++;
                }
            });

            if (updatedCount > 0) {
                setQuestions(newQuestionsList);
                setHasChanges(true);
                alert(`Explicações geradas com sucesso para ${updatedCount} questões! Clique em 'Salvar Alterações' para persistir.`);
            } else {
                alert("A IA analisou as questões mas não gerou novas explicações. Verifique se elas já possuem comentários ou tente novamente.");
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao conectar com a IA. Verifique o console para detalhes.");
        } finally {
            setIsGeneratingExplanations(false);
        }
    };

    const handleSaveQuestion = (updatedQuestion: QuizQuestion) => {
        if (editingQuestion) {
            const newQuestions = [...questions];
            newQuestions[editingQuestion.index] = updatedQuestion;
            setQuestions(newQuestions);
            setHasChanges(true);
        }
    };

    const handleDeleteQuestion = (index: number) => {
        if (!window.confirm("Tem certeza que deseja remover esta questão deste conjunto?")) return;
        
        const newQuestions = questions.filter((_, i) => i !== index);
        setQuestions(newQuestions);
        setHasChanges(true);
        
        // Reset selection to avoid index mismatches
        setSelectedIndices(new Set()); 
    };
    
    const handleSaveChanges = async () => {
        setIsSaving(true);
        
        try {
            const nameChanged = subjectName !== questionSet.subjectName;
            const questionsChanged = hasChanges; 

            let success = true;
            if (nameChanged) {
                const updatedSet = await questionBankService.updateQuestionSetDetails(questionSet.id, { subjectName });
                if (!updatedSet) success = false;
            }
            
            if (success && questionsChanged) {
                const updateResult = await onUpdate(questionSet.id, questions);
                if (!updateResult) success = false;
            }

            if (success) {
                setHasChanges(false);
                setIsEditingName(false);
                alert("Alterações salvas com sucesso!");
            } else {
                alert("Houve um erro ao salvar as alterações. Tente novamente.");
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = () => {
        if (window.confirm(`Tem certeza que deseja excluir o conjunto "${subjectName}"?`)) {
            onDelete(questionSet.id);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose}></div>
            <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
                {/* Header */}
                <header className="p-4 border-b bg-gray-50 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isEditingName ? (
                                <input
                                    type="text"
                                    value={subjectName}
                                    onChange={(e) => { setSubjectName(e.target.value); setHasChanges(true); }}
                                    className="text-xl font-bold text-gray-800 bg-white border-b-2 border-primary focus:outline-none"
                                />
                            ) : (
                                <h2 className="text-xl font-bold text-gray-800 truncate">{subjectName}</h2>
                            )}
                             <button onClick={() => setIsEditingName(!isEditingName)} className="p-1 rounded-full hover:bg-gray-200">
                                <EditIcon className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                        <div className="flex items-center">
                            {onMoveRequest && (
                                <button onClick={() => onMoveRequest(questionSet)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 flex items-center gap-1 text-sm font-semibold">
                                    <MoveIcon className="w-4 h-4" /> Mover
                                </button>
                            )}
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 ml-2">
                                <XIcon className="w-6 h-6 text-gray-600" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Actions Area */}
                    {showTestCreation ? (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg animate-fadeIn">
                            <label className="block text-xs font-bold text-blue-700 mb-1">Nome do Novo Teste</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={newTestName}
                                    onChange={(e) => setNewTestName(e.target.value)}
                                    className="flex-grow p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    autoFocus
                                    placeholder="Digite o nome do teste..."
                                />
                                <button 
                                    onClick={performCreateTest}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                                >
                                    {isSaving ? 'Configurando...' : 'Configurar Teste'}
                                </button>
                                <button 
                                    onClick={() => setShowTestCreation(false)}
                                    className="px-3 py-2 bg-white border border-gray-300 text-gray-600 rounded text-sm font-semibold hover:bg-gray-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                             <button onClick={handleStudyClick} disabled={selectedQuestions.length === 0} className="p-2 bg-amber-400 text-amber-900 rounded-lg font-semibold text-sm hover:bg-amber-500 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:text-white">
                                <LayersIcon className="w-5 h-5"/> Estudar ({selectedQuestions.length})
                            </button>
                            <button onClick={handleCreateTestClick} disabled={selectedQuestions.length === 0} className="p-2 bg-primary/20 text-primary rounded-lg font-semibold text-sm hover:bg-primary/30 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:text-gray-400">
                                <ClipboardListIcon className="w-5 h-5"/> Criar Teste ({selectedQuestions.length})
                            </button>
                             <button onClick={handleGenerateExplanations} disabled={selectedQuestions.length === 0 || isGeneratingExplanations} className="p-2 bg-purple-100 text-purple-700 rounded-lg font-semibold text-sm hover:bg-purple-200 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:text-gray-400">
                                {isGeneratingExplanations ? <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div> : <SparklesIcon className="w-5 h-5"/>}
                                {isGeneratingExplanations ? 'Gerando...' : 'Gerar Explicações (IA)'}
                            </button>
                            <button onClick={handleDeleteClick} className="p-2 bg-red-100 text-red-700 rounded-lg font-semibold text-sm hover:bg-red-200 transition-colors flex items-center justify-center gap-2">
                               <TrashIcon className="w-5 h-5"/> Deletar Conjunto
                            </button>
                        </div>
                    )}
                </header>

                {/* Content */}
                <main className="flex-grow p-6 overflow-y-auto space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 p-3 border-b sticky top-0 bg-white z-10 -mx-6 px-6 shadow-sm">
                                <input 
                                    type="checkbox"
                                    id="select-all"
                                    checked={areAllSelected}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="select-all" className="font-semibold text-gray-600 cursor-pointer">Selecionar Todas</label>
                            </div>
                            {questions.map((q, index) => (
                                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 group hover:border-primary/30 transition-colors">
                                    <div className="flex justify-between items-start">
                                         <div className="flex items-start gap-4 flex-grow">
                                            <input 
                                                type="checkbox"
                                                checked={selectedIndices.has(index)}
                                                onChange={() => handleSelectionChange(index)}
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1 flex-shrink-0"
                                            />
                                            <div className="flex-grow">
                                                <p className="font-semibold mb-2 text-gray-700 flex-grow"><span className="text-gray-400 mr-2">#{index + 1}</span> {q.question}</p>
                                                
                                                {/* Action Buttons Row */}
                                                <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingQuestion({ question: q, index })}
                                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                                    >
                                                        <EditIcon className="w-3 h-3"/> Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteQuestion(index)}
                                                        className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1"
                                                    >
                                                        <TrashIcon className="w-3 h-3"/> Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <ul className="space-y-2 pl-8 mt-2">
                                        {q.options.map((opt, i) => (
                                            <li key={i} className={`text-sm flex items-start gap-3 ${q.correctAnswerIndex === null ? 'text-gray-500' : i === q.correctAnswerIndex ? 'font-bold text-green-800' : 'text-gray-600'}`}>
                                                <span className="mt-0.5">{i === q.correctAnswerIndex ?
                                                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                                                    : <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex-shrink-0"></div>
                                                }
                                                </span>
                                                <span>{opt}</span>
                                            </li>
                                        ))}
                                        {q.correctAnswerIndex === null && <p className="text-xs italic text-yellow-600 mt-2">Resposta correta não definida.</p>}
                                    </ul>
                                     {q.mediaUrl && (
                                        <div className="mt-3 pl-8">
                                            <img src={q.mediaUrl} alt="Visual" className="w-24 h-16 object-cover rounded-md border" />
                                        </div>
                                     )}
                                     {q.explanation && (
                                        <div className="mt-3 pl-8 text-xs text-gray-600 italic border-l-4 border-purple-200 pl-3 bg-purple-50 p-2 rounded-r-md">
                                            <strong className="text-purple-700 block mb-1">Comentário do Professor (IA):</strong> {q.explanation}
                                        </div>
                                     )}
                                </div>
                            ))}
                        </>
                    )}
                </main>

                {hasChanges && (
                     <footer className="p-4 bg-yellow-50 border-t border-yellow-200 flex justify-between items-center gap-4 animate-fade-in-up">
                        <p className="text-sm font-bold text-yellow-800 flex items-center gap-2">
                            ⚠️ Você tem alterações não salvas.
                        </p>
                        <button
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center gap-2 disabled:bg-gray-400 shadow-md"
                        >
                            <SaveIcon className="w-5 h-5" />
                            {isSaving ? 'Salvando...' : 'Salvar Agora'}
                        </button>
                    </footer>
                )}
            </div>

            {editingQuestion && (
                <EditQuestionModal
                    question={editingQuestion.question}
                    onClose={() => setEditingQuestion(null)}
                    onSave={(updatedQuestion) => {
                        handleSaveQuestion(updatedQuestion);
                        setEditingQuestion(null);
                    }}
                />
            )}
        </>
    );
};
