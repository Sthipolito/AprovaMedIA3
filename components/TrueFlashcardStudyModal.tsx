
import React, { useState, useEffect, useCallback } from 'react';
import { FlashcardSet, TrueFlashcard } from '../types';
import { XIcon, BrainCircuitIcon, ChevronRightIcon, ArrowLeftIcon, RefreshCwIcon, LightbulbIcon } from './IconComponents';

interface TrueFlashcardStudyModalProps {
    deck: FlashcardSet;
    onClose: () => void;
}

const TrueFlashcardStudyModal: React.FC<TrueFlashcardStudyModalProps> = ({ deck, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    // Simple session stats
    const [confidence, setConfidence] = useState<{easy: number, hard: number, again: number}>({ easy: 0, hard: 0, again: 0 });

    const currentCard = deck.flashcards[currentIndex];
    const progress = ((currentIndex) / deck.flashcards.length) * 100;

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isFinished) return;
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent scrolling
                if (!isFlipped) setIsFlipped(true);
            }
            if (isFlipped) {
                if (e.key === '1') handleRate('again');
                if (e.key === '2') handleRate('hard');
                if (e.key === '3') handleRate('easy');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFlipped, isFinished]); // Dependencies matter here

    const handleFlip = () => setIsFlipped(!isFlipped);

    const handleRate = (rating: 'easy' | 'hard' | 'again') => {
        setConfidence(prev => ({ ...prev, [rating]: prev[rating] + 1 }));
        
        if (currentIndex < deck.flashcards.length - 1) {
            setIsFlipped(false);
            setCurrentIndex(prev => prev + 1);
        } else {
            setIsFinished(true);
        }
    };

    const restart = () => {
        setCurrentIndex(0);
        setIsFlipped(false);
        setIsFinished(false);
        setConfidence({ easy: 0, hard: 0, again: 0 });
    };

    if (isFinished) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 z-[100] flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BrainCircuitIcon className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Sessão Concluída!</h2>
                    <p className="text-gray-500 mb-8">Você revisou {deck.flashcards.length} conexões neurais.</p>
                    
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                            <p className="text-red-600 font-bold text-xl">{confidence.again}</p>
                            <p className="text-xs text-red-400 uppercase font-bold">Rever</p>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                            <p className="text-yellow-600 font-bold text-xl">{confidence.hard}</p>
                            <p className="text-xs text-yellow-400 uppercase font-bold">Difícil</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                            <p className="text-green-600 font-bold text-xl">{confidence.easy}</p>
                            <p className="text-xs text-green-400 uppercase font-bold">Fácil</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button onClick={restart} className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-transform hover:scale-105 shadow-lg flex items-center justify-center gap-2">
                            <RefreshCwIcon className="w-5 h-5"/> Estudar Novamente
                        </button>
                        <button onClick={onClose} className="w-full py-3 text-gray-500 font-semibold hover:bg-gray-100 rounded-xl transition-colors">
                            Voltar ao Menu
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-100 z-[100] flex flex-col">
            {/* Top Bar */}
            <div className="px-6 py-4 flex justify-between items-center bg-white shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <XIcon className="w-6 h-6 text-gray-500" />
                    </button>
                    <div className="h-2 w-32 md:w-64 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span className="text-sm font-bold text-gray-500">{currentIndex + 1} / {deck.flashcards.length}</span>
                </div>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-wider hidden sm:block">
                    {deck.subject_name}
                </div>
            </div>

            {/* Card Area */}
            <div className="flex-grow flex items-center justify-center p-4 perspective-1000">
                <div 
                    className="relative w-full max-w-2xl aspect-[4/3] cursor-pointer group"
                    onClick={handleFlip}
                    style={{ perspective: '1000px' }}
                >
                    <div 
                        className={`w-full h-full transition-transform duration-500 transform-style-3d shadow-2xl rounded-3xl bg-white border border-gray-200 ${isFlipped ? 'rotate-y-180' : ''}`}
                        style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                    >
                        {/* Front */}
                        <div className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-10 text-center" style={{ backfaceVisibility: 'hidden' }}>
                            <span className="absolute top-6 left-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Pergunta</span>
                            {currentCard.tag && <span className="absolute top-6 right-6 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase">{currentCard.tag}</span>}
                            
                            <h3 className="text-2xl md:text-4xl font-bold text-gray-800 leading-relaxed">
                                {currentCard.question}
                            </h3>
                            <p className="absolute bottom-6 text-sm text-gray-400 animate-pulse">Clique ou Espaço para virar</p>
                        </div>

                        {/* Back */}
                        <div 
                            className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-10 text-center bg-slate-50" 
                            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                        >
                            <span className="absolute top-6 left-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Resposta</span>
                            
                            <div className="overflow-y-auto max-h-full custom-scrollbar w-full flex flex-col items-center justify-center">
                                <p className="text-xl md:text-2xl font-medium text-gray-700 leading-relaxed mb-6">
                                    {currentCard.answer}
                                </p>
                                
                                {currentCard.mnemonic && (
                                    <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl max-w-md mx-auto animate-slideUp">
                                        <p className="text-purple-800 font-bold text-sm flex items-center justify-center gap-2 mb-1">
                                            <BrainCircuitIcon className="w-4 h-4"/> Neuro-Dica
                                        </p>
                                        <p className="text-purple-600 italic text-sm">{currentCard.mnemonic}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls Area */}
            <div className="h-24 bg-white border-t flex items-center justify-center gap-4 z-10">
                {!isFlipped ? (
                    <button 
                        onClick={handleFlip}
                        className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-transform hover:-translate-y-1 w-64"
                    >
                        Mostrar Resposta
                    </button>
                ) : (
                    <div className="grid grid-cols-3 gap-4 w-full max-w-2xl px-4">
                        <button onClick={() => handleRate('again')} className="flex flex-col items-center justify-center p-2 rounded-xl border-2 border-red-100 bg-red-50 hover:bg-red-100 hover:border-red-200 transition-colors group">
                            <span className="text-lg font-bold text-red-600 group-hover:scale-110 transition-transform">Errei</span>
                            <span className="text-[10px] text-red-400 font-mono">tecla 1</span>
                        </button>
                        <button onClick={() => handleRate('hard')} className="flex flex-col items-center justify-center p-2 rounded-xl border-2 border-yellow-100 bg-yellow-50 hover:bg-yellow-100 hover:border-yellow-200 transition-colors group">
                            <span className="text-lg font-bold text-yellow-600 group-hover:scale-110 transition-transform">Difícil</span>
                            <span className="text-[10px] text-yellow-400 font-mono">tecla 2</span>
                        </button>
                        <button onClick={() => handleRate('easy')} className="flex flex-col items-center justify-center p-2 rounded-xl border-2 border-green-100 bg-green-50 hover:bg-green-100 hover:border-green-200 transition-colors group">
                            <span className="text-lg font-bold text-green-600 group-hover:scale-110 transition-transform">Fácil</span>
                            <span className="text-[10px] text-green-400 font-mono">tecla 3</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrueFlashcardStudyModal;
