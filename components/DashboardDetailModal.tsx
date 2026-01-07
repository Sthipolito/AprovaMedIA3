import React, { useState, useEffect } from 'react';
import { XIcon } from './IconComponents';
import * as academicService from '../services/academicService';
import * as testService from '../services/testService';
import * as crmService from '../services/crmService';
// FIX: Import TestWithAnalytics from testService where it is defined, not from the general types file.
import { Student, Course, Module, Discipline, QuestionSet, StudentFlashcardSession } from '../types';
import { TestWithAnalytics } from '../services/testService';

interface DashboardDetailModalProps {
    title: string;
    dataType: string;
    onClose: () => void;
    onItemClick: (item: any, dataType: string) => void;
}

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-2 animate-pulse">
        {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded-lg"></div>
        ))}
    </div>
);

const DashboardDetailModal: React.FC<DashboardDetailModalProps> = ({ title, dataType, onClose, onItemClick }) => {
    const [items, setItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            let data: any[] = [];
            try {
                if (['courses', 'modules', 'disciplines', 'questionSets'].includes(dataType)) {
                    const structuredData = await academicService.getStructuredDataForManagement();
                     switch (dataType) {
                        case 'courses':
                            data = structuredData;
                            break;
                        case 'modules':
                            data = structuredData.flatMap(c => c.modules || []);
                            break;
                        case 'disciplines':
                            data = structuredData.flatMap(c => c.modules?.flatMap(m => m.disciplines || []) || []);
                            break;
                        case 'questionSets':
                            data = structuredData.flatMap(c => c.modules?.flatMap(m => m.disciplines?.flatMap(d => d.question_sets) || []) || []);
                            break;
                    }
                } else if (dataType === 'students') {
                    data = await academicService.getAllStudentsWithDetails();
                } else if (dataType === 'tests') {
                    data = await testService.getTestsWithAnalytics();
                } else if (dataType === 'flashcardSessions') {
                    data = await crmService.getAllFlashcardSessions();
                }
                setItems(data.filter(Boolean));
            } catch (error) {
                console.error(`Failed to fetch data for ${dataType}:`, error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [dataType]);

    const renderItem = (item: any) => {
        const baseButtonClasses = "w-full text-left bg-gray-50 p-3 rounded-lg border hover:bg-primary/10 hover:border-primary/50 transition-colors";
        
        switch (dataType) {
            case 'students':
                const student = item as Student;
                return (
                    <button key={student.id} onClick={() => onItemClick(student, dataType)} className={baseButtonClasses}>
                        <p className="font-semibold text-gray-800">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.classes?.courses?.name} / {student.classes?.name}</p>
                    </button>
                );
            case 'courses':
                const course = item as Course;
                return (
                     <button key={course.id} onClick={() => onItemClick(course, dataType)} className={baseButtonClasses}>
                        <p className="font-semibold text-gray-800">{course.name}</p>
                        <p className="text-xs text-gray-500">{course.modules?.length || 0} módulos • {course.classes?.length || 0} turmas</p>
                    </button>
                );
            case 'modules':
                const module = item as Module;
                return (
                    <button key={module.id} onClick={() => onItemClick(module, dataType)} className={baseButtonClasses}>
                        <p className="font-semibold text-gray-800">{module.name}</p>
                        <p className="text-xs text-gray-500">{module.disciplines?.length || 0} disciplinas</p>
                    </button>
                );
            case 'disciplines':
                const discipline = item as Discipline;
                return (
                    <button key={discipline.id} onClick={() => onItemClick(discipline, dataType)} className={baseButtonClasses}>
                        <p className="font-semibold text-gray-800">{discipline.name}</p>
                        <p className="text-xs text-gray-500">{discipline.question_sets?.length || 0} assuntos</p>
                    </button>
                );
            case 'questionSets':
                const set = item as QuestionSet;
                return (
                    // This one might not have a dedicated detail view yet, so we just log for now
                    <div key={set.id} className="bg-gray-50 p-3 rounded-lg border">
                        <p className="font-semibold text-gray-800">{set.subjectName}</p>
                        <p className="text-xs text-gray-500">{set.questions.length} questões</p>
                    </div>
                );
            case 'tests':
                const test = item as TestWithAnalytics;
                return (
                    <button key={test.id} onClick={() => onItemClick(test, dataType)} className={baseButtonClasses}>
                        <div className="flex justify-between items-center">
                            <p className="font-semibold text-gray-800">{test.name}</p>
                            <span className="text-xs font-bold text-primary">{test.averageScore}% Média</span>
                        </div>
                        <p className="text-xs text-gray-500">{test.questions.length} questões • {test.attemptCount} tentativas</p>
                    </button>
                );
            case 'flashcardSessions':
                const session = item as StudentFlashcardSession & { students: { name: string } | null, question_sets: { subject_name: string } | null };
                return (
                     <button key={session.id} onClick={() => onItemClick(session, dataType)} className={baseButtonClasses}>
                        <p className="font-semibold text-gray-800">{session.question_sets?.subject_name || 'Assunto Excluído'}</p>
                        <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                             <p>Aluno: {session.students?.name || 'N/A'}</p>
                            <p>Acertos: <span className="font-bold text-green-600">{session.correct_answers}</span> | Erros: <span className="font-bold text-red-600">{session.incorrect_answers}</span></p>
                        </div>
                    </button>
                );
            default:
                return (
                     <div key={item.id} className="bg-gray-50 p-3 rounded-lg border">
                        <p className="font-semibold text-gray-800">{item.name || item.subjectName}</p>
                    </div>
                );
        }
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose}></div>
            <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
                <header className="p-4 border-b bg-gray-50 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-800">{title} ({items.length})</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
                            <XIcon className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>
                </header>
                <main className="flex-grow p-4 overflow-y-auto">
                    {isLoading ? <LoadingSkeleton /> : (
                        items.length > 0 ? (
                            <div className="space-y-2">
                                {items.map(renderItem)}
                            </div>
                        ) : <p className="text-center text-gray-500 py-8">Nenhum item encontrado.</p>
                    )}
                </main>
            </div>
        </>
    );
};

export default DashboardDetailModal;