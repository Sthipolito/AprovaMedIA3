
import React, { useState, useEffect } from 'react';
import { ClipboardListIcon, UploadCloudIcon, BookOpenIcon, LayersIcon, SaveIcon, RefreshCwIcon, CheckCircleIcon, AlertTriangleIcon, ChevronRightIcon } from './IconComponents';
import { QuizQuestion, QuestionSet } from '../types';
import { usePdfParser } from '../hooks/usePdfParser';
import * as geminiService from '../services/geminiService';
import * as questionBankService from '../services/questionBankService';

interface AnswerKeyProcessorTabProps {
    questions: QuizQuestion[] | null;
    onQuestionsUpdate: (updatedQuestions: QuizQuestion[]) => void;
}

type UpdateStrategy = 'overwrite_all' | 'comments_only' | 'empty_only';

interface ChangeLog {
    questionId: string;
    changes: string[];
}

const AnswerKeyProcessorTab: React.FC<AnswerKeyProcessorTabProps> = ({ questions: sessionQuestions, onQuestionsUpdate }) => {
    const { parsePdf, isLoading: isParsing, error: parseError } = usePdfParser();
    const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Enhanced Report State
    const [report, setReport] = useState<{ updatedCount: number; message: string; details: ChangeLog[] } | null>(null);

    // Mode Selection State
    const [mode, setMode] = useState<'session' | 'database'>('session');
    const [existingSets, setExistingSets] = useState<QuestionSet[]>([]);
    const [selectedSetId, setSelectedSetId] = useState<string>('');
    const [isLoadingList, setIsLoadingList] = useState(false);
    
    // Conflict Resolution Modal State
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [pendingAnswers, setPendingAnswers] = useState<{ identifier: string; option: string; explanation?: string }[]>([]);
    const [targetQuestions, setTargetQuestions] = useState<QuizQuestion[]>([]);

    useEffect(() => {
        if (mode === 'database') {
            const loadSets = async () => {
                setIsLoadingList(true);
                try {
                    const bank = await questionBankService.getQuestionBank();
                    setExistingSets(Object.values(bank));
                } catch (e) {
                    console.error("Falha ao carregar lista de assuntos", e);
                } finally {
                    setIsLoadingList(false);
                }
            };
            loadSets();
        }
    }, [mode]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAnswerKeyFile(e.target.files[0]);
            setReport(null);
        }
    };

    const handleProcess = async () => {
        if (!answerKeyFile) return;

        let currentTargetQuestions: QuizQuestion[] = [];

        if (mode === 'session') {
            if (!sessionQuestions) return;
            currentTargetQuestions = [...sessionQuestions];
        } else {
            if (!selectedSetId) {
                alert("Selecione um assunto do banco de dados.");
                return;
            }
            // Fetch fresh data to ensure we have latest version
            const freshSet = await questionBankService.getQuestionSetById(selectedSetId);
            if (!freshSet) {
                alert("Erro ao carregar o assunto selecionado. Tente recarregar a página.");
                return;
            }
            currentTargetQuestions = [...freshSet.questions];
        }

        setIsProcessing(true);
        setReport(null);

        // 1. Parse PDF
        const parsedResult = await parsePdf(answerKeyFile);
        if (!parsedResult || !parsedResult.text) {
            setReport({ updatedCount: 0, message: 'Falha ao ler o arquivo PDF do gabarito.', details: [] });
            setIsProcessing(false);
            return;
        }

        // 2. Extract Answers with AI
        const answersFromAI = await geminiService.processAnswerKey(parsedResult.text);
        if (!answersFromAI || answersFromAI.length === 0) {
            setReport({ updatedCount: 0, message: 'A IA não conseguiu identificar respostas no gabarito. Verifique se o arquivo contém numeração e letras de resposta.', details: [] });
            setIsProcessing(false);
            return;
        }

        // 3. Check for existing data (Conflict Detection)
        setPendingAnswers(answersFromAI);
        setTargetQuestions(currentTargetQuestions);
        setShowConflictModal(true);
        setIsProcessing(false);
    };

    const applyUpdates = async (strategy: UpdateStrategy) => {
        setShowConflictModal(false);
        setIsProcessing(true);

        let updatedCount = 0;
        const changeLogs: ChangeLog[] = [];
        const letterToIndex: { [key: string]: number } = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4 };
        const indexToLetter: string[] = ['A', 'B', 'C', 'D', 'E'];
        
        const updatedQuestions = JSON.parse(JSON.stringify(targetQuestions)); // Deep copy

        pendingAnswers.forEach(answer => {
             // Tenta encontrar a questão comparando apenas os números do ID
             // Remove parenteses, pontos e espaços para garantir match "9107)" == "9107"
            const cleanAnswerId = answer.identifier.replace(/[^0-9]/g, '');

            const questionIndex = updatedQuestions.findIndex((q: QuizQuestion) => {
                // Extrai o número do início da string da questão
                const qIdMatch = q.question.match(/^(\d+)/);
                const cleanQuestionId = qIdMatch ? qIdMatch[1] : '';
                return cleanQuestionId === cleanAnswerId;
            });

            if (questionIndex !== -1) {
                const q = updatedQuestions[questionIndex];
                const newCorrectIndex = letterToIndex[answer.option];
                const newExplanation = answer.explanation;

                let changed = false;
                const changes: string[] = [];

                // Helper to check and log changes
                const updateAnswer = () => {
                    if (newCorrectIndex !== undefined && q.options.length > newCorrectIndex) {
                        if (q.correctAnswerIndex !== newCorrectIndex) {
                            const oldLetter = q.correctAnswerIndex !== null ? indexToLetter[q.correctAnswerIndex] : 'N/A';
                            changes.push(`Gabarito: ${oldLetter} → ${answer.option}`);
                            q.correctAnswerIndex = newCorrectIndex;
                            changed = true;
                        }
                    }
                };

                const updateExplanation = () => {
                    if (newExplanation && newExplanation.length > 5) {
                        if (!q.explanation || q.explanation.trim() !== newExplanation.trim()) {
                            changes.push(q.explanation ? "Explicação Atualizada" : "Explicação Adicionada");
                            q.explanation = newExplanation;
                            changed = true;
                        }
                    }
                };

                if (strategy === 'overwrite_all') {
                    // Strategy 1: Overwrite All (Gabarito + Comentários)
                    updateAnswer();
                    updateExplanation();
                } else if (strategy === 'comments_only') {
                    // Strategy 2: Only Comments (Keep existing answers)
                    updateExplanation();
                } else if (strategy === 'empty_only') {
                    // Strategy 3: Only Empty (Fill missing gaps)
                    if (q.correctAnswerIndex === null) updateAnswer();
                    if (!q.explanation || q.explanation.length < 5) updateExplanation();
                }

                if (changed) {
                    updatedCount++;
                    changeLogs.push({ questionId: cleanAnswerId, changes });
                }
            }
        });

        // 4. Save Changes
        if (mode === 'session') {
            onQuestionsUpdate(updatedQuestions);
            setReport({ 
                updatedCount, 
                message: `${updatedCount} questões da sessão atual foram atualizadas com sucesso!`,
                details: changeLogs
            });
        } else {
            // Save to DB
            const success = await questionBankService.updateQuestionSetQuestions(selectedSetId, updatedQuestions);
            if (success) {
                setReport({ 
                    updatedCount, 
                    message: `${updatedCount} questões do banco de dados foram atualizadas e salvas!`,
                    details: changeLogs
                });
            } else {
                setReport({ 
                    updatedCount: 0, 
                    message: 'Erro ao salvar as alterações no banco de dados. Verifique sua conexão.',
                    details: []
                });
            }
        }
        setIsProcessing(false);
    };

    // --- Render Helpers ---
    
    if (mode === 'session' && !sessionQuestions) {
         return (
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-gray-50">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                    <ClipboardListIcon className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Processador de Gabaritos</h3>
                <p className="text-gray-600 max-w-sm mb-4">
                    Nenhuma questão extraída nesta sessão.
                </p>
                <button 
                    onClick={() => setMode('database')}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                >
                    Selecionar Assunto do Banco
                </button>
            </div>
        );
    }

    const isLoading = isParsing || isProcessing;

    return (
        <div className="flex-grow flex flex-col p-6 bg-gray-50 h-full overflow-y-auto">
            
            {/* Top Configuration Panel */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 max-w-2xl mx-auto w-full flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <RefreshCwIcon className="w-5 h-5 text-primary" /> Configuração da Atualização
                </h3>
                
                <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                    <button 
                        onClick={() => { setMode('session'); setReport(null); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'session' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Sessão Atual
                    </button>
                    <button 
                        onClick={() => { setMode('database'); setReport(null); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'database' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Banco de Dados (Salvo)
                    </button>
                </div>

                {mode === 'database' && (
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Assunto para Atualizar</label>
                        {isLoadingList ? (
                            <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">Carregando assuntos...</div>
                        ) : (
                            <select 
                                value={selectedSetId} 
                                onChange={(e) => setSelectedSetId(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:outline-none text-gray-800"
                            >
                                <option value="">-- Escolha um Assunto --</option>
                                {existingSets.map(set => (
                                    <option key={set.id} value={set.id}>
                                        {set.subjectName} ({set.questions.length} questões)
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                )}

                <div className="w-full">
                    <label className="relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group border-gray-300 hover:border-primary/50">
                        <UploadCloudIcon className="w-8 h-8 text-gray-400 mb-2 group-hover:text-primary" />
                        <span className="text-primary font-semibold">
                            {answerKeyFile ? answerKeyFile.name : 'Clique para enviar PDF do Gabarito'}
                        </span>
                        <p className="text-xs text-gray-400 mt-2">Suporta gabaritos comentados</p>
                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} disabled={isLoading} />
                    </label>
                    {(parseError) && <p className="mt-2 text-sm text-red-500 text-center">{parseError}</p>}
                </div>

                 <button
                    onClick={handleProcess}
                    disabled={!answerKeyFile || isLoading || (mode === 'database' && !selectedSetId)}
                    className="mt-6 w-full px-4 py-3 bg-primary text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Processando...</span>
                        </>
                    ) : (
                        <span>Analisar Arquivo</span>
                    )}
                </button>
            </div>
            
            {/* Detailed Report Area */}
            {report && (
                <div className={`max-w-2xl mx-auto w-full rounded-xl overflow-hidden border animate-fade-in-up shadow-sm bg-white ${report.updatedCount > 0 ? 'border-green-200' : 'border-yellow-200'}`}>
                    <div className={`p-4 flex items-center justify-center gap-3 ${report.updatedCount > 0 ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
                        {report.updatedCount > 0 ? <CheckCircleIcon className="w-6 h-6"/> : <AlertTriangleIcon className="w-6 h-6"/>}
                        <div>
                            <p className="font-bold text-lg">{report.updatedCount} Questões Atualizadas</p>
                            <p className="text-sm opacity-90">{report.message}</p>
                        </div>
                    </div>
                    
                    {/* Log Details List */}
                    {report.details.length > 0 && (
                        <div className="max-h-64 overflow-y-auto p-0 bg-white">
                             <table className="min-w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                    <tr>
                                        <th className="px-4 py-2">Questão</th>
                                        <th className="px-4 py-2">Alterações Realizadas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {report.details.map((log, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 font-semibold text-gray-700 w-24">#{log.questionId}</td>
                                            <td className="px-4 py-2 text-gray-600">
                                                {log.changes.map((change, cIdx) => (
                                                    <span key={cIdx} className="inline-block bg-gray-100 border border-gray-200 rounded px-2 py-0.5 text-xs mr-2 mb-1">
                                                        {change}
                                                    </span>
                                                ))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Conflict Resolution Modal */}
            {showConflictModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up">
                        <div className="p-6 border-b bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800 text-center">Atualização Inteligente</h3>
                            <p className="text-center text-gray-500 text-sm mt-1">
                                <span className="font-bold text-primary">{pendingAnswers.length}</span> respostas identificadas no PDF.
                            </p>
                        </div>
                        <div className="p-6 space-y-3">
                            <p className="text-gray-700 font-medium mb-4 text-center">Como você deseja aplicar as atualizações?</p>
                            
                            <button 
                                onClick={() => applyUpdates('overwrite_all')}
                                className="w-full p-4 rounded-xl border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                            >
                                <p className="font-bold text-gray-800 group-hover:text-primary">Atualizar Tudo (Gabarito + Comentários)</p>
                                <p className="text-xs text-gray-500 mt-1">Substitui respostas e explicações existentes.</p>
                            </button>

                            <button 
                                onClick={() => applyUpdates('comments_only')}
                                className="w-full p-4 rounded-xl border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
                            >
                                <p className="font-bold text-gray-800 group-hover:text-purple-600">Apenas Comentários</p>
                                <p className="text-xs text-gray-500 mt-1">Mantém o gabarito (letra) intacto, insere apenas explicações.</p>
                            </button>

                            <button 
                                onClick={() => applyUpdates('empty_only')}
                                className="w-full p-4 rounded-xl border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                            >
                                <p className="font-bold text-gray-800 group-hover:text-green-600">Apenas Campos Vazios</p>
                                <p className="text-xs text-gray-500 mt-1">Preserva dados existentes, preenche apenas o que falta.</p>
                            </button>
                        </div>
                        <div className="p-4 bg-gray-50 border-t text-center">
                            <button onClick={() => setShowConflictModal(false)} className="text-gray-500 hover:text-gray-700 font-medium text-sm">Cancelar Operação</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnswerKeyProcessorTab;
