
import React, { useState, useEffect } from 'react';
import { Student, FlashcardSet } from '../../types';
import * as flashcardService from '../../services/flashcardService';
import { LayersIcon, BrainCircuitIcon, TrendingUpIcon } from '../IconComponents';
import TrueFlashcardStudyModal from '../TrueFlashcardStudyModal';

interface StudentTrueFlashcardsPageProps {
    student: Student;
}

const StudentTrueFlashcardsPage: React.FC<StudentTrueFlashcardsPageProps> = ({ student }) => {
    const [decks, setDecks] = useState<FlashcardSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeDeck, setActiveDeck] = useState<FlashcardSet | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await flashcardService.getFlashcardSets();
            setDecks(data);
            setLoading(false);
        };
        load();
    }, []);

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
            <header className="p-8 border-b border-gray-200 bg-white">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <LayersIcon className="w-8 h-8 text-primary" />
                    Meus Baralhos (Flashcards)
                </h1>
                <p className="text-gray-500 mt-1">Pratique a memorização ativa com o método de repetição espaçada.</p>
            </header>

            <main className="flex-grow p-8">
                {loading ? (
                    <div className="flex justify-center items-center h-64"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                ) : decks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {decks.map(deck => (
                            <button 
                                key={deck.id} 
                                onClick={() => setActiveDeck(deck)}
                                className="group relative bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-left flex flex-col h-full"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="p-6 flex-grow">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-inner">
                                            <BrainCircuitIcon className="w-8 h-8" />
                                        </div>
                                        <div className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                                            Novo
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">{deck.subject_name}</h3>
                                    <p className="text-sm text-gray-500 mb-4">Disciplina: Geral</p> {/* Placeholder for joined discipline name */}
                                    
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md font-medium">
                                            <LayersIcon className="w-4 h-4"/> {deck.flashcards.length} Cards
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-between items-center group-hover:bg-primary/5 transition-colors">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-primary">Iniciar Sessão</span>
                                    <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <TrendingUpIcon className="w-4 h-4 text-primary"/>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <LayersIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h2 className="text-xl font-semibold text-gray-600">Nenhum baralho disponível</h2>
                        <p className="mt-2 text-gray-400">Peça ao seu professor para criar novos conjuntos de flashcards.</p>
                    </div>
                )}
            </main>

            {activeDeck && (
                <TrueFlashcardStudyModal 
                    deck={activeDeck} 
                    onClose={() => setActiveDeck(null)} 
                />
            )}
        </div>
    );
};

export default StudentTrueFlashcardsPage;
