
import React, { useState, useEffect } from 'react';
import { Student, LibraryItem, QuestionSet } from '../../types';
import * as studyLibraryService from '../../services/studyLibraryService';
import FlashcardModal from '../FlashcardModal';
import { BookOpenIcon, LayersIcon, CheckCircleIcon, TrashIcon } from '../IconComponents';

interface StudentLibraryPageProps {
    student: Student;
}

const StudentLibraryPage: React.FC<StudentLibraryPageProps> = ({ student }) => {
    const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [setForStudy, setSetForStudy] = useState<QuestionSet | null>(null);

    const loadLibrary = async () => {
        setIsLoading(true);
        const data = await studyLibraryService.getStudentLibrary(student.id);
        setLibraryItems(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadLibrary();
    }, [student.id]);

    const handleRemove = async (e: React.MouseEvent, setId: string) => {
        e.stopPropagation();
        if (window.confirm("Remover este item da sua biblioteca?")) {
            await studyLibraryService.removeFromLibrary(student.id, setId);
            setLibraryItems(prev => prev.filter(item => item.question_set_id !== setId));
        }
    };

    const handleStartStudy = (item: LibraryItem) => {
        setSetForStudy({
            id: item.question_set_id,
            subjectName: item.subject_name,
            questions: item.questions,
            disciplineId: 'unknown', // Not needed for study
            createdAt: item.added_at
        });
    };

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50 overflow-hidden">
                <header className="px-8 py-6 border-b border-gray-200 bg-white flex-shrink-0">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <BookOpenIcon className="w-7 h-7 text-primary" />
                        Minha Biblioteca
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">Gerencie seus materiais de estudo ativos e acompanhe seu progresso.</p>
                </header>

                <main className="flex-grow p-6 overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                         <div className="flex justify-center items-center h-full"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                    ) : libraryItems.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {libraryItems.map(item => (
                                <div 
                                    key={item.library_id} 
                                    onClick={() => handleStartStudy(item)}
                                    className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    
                                    <div className="p-5 flex gap-4">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.subject_name} className="w-16 h-16 rounded-lg object-cover border border-gray-100 flex-shrink-0"/>
                                        ) : (
                                            <div className="w-16 h-16 rounded-lg bg-primary/5 flex items-center justify-center text-primary flex-shrink-0">
                                                <LayersIcon className="w-6 h-6" />
                                            </div>
                                        )}
                                        <div className="flex-grow min-w-0">
                                            <h3 className="font-bold text-gray-800 text-base line-clamp-2 leading-tight mb-1">
                                                {item.subject_name}
                                            </h3>
                                            <p className="text-xs text-gray-400">Adicionado em {new Date(item.added_at).toLocaleDateString()}</p>
                                            
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${item.difficulty === 'Difícil' ? 'bg-red-50 text-red-700 border-red-100' : item.difficulty === 'Fácil' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                                    {item.difficulty}
                                                </span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold border border-gray-200">
                                                    {item.questions.length} Qs
                                                </span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => handleRemove(e, item.question_set_id)}
                                            className="self-start text-gray-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                                            title="Remover da Biblioteca"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <div className="mt-auto px-5 pb-4 pt-0">
                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            {/* Mock progress bar for visual - connect to real stats later */}
                                            <div className="h-full bg-primary w-[0%] group-hover:w-[10%] transition-all duration-500"></div>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider group-hover:underline">Estudar Agora</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <div className="p-6 bg-white rounded-full mb-4 inline-block shadow-sm border border-gray-100">
                                <BookOpenIcon className="w-12 h-12 text-gray-300" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-700">Sua biblioteca está vazia</h2>
                            <p className="text-gray-500 mt-2 max-w-md mx-auto mb-6">
                                Vá até a aba "Explorar Banco" para descobrir conteúdos e adicionar aos seus estudos.
                            </p>
                        </div>
                    )}
                </main>
            </div>

            {setForStudy && (
                <FlashcardModal
                    studentId={student.id}
                    questionSet={setForStudy}
                    onClose={() => setSetForStudy(null)}
                />
            )}
        </>
    );
};

export default StudentLibraryPage;
