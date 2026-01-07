import React, { useState, useEffect } from 'react';
import { Course, Module, Discipline, QuestionSet, Student, StudentFlashcardSession } from '../../types';
import FlashcardModal from '../FlashcardModal';
import { getStructuredQuestionBank } from '../../services/questionBankService';
import * as crmService from '../../services/crmService';
import { LayersIcon, ChevronRightIcon } from '../IconComponents';
import ContentCarousel from '../ContentCarousel';

interface StudentFlashcardsPageProps {
    student: Student;
}

const StudentFlashcardsPage: React.FC<StudentFlashcardsPageProps> = ({ student }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [setForStudy, setSetForStudy] = useState<QuestionSet | null>(null);

    // New states for tabs and ongoing sessions
    const [activeTab, setActiveTab] = useState<'explore' | 'sessions'>('explore');
    const [inProgressSessions, setInProgressSessions] = useState<StudentFlashcardSession[]>([]);

    // Navigation state
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const [allCourses, allSessions] = await Promise.all([
                getStructuredQuestionBank(),
                crmService.getStudentFlashcardSessions(student.id),
            ]);
            setCourses(allCourses);
            
            const ongoing = allSessions.filter(s => s.status === 'in_progress' && s.question_sets && s.current_question_index < (s.question_sets.questions?.length || 0));
            setInProgressSessions(ongoing);

            // Default to sessions tab if there are any in progress
            if (ongoing.length > 0) {
                setActiveTab('sessions');
            }

            setIsLoading(false);
        };
        loadData();
    }, [student.id]);

    // Reset child selections when a parent is selected/deselected
    useEffect(() => {
        setSelectedModule(null);
        setSelectedDiscipline(null);
    }, [selectedCourse]);

    useEffect(() => {
        setSelectedDiscipline(null);
    }, [selectedModule]);

    const handleStartStudy = (set: QuestionSet) => {
        setSetForStudy(set);
    };
    
    const handleContinueStudy = (session: StudentFlashcardSession) => {
        if (session.question_sets) {
            // The FlashcardModal expects an object with subjectName, not subject_name
            setSetForStudy({
                id: session.question_sets.id,
                subjectName: session.question_sets.subject_name,
                questions: session.question_sets.questions,
                // These are not strictly needed by the modal but good to have
                disciplineId: 'unknown',
                createdAt: session.created_at,
            });
        }
    };

    const Breadcrumbs = () => (
        <nav className="flex items-center text-sm text-gray-500 mb-6 flex-wrap">
            <button onClick={() => setSelectedCourse(null)} className="hover:underline">Cursos</button>
            {selectedCourse && (
                <>
                    <ChevronRightIcon className="w-4 h-4 mx-1 flex-shrink-0" />
                    <button onClick={() => { setSelectedModule(null); setSelectedDiscipline(null); }} className="hover:underline font-medium text-gray-700 truncate">{selectedCourse.name}</button>
                </>
            )}
            {selectedModule && (
                 <>
                    <ChevronRightIcon className="w-4 h-4 mx-1 flex-shrink-0" />
                    <button onClick={() => { setSelectedDiscipline(null); }} className="hover:underline font-medium text-gray-700 truncate">{selectedModule.name}</button>
                </>
            )}
             {selectedDiscipline && (
                 <>
                    <ChevronRightIcon className="w-4 h-4 mx-1 flex-shrink-0" />
                    <span className="font-medium text-gray-900 truncate">{selectedDiscipline.name}</span>
                </>
            )}
        </nav>
    );

    const renderSessionsTab = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-full">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            );
        }

        if (inProgressSessions.length === 0) {
            return (
                 <div className="text-center py-20">
                    <div className="p-4 bg-white rounded-full mb-4 inline-block shadow-md">
                        <LayersIcon className="w-12 h-12 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-700">Nenhuma Sessão em Andamento</h2>
                    <p className="text-gray-500 mt-2 max-w-md mx-auto">
                        Comece a estudar um novo assunto na aba "Explorar Conteúdo" e sua sessão aparecerá aqui para você continuar depois.
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {inProgressSessions.map(session => {
                    if (!session.question_sets) return null;
                    const totalQuestions = session.question_sets.questions.length;
                    const progressPercent = totalQuestions > 0 ? ((session.current_question_index) / totalQuestions) * 100 : 0;

                    return (
                        <div key={session.id} className="bg-white p-4 rounded-lg border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex-grow">
                                <h3 className="font-bold text-gray-800">{session.question_sets.subject_name}</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Parou na questão {session.current_question_index + 1} de {totalQuestions}
                                </p>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleContinueStudy(session)}
                                className="px-4 py-2 bg-primary text-white font-semibold rounded-lg text-sm hover:bg-primary-dark transition-colors flex-shrink-0 w-full sm:w-auto"
                            >
                                Continuar de onde parei
                            </button>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderExploreTab = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-full">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            );
        }

        if (courses.length === 0) {
            return (
                <div className="text-center py-20">
                    <div className="p-4 bg-white rounded-full mb-4 inline-block shadow-md">
                        <LayersIcon className="w-12 h-12 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-700">Nenhum Flashcard Disponível</h2>
                    <p className="text-gray-500 mt-2 max-w-md mx-auto">
                        Parece que ainda não há conjuntos de flashcards no seu curso. Assim que forem adicionados, eles aparecerão aqui.
                    </p>
                </div>
            );
        }

        if (selectedDiscipline) {
            return <ContentCarousel title="Assuntos para Estudar" items={selectedDiscipline.question_sets || []} type="question_set" onSelect={(item) => handleStartStudy(item as QuestionSet)} />;
        }
        if (selectedModule) {
            return <ContentCarousel title="Disciplinas" items={selectedModule.disciplines || []} type="discipline" onSelect={setSelectedDiscipline} />;
        }
        if (selectedCourse) {
            return <ContentCarousel title="Módulos" items={selectedCourse.modules || []} type="module" onSelect={setSelectedModule} />;
        }
        return <ContentCarousel title="Cursos" items={courses} type="course" onSelect={setSelectedCourse} />;
    };

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
                <header className="p-6 border-b border-gray-200 bg-white">
                    <h1 className="text-3xl font-bold text-gray-800">Meus Flashcards</h1>
                    <p className="text-gray-500 mt-1">Navegue pelo seu curso e inicie uma sessão de estudo.</p>
                </header>
                <div className="p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
                    <nav className="flex space-x-2">
                        <button onClick={() => setActiveTab('sessions')} className={`px-4 py-2 font-semibold text-sm rounded-lg ${activeTab === 'sessions' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-200'}`}>
                            Sessões em Andamento ({inProgressSessions.length})
                        </button>
                        <button onClick={() => setActiveTab('explore')} className={`px-4 py-2 font-semibold text-sm rounded-lg ${activeTab === 'explore' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-200'}`}>
                            Explorar Conteúdo
                        </button>
                    </nav>
                </div>
                <main className="flex-grow p-6">
                    {activeTab === 'explore' && <Breadcrumbs />}
                    {activeTab === 'explore' ? renderExploreTab() : renderSessionsTab()}
                </main>
            </div>
            {setForStudy && (
                <FlashcardModal
                    studentId={student.id}
                    questionSet={setForStudy as { id: string; subjectName: string; questions: any[]}}
                    onClose={() => setSetForStudy(null)}
                />
            )}
        </>
    );
};

export default StudentFlashcardsPage;
