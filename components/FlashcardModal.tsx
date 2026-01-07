
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { QuizQuestion, FlashcardSession, SRSRating } from '../types';
import { XIcon, LightbulbIcon, CheckCircleIcon, XCircleIcon, RefreshCwIcon, ArrowLeftIcon, BrainCircuitIcon, TrendingUpIcon, SparklesIcon } from './IconComponents';
import * as flashcardService from '../services/flashcardService';
import * as crmService from '../services/crmService';
import * as geminiService from '../services/geminiService';
import * as spacedRepetitionService from '../services/spacedRepetitionService';
import * as gamificationService from '../services/gamificationService';
import { supabase } from '../services/supabaseClient';

// ... (StatPill and ActionButtonSpinner components remain the same)
const StatPill: React.FC<{ icon: React.ElementType, value: number, label: string, color: string }> = ({ icon: Icon, value, label, color }) => (
    <div className={`flex items-center gap-2 p-2 rounded-full text-sm font-semibold ${color}`}>
        <Icon className="w-5 h-5" />
        <span>{value}</span>
        <span className="hidden sm:inline">{label}</span>
    </div>
);

const ActionButtonSpinner: React.FC = () => (
    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
);

interface FlashcardModalProps {
    studentId: string;
    questionSet: { id: string; subjectName: string; questions: QuizQuestion[] };
    onClose: () => void;
}

// Mini Component for Similar Question Modal
const SimilarQuestionModal: React.FC<{ question: QuizQuestion, onClose: () => void }> = ({ question, onClose }) => {
    const [selected, setSelected] = useState<number | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = () => setIsSubmitted(true);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 border-2 border-primary/20">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-primary" /> Variação Gerada por IA
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><XIcon className="w-5 h-5" /></button>
                </div>
                
                <p className="font-semibold text-gray-800 mb-4">{question.question}</p>
                
                <div className="space-y-2 mb-4">
                    {question.options.map((opt, i) => {
                        let style = "border-gray-300 hover:bg-gray-50";
                        if (isSubmitted) {
                            if (i === question.correctAnswerIndex) style = "bg-green-100 border-green-500 text-green-800 font-bold";
                            else if (i === selected) style = "bg-red-100 border-red-500 text-red-800";
                        } else if (i === selected) {
                            style = "border-primary bg-primary/10 text-primary";
                        }

                        return (
                            <button 
                                key={i} 
                                onClick={() => !isSubmitted && setSelected(i)}
                                className={`w-full text-left p-3 border rounded-lg text-sm transition-all ${style}`}
                                disabled={isSubmitted}
                            >
                                {opt}
                            </button>
                        )
                    })}
                </div>

                {isSubmitted && question.explanation && (
                    <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mb-4">
                        <strong>Explicação:</strong> {question.explanation}
                    </div>
                )}

                <div className="flex justify-end">
                    {!isSubmitted ? (
                        <button 
                            onClick={handleSubmit} 
                            disabled={selected === null}
                            className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark disabled:bg-gray-300"
                        >
                            Verificar
                        </button>
                    ) : (
                        <button onClick={onClose} className="px-4 py-2 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900">
                            Fechar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}


const FlashcardModal: React.FC<FlashcardModalProps> = ({ studentId, questionSet, onClose }) => {
    const [session, setSession] = useState<FlashcardSession | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [viewState, setViewState] = useState<'question' | 'result'>('question');
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [hint, setHint] = useState({ text: '', isLoading: false, used: false });
    const [stats, setStats] = useState({ correct: 0, incorrect: 0, hints: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [earnedXP, setEarnedXP] = useState<number>(0);
    
    // New states for Phase 2
    const [isGeneratingSimilar, setIsGeneratingSimilar] = useState(false);
    const [similarQuestion, setSimilarQuestion] = useState<QuizQuestion | null>(null);

    const [isOwner, setIsOwner] = useState(false);

    // State to store loaded questions (can overwrite initial prop)
    const [loadedQuestions, setLoadedQuestions] = useState<QuizQuestion[]>([]);

    useEffect(() => {
        const checkOwnership = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: studentData } = await supabase.from('students').select('user_id').eq('id', studentId).single();
                setIsOwner(studentData ? studentData.user_id === user.id : false);
            } else {
                setIsOwner(false);
            }
        };
        checkOwnership();
    }, [studentId]);

    const isPersistent = useMemo(() => questionSet.id !== 'chat-session-set' && isOwner, [questionSet.id, isOwner]);
    
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            
            // If questions are provided in props, use them.
            // Otherwise, fetch them if we have an ID.
            if (questionSet.questions && questionSet.questions.length > 0) {
                setLoadedQuestions(questionSet.questions);
            } else if (questionSet.id && questionSet.id !== 'chat-session-set') {
                const fullSet = await import('../services/questionBankService').then(m => m.getQuestionSetById(questionSet.id));
                if (fullSet && fullSet.questions) {
                    setLoadedQuestions(fullSet.questions);
                } else {
                    setError("Não foi possível carregar as questões deste assunto.");
                }
            } else {
                setLoadedQuestions([]);
            }
            
            setIsLoading(false);
        };
        init();
    }, [questionSet]);

    const questions = useMemo(() =>
        (loadedQuestions || []).filter(q => q && q.question && q.options?.length > 0)
    , [loadedQuestions]);
    
    const currentQuestion = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;
    const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

    useEffect(() => {
        if (questions.length === 0 && !isLoading) {
            setError("Este conjunto de estudos não contém questões válidas.");
            return;
        }
        
        if (questions.length === 0) return; // Wait for loading

        if (!isPersistent) {
            setSession({
                id: 'transient-session',
                student_id: studentId,
                question_set_id: questionSet.id,
                current_question_index: 0,
                status: 'in_progress',
                correct_answers: 0,
                incorrect_answers: 0,
                hints_used: 0,
                created_at: new Date().toISOString(),
                completed_at: null,
            });
            setIsLoading(false);
            return;
        }

        const startSession = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const sessionData = await flashcardService.getOrCreateSession(studentId, questionSet.id);
                if (sessionData) {
                    let newIndex = sessionData.current_question_index;
                    if (newIndex >= questions.length) {
                        newIndex = 0; 
                        await flashcardService.updateSessionProgress(sessionData.id, 0);
                    }
                    
                    setSession(sessionData);
                    setCurrentIndex(newIndex);
                    setStats({
                        correct: sessionData.correct_answers || 0,
                        incorrect: sessionData.incorrect_answers || 0,
                        hints: sessionData.hints_used || 0,
                    });
                } else {
                    setError("Não foi possível iniciar a sessão de estudo.");
                }
            } catch (e: any) {
                setError(`Erro ao iniciar sessão: ${e.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        startSession();
    }, [studentId, questionSet.id, questions, isPersistent]); // Removed isLoading from deps to prevent loop


    const handleSelectOption = (index: number) => {
        if (viewState === 'question') {
            setSelectedOption(index);
        }
    };
    
    const handleConfirm = async () => {
        if (viewState === 'result' || isSaving || !currentQuestion) return;
        const isReview = currentQuestion.correctAnswerIndex === null;
        if (!isReview && selectedOption === null) return;
        
        setIsSaving(true);
        if (session) {
             if (!isReview) {
                const wasCorrect = selectedOption === currentQuestion.correctAnswerIndex;
                const statToUpdate = wasCorrect ? 'correct' : 'incorrect';
    
                setStats(prev => ({ ...prev, [statToUpdate]: prev[statToUpdate] + 1 }));
                
                if (isPersistent) {
                    await flashcardService.incrementSessionStat(session.id, statToUpdate);
                    await flashcardService.saveFlashcardResponse({
                        session_id: session.id,
                        question_index: currentIndex,
                        was_correct: wasCorrect,
                        used_ai_hint: hint.used,
                    });

                    if (wasCorrect) {
                        const xpResult = await gamificationService.awardXP(studentId, 10, 'flashcard_correct');
                        if (xpResult) {
                            setEarnedXP(prev => prev + 10);
                        }
                    }
                }
            }
        }
        setViewState('result');
        setIsSaving(false);
    };

    const handleSRSRating = async (rating: SRSRating) => {
        setIsSaving(true);
        if (isPersistent) {
            await spacedRepetitionService.processFlashcardReview(studentId, questionSet.id, currentIndex, rating);
            await gamificationService.awardXP(studentId, 5, 'review_completed');
            setEarnedXP(prev => prev + 5);
        }
        await handleNext();
    };

    const resetCardState = async (newIndex: number) => {
        setCurrentIndex(newIndex);
        setViewState('question');
        setSelectedOption(null);
        setHint({ text: '', isLoading: false, used: false });
        setSimilarQuestion(null); // Reset similar question
        setIsSaving(false);
    };

    const handleNext = async () => {
        if (!session || isSaving) return;

        setIsSaving(true);
        if (isLastQuestion) {
            if (isPersistent) {
                await flashcardService.completeSession(session.id);
                await crmService.logStudentActivity(studentId, 'flashcard_session_completed', `Concluiu a sessão de flashcards: "${questionSet.subjectName}".`);
            }
            setIsSaving(false);
            onClose();
        } else {
            const newIndex = currentIndex + 1;
            if (isPersistent) {
                await flashcardService.updateSessionProgress(session.id, newIndex);
            }
            await resetCardState(newIndex);
        }
    };

    const handleBack = async () => {
        if (!session || currentIndex <= 0 || isSaving) return;
        setIsSaving(true);
        const newIndex = currentIndex - 1;
        if (isPersistent) {
            await flashcardService.updateSessionProgress(session.id, newIndex);
        }
        await resetCardState(newIndex);
    };

    const handleRestart = async () => {
        if (!session || isSaving) return;
        
        if (isPersistent) {
            if (!window.confirm("Tem certeza que deseja reiniciar esta sessão? Todo o progresso será perdido.")) return;
            setIsSaving(true);
            try {
                const success = await flashcardService.restartSession(session.id);
                if (success) {
                    setStats({ correct: 0, incorrect: 0, hints: 0 });
                    await resetCardState(0);
                } else {
                    alert("Falha ao reiniciar a sessão.");
                    setIsSaving(false);
                }
            } catch (e) {
                alert("Ocorreu um erro ao reiniciar a sessão.");
                setIsSaving(false);
            }
        } else {
            setStats({ correct: 0, incorrect: 0, hints: 0 });
            await resetCardState(0);
        }
    };

    const fetchHint = async () => {
        if (!currentQuestion || hint.isLoading || hint.used || viewState === 'result' || !session) return;
        setHint(prev => ({ ...prev, isLoading: true }));
        try {
            const hintText = await geminiService.getAIHint(currentQuestion.question, currentQuestion.options);
            setHint({ text: hintText, isLoading: false, used: true });
            
            if (!hint.used) {
                setStats(prev => ({ ...prev, hints: prev.hints + 1 }));
                if (isPersistent) {
                    await flashcardService.incrementSessionStat(session.id, 'hint');
                }
            }
        } catch (e) {
            setHint({ text: "Não foi possível obter a dica.", isLoading: false, used: true });
        }
    };

    // NEW: Generate Similar Question
    const handleGenerateSimilar = async () => {
        if (isGeneratingSimilar || !currentQuestion) return;
        setIsGeneratingSimilar(true);
        const generated = await geminiService.generateSimilarQuestion(currentQuestion);
        setSimilarQuestion(generated);
        setIsGeneratingSimilar(false);
    };

    const handleCloseModal = useCallback(() => {
        if (isSaving) return;
        onClose();
    }, [onClose, isSaving]);


    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }
    
    if (error || !currentQuestion) {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-3">Ocorreu um Erro</h2>
                    <p className="text-gray-600 mb-6">{error || "A questão atual não pôde ser carregada."}</p>
                    <button onClick={handleCloseModal} className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">
                        Fechar
                    </button>
                </div>
            </div>
        );
    }

    const isReview = currentQuestion.correctAnswerIndex === null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl h-[90vh] flex flex-col relative">
                {/* Similar Question Modal Overlay */}
                {similarQuestion && (
                    <SimilarQuestionModal 
                        question={similarQuestion} 
                        onClose={() => setSimilarQuestion(null)} 
                    />
                )}

                {/* Header */}
                <header className="p-4 border-b bg-gray-50 flex-shrink-0">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-gray-800 truncate max-w-[200px] sm:max-w-md">{questionSet.subjectName}</h2>
                            {earnedXP > 0 && (
                                <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
                                    <TrendingUpIcon className="w-3 h-3" /> +{earnedXP} XP
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleRestart} disabled={isSaving} className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors bg-white border">
                                <RefreshCwIcon className="w-5 h-5 text-gray-600" />
                            </button>
                            <button onClick={handleCloseModal} className="p-2 rounded-full hover:bg-gray-200">
                                <XIcon className="w-6 h-6 text-gray-600" />
                            </button>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-grow p-6 overflow-y-auto flex flex-col" style={{ perspective: '1000px' }}>
                     <div className={`relative w-full flex-grow transition-transform duration-700`} style={{ transformStyle: 'preserve-3d', transform: viewState === 'result' ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                        {/* Front of Card */}
                        <div className="absolute w-full h-full bg-white rounded-lg p-1 flex flex-col" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                            <p className="text-sm font-semibold text-gray-500 mb-2">Questão {currentIndex + 1} de {questions.length}</p>
                            <p className="text-lg font-semibold text-gray-800 mb-4 flex-shrink-0">{currentQuestion.question}</p>
                            
                            {currentQuestion.mediaUrl && (
                                <div className="my-4 flex justify-center">
                                    <img src={currentQuestion.mediaUrl} alt="Mídia" className="rounded-lg max-h-40 w-auto object-contain shadow-md"/>
                                </div>
                            )}

                            <div className="space-y-3 overflow-y-auto pr-2 flex-grow custom-scrollbar">
                                {currentQuestion.options.map((option, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSelectOption(index)}
                                        className={`w-full text-left p-4 border rounded-lg transition-all text-gray-700 ${selectedOption === index ? 'bg-primary/20 border-primary shadow' : 'bg-gray-50 hover:bg-gray-100 hover:border-gray-400'}`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Back of Card (Result & SRS) */}
                        <div className="absolute w-full h-full bg-white rounded-lg p-1 flex flex-col overflow-y-auto custom-scrollbar" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                           {isReview ? (
                                <div className="p-3 mb-4 rounded-lg bg-blue-100 text-blue-800 font-semibold">Modo Revisão</div>
                           ) : (
                                selectedOption === currentQuestion.correctAnswerIndex ? (
                                    <div className="p-3 mb-4 rounded-lg bg-green-100 text-green-800 font-semibold flex items-center gap-2">
                                        <CheckCircleIcon className="w-5 h-5" /> Correto!
                                    </div>
                                ) : (
                                    <div className="p-3 mb-4 rounded-lg bg-red-100 text-red-800">
                                        <p className="font-semibold flex items-center gap-2"><XCircleIcon className="w-5 h-5" /> Incorreto</p>
                                        <p className="text-sm mt-1">Sua resposta: "{currentQuestion.options[selectedOption ?? -1]}"</p>
                                    </div>
                                )
                           )}
                           
                           <p className="font-bold text-gray-800 mb-2">Resposta Correta:</p>
                           <div className="p-3 mb-4 rounded-lg bg-green-100 border border-green-200 text-green-900">
                                {isReview ? "N/A" : currentQuestion.options[currentQuestion.correctAnswerIndex ?? -1]}
                           </div>
                           {currentQuestion.explanation && (
                                <>
                                    <p className="font-bold text-gray-800 mb-2">Explicação:</p>
                                    <p className="text-gray-600 whitespace-pre-wrap text-sm">{currentQuestion.explanation}</p>
                                </>
                           )}

                           {/* AI Dynamic Practice Button */}
                           <div className="mt-6 pt-4 border-t flex justify-center">
                                <button
                                    onClick={handleGenerateSimilar}
                                    disabled={isGeneratingSimilar}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 font-bold rounded-lg hover:bg-purple-200 transition-colors w-full justify-center border border-purple-300"
                                >
                                    {isGeneratingSimilar ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <SparklesIcon className="w-5 h-5" />}
                                    Praticar Variação com IA
                                </button>
                           </div>
                        </div>
                    </div>
                </main>

                {/* AI Hint */}
                {hint.used && viewState === 'question' && (
                    <div className="p-4 mx-6 mb-2 border-t border-b bg-yellow-50 rounded-lg animate-fadeIn">
                        <p className="font-semibold text-yellow-800 flex items-center gap-2"><LightbulbIcon className="w-5 h-5" /> Dica da IA</p>
                        <p className="text-sm text-yellow-700 mt-1">{hint.text}</p>
                    </div>
                )}

                {/* Footer */}
                <footer className="p-4 bg-gray-50 rounded-b-2xl flex-shrink-0 border-t">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <button onClick={handleBack} disabled={currentIndex <= 0 || isSaving} className="p-3 rounded-lg bg-white border shadow-sm hover:bg-gray-100 disabled:opacity-50">
                                <ArrowLeftIcon className="w-5 h-5" />
                            </button>
                            <button onClick={fetchHint} disabled={hint.isLoading || hint.used || viewState === 'result'} className="p-3 rounded-lg bg-yellow-400 text-yellow-900 hover:bg-yellow-500 disabled:opacity-50 transition-colors">
                                {hint.isLoading ? <ActionButtonSpinner /> : <LightbulbIcon className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="flex gap-2">
                            {viewState === 'question' ? (
                                <button onClick={handleConfirm} disabled={isSaving || (!isReview && selectedOption === null)} className="px-8 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors shadow-lg disabled:bg-gray-400 flex items-center gap-2">
                                    {isSaving ? <ActionButtonSpinner /> : 'Confirmar'}
                                </button>
                            ) : (
                                isPersistent ? (
                                    // Spaced Repetition Buttons
                                    <div className="grid grid-cols-4 gap-2 w-full sm:w-auto">
                                        <button onClick={() => handleSRSRating('again')} className="px-3 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 text-sm">
                                            Errei <br/><span className="text-[10px] font-normal opacity-80">1 min</span>
                                        </button>
                                        <button onClick={() => handleSRSRating('hard')} className="px-3 py-2 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 text-sm">
                                            Difícil <br/><span className="text-[10px] font-normal opacity-80">2 dias</span>
                                        </button>
                                        <button onClick={() => handleSRSRating('good')} className="px-3 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 text-sm">
                                            Bom <br/><span className="text-[10px] font-normal opacity-80">4 dias</span>
                                        </button>
                                        <button onClick={() => handleSRSRating('easy')} className="px-3 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 text-sm">
                                            Fácil <br/><span className="text-[10px] font-normal opacity-80">7 dias</span>
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={handleNext} className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors shadow-lg">
                                        {isLastQuestion ? 'Finalizar' : 'Próxima'}
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default FlashcardModal;
