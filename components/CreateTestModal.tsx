
import React, { useState, useEffect, useMemo } from 'react';
import { XIcon, ChevronRightIcon, ArrowLeftIcon, SearchIcon } from './IconComponents';
import * as academicService from '../services/academicService';
import * as questionBankService from '../services/questionBankService';
import * as testService from '../services/testService';
import { Course, Module, Discipline, QuestionSet, QuizQuestion, Class, Student } from '../types';

type Step = 1 | 2 | 3;

interface CreateTestModalProps {
    onClose: () => void;
    onTestCreated: () => void;
    initialData?: {
        name: string;
        questions: QuizQuestion[];
        disciplineId: string;
    } | null;
}

const CreateTestModal: React.FC<CreateTestModalProps> = ({ onClose, onTestCreated, initialData }) => {
    const [step, setStep] = useState<Step>(1);
    
    // Step 1 State
    const [testName, setTestName] = useState('');
    const [banca, setBanca] = useState(''); // Added Banca State
    const [contextCourseId, setContextCourseId] = useState<string | null>(null);
    const [contextModuleId, setContextModuleId] = useState<string | null>(null);
    const [contextDisciplineId, setContextDisciplineId] = useState<string | null>(null);
    
    // Step 2 State
    const [allQuestionSets, setAllQuestionSets] = useState<QuestionSet[]>([]);
    const [selectedQuestions, setSelectedQuestions] = useState<Map<string, QuizQuestion>>(new Map());
    const [questionFilter, setQuestionFilter] = useState('');

    // Step 3 State
    const [testType, setTestType] = useState<'fixed' | 'scheduled'>('fixed');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [assignedClassIds, setAssignedClassIds] = useState<Set<string>>(new Set());
    const [assignedStudentIds, setAssignedStudentIds] = useState<Set<string>>(new Set());
    const [studentSearchTerm, setStudentSearchTerm] = useState('');

    // Data for selectors
    const [courses, setCourses] = useState<Course[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Fetch initial data for selectors
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [coursesData, bankData, classesData, studentsData] = await Promise.all([
                academicService.getCourses(),
                questionBankService.getStructuredQuestionBank(),
                academicService.getClasses(),
                academicService.getAllStudentsWithDetails(),
            ]);
            setCourses(coursesData);
            setClasses(classesData);
            setStudents(studentsData);
            const allSets = bankData.flatMap(c => c.modules?.flatMap(m => m.disciplines?.flatMap(d => d.question_sets) || []) || []);
            setAllQuestionSets(allSets.filter(Boolean) as QuestionSet[]);
            
            // Handle Initial Data (Pre-fill and Jump to Step 3)
            if (initialData) {
                setTestName(initialData.name);
                
                // Pre-select questions
                const initialMap = new Map<string, QuizQuestion>();
                initialData.questions.forEach((q, i) => {
                    initialMap.set(`preselected-${i}`, q);
                });
                setSelectedQuestions(initialMap);

                // Reverse lookup Context (Course/Module from Discipline)
                const targetDiscId = initialData.disciplineId;
                let foundCourseId = '';
                let foundModuleId = '';

                // Find the hierarchy
                // Note: bankData is structured as Course -> Modules -> Disciplines
                for (const course of bankData) {
                    if (course.modules) {
                        for (const mod of course.modules) {
                            if (mod.disciplines?.some(d => d.id === targetDiscId)) {
                                foundCourseId = course.id;
                                foundModuleId = mod.id;
                                break;
                            }
                        }
                    }
                    if (foundCourseId) break;
                }

                if (foundCourseId) {
                    setContextCourseId(foundCourseId);
                    // Fetch modules for this course immediately to populate dropdowns if user goes back
                    const courseModules = await academicService.getModules(foundCourseId);
                    setModules(courseModules);
                    setContextModuleId(foundModuleId);
                    
                    const modDisciplines = await academicService.getDisciplines(foundModuleId);
                    setDisciplines(modDisciplines);
                    setContextDisciplineId(targetDiscId);
                }

                // Jump to Step 3
                setStep(3);
            }

            setIsLoading(false);
        };
        fetchData();
    }, [initialData]);

    // Fetch dependent data (Only if user interacts manually)
    useEffect(() => {
        if (contextCourseId && !initialData) { // Avoid overwriting if initialData is loading
            academicService.getModules(contextCourseId).then(setModules);
            setContextModuleId(null);
        } else if (!contextCourseId) {
            setModules([]);
        }
    }, [contextCourseId]);

    useEffect(() => {
        if (contextModuleId && !initialData) { // Avoid overwriting
            academicService.getDisciplines(contextModuleId).then(setDisciplines);
            setContextDisciplineId(null);
        } else if (!contextModuleId) {
            setDisciplines([]);
        }
    }, [contextModuleId]);

    // Memoized filters
    const filteredQuestionSets = useMemo(() => {
        return allQuestionSets.filter(set => set.subjectName.toLowerCase().includes(questionFilter.toLowerCase()));
    }, [allQuestionSets, questionFilter]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()));
    }, [students, studentSearchTerm]);

    // Validation
    const isStep1Valid = testName.trim() !== '';
    const isStep2Valid = selectedQuestions.size > 0;
    const isStep3Valid = testType === 'fixed' || (testType === 'scheduled' && startTime && endTime && (assignedClassIds.size > 0 || assignedStudentIds.size > 0));

    // Handlers
    const handleToggleQuestion = (q: QuizQuestion, qSetId: string, qIndex: number) => {
        const key = `${qSetId}-${qIndex}`;
        const newSelection = new Map(selectedQuestions);
        if (newSelection.has(key)) {
            newSelection.delete(key);
        } else {
            newSelection.set(key, q);
        }
        setSelectedQuestions(newSelection);
    };
    
     const handleToggleClass = (classId: string) => {
        const newSelection = new Set(assignedClassIds);
        if (newSelection.has(classId)) {
            newSelection.delete(classId);
        } else {
            newSelection.add(classId);
        }
        setAssignedClassIds(newSelection);
    };
    
    const handleToggleStudent = (studentId: string) => {
        const newSelection = new Set(assignedStudentIds);
        if (newSelection.has(studentId)) {
            newSelection.delete(studentId);
        } else {
            newSelection.add(studentId);
        }
        setAssignedStudentIds(newSelection);
    };

    const handleCreateTest = async () => {
        if (!isStep1Valid || !isStep2Valid || !isStep3Valid) return;
        setIsCreating(true);

        const newTest = await testService.createTest(
            testName,
            Array.from(selectedQuestions.values()),
            testType,
            { 
                courseId: contextCourseId || null, 
                moduleId: contextModuleId || null, 
                disciplineId: contextDisciplineId || null,
                banca: banca || null
            }
        );

        if (newTest && testType === 'scheduled') {
            await testService.createTestAssignment(
                newTest.id,
                new Date(startTime).toISOString(),
                new Date(endTime).toISOString(),
                Array.from(assignedClassIds),
                Array.from(assignedStudentIds)
            );
        }
        
        setIsCreating(false);
        if (newTest) {
            alert("Teste criado com sucesso!");
            onTestCreated();
        } else {
            alert("Falha ao criar o teste.");
        }
    };
    
    // Render functions for each step
    const renderStep1 = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">1. Detalhes do Teste</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Teste</label>
                    <input type="text" value={testName} onChange={e => setTestName(e.target.value)} placeholder="Ex: Prova Mensal de Cardiologia" className="w-full p-2 border rounded-md bg-white text-gray-800 placeholder:text-gray-400"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Banca Examinadora</label>
                    <input type="text" value={banca} onChange={e => setBanca(e.target.value)} placeholder="Ex: FGV, Cebraspe" className="w-full p-2 border rounded-md bg-white text-gray-800 placeholder:text-gray-400"/>
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contexto Acadêmico (Opcional)</label>
                <div className="space-y-2 p-2 border rounded-md bg-gray-50">
                    <select value={contextCourseId || ''} onChange={e => setContextCourseId(e.target.value)} className="w-full p-2 border rounded-md bg-white text-gray-800 disabled:bg-gray-100">
                        <option value="">Selecione o Curso</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={contextModuleId || ''} onChange={e => setContextModuleId(e.target.value)} className="w-full p-2 border rounded-md bg-white text-gray-800 disabled:bg-gray-100" disabled={!contextCourseId}>
                        <option value="">Selecione o Módulo</option>
                        {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                     <select value={contextDisciplineId || ''} onChange={e => setContextDisciplineId(e.target.value)} className="w-full p-2 border rounded-md bg-white text-gray-800 disabled:bg-gray-100" disabled={!contextModuleId}>
                        <option value="">Selecione a Disciplina</option>
                        {disciplines.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
    
    const renderStep2 = () => (
        <div>
             <h3 className="text-xl font-semibold text-gray-800 mb-4">2. Selecionar Questões ({selectedQuestions.size})</h3>
             <div className="grid grid-cols-2 gap-4 h-[50vh]">
                <div className="border rounded-lg p-3 flex flex-col">
                    <h4 className="font-semibold mb-2">Banco de Questões</h4>
                    <input type="text" value={questionFilter} onChange={e => setQuestionFilter(e.target.value)} placeholder="Filtrar por assunto..." className="w-full p-2 border rounded-md mb-2 bg-white text-gray-800 placeholder:text-gray-400"/>
                    <div className="overflow-y-auto space-y-2">
                        {filteredQuestionSets.map(set => (
                            <div key={set.id}>
                                <p className="font-semibold text-sm text-primary">{set.subjectName}</p>
                                <div className="pl-2 space-y-1 mt-1">
                                {set.questions.map((q, i) => (
                                    <div key={`${set.id}-${i}`} className="flex items-start gap-2 text-sm p-1 rounded hover:bg-gray-100">
                                        <input type="checkbox" checked={selectedQuestions.has(`${set.id}-${i}`)} onChange={() => handleToggleQuestion(q, set.id, i)} className="mt-1"/>
                                        <label className="truncate">{q.question}</label>
                                    </div>
                                ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="border rounded-lg p-3 flex flex-col">
                    <h4 className="font-semibold mb-2">Questões Selecionadas</h4>
                    <div className="overflow-y-auto space-y-1 text-sm">
                        {Array.from(selectedQuestions.entries()).map(([key, q], i) => (
                            <div key={key} className="flex items-center gap-2 p-1 bg-gray-50 rounded">
                                <span className="font-mono text-xs w-6">{i+1}.</span>
                                <p className="truncate flex-grow">{q.question}</p>
                                <button onClick={() => {
                                    if (initialData) {
                                        alert("Não é possível remover questões no modo de criação rápida. Crie um teste personalizado se desejar.");
                                        return;
                                    }
                                    const keyParts = key.split('-');
                                    if (keyParts.length >= 2) {
                                         handleToggleQuestion(q, keyParts[0], parseInt(keyParts[1]));
                                    } else {
                                        // Fallback for preselected items with dummy keys
                                        const newSelection = new Map(selectedQuestions);
                                        newSelection.delete(key);
                                        setSelectedQuestions(newSelection);
                                    }
                                }} className="text-red-500 p-1">
                                    <XIcon className="w-3 h-3"/>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
        </div>
    );

    const renderStep3 = () => (
         <div className="space-y-4">
             <h3 className="text-xl font-semibold text-gray-800">3. Agendamento e Atribuição</h3>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Teste</label>
                <div className="flex gap-2">
                    <button onClick={() => setTestType('fixed')} className={`flex-1 p-3 rounded-lg border ${testType === 'fixed' ? 'bg-primary/10 border-primary' : ''}`}>Fixo (Para estudo)</button>
                    <button onClick={() => setTestType('scheduled')} className={`flex-1 p-3 rounded-lg border ${testType === 'scheduled' ? 'bg-primary/10 border-primary' : ''}`}>Agendado (Avaliação)</button>
                </div>
             </div>
             {testType === 'scheduled' && (
                <div className="space-y-4 p-3 border rounded-lg bg-gray-50">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Período de Realização</label>
                        <div className="flex gap-2">
                            <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-2 border rounded-md bg-white text-gray-800 [&:not(:focus):not(:valid)]:text-gray-500"/>
                            <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-2 border rounded-md bg-white text-gray-800 [&:not(:focus):not(:valid)]:text-gray-500"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Atribuir Para</label>
                        <div className="grid grid-cols-2 gap-4 h-[25vh]">
                            <div className="border rounded-lg p-2 flex flex-col">
                                <h5 className="font-semibold text-sm mb-1">Turmas</h5>
                                <div className="overflow-y-auto space-y-1">
                                    {classes.map(c => (
                                        <div key={c.id} className="flex items-center gap-2 p-1 text-sm rounded hover:bg-gray-100">
                                            <input type="checkbox" checked={assignedClassIds.has(c.id)} onChange={() => handleToggleClass(c.id)}/>
                                            <label>{c.name}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                             <div className="border rounded-lg p-2 flex flex-col">
                                <h5 className="font-semibold text-sm mb-1">Alunos Específicos</h5>
                                <input type="text" value={studentSearchTerm} onChange={e => setStudentSearchTerm(e.target.value)} placeholder="Buscar aluno..." className="w-full p-1 border rounded-md mb-1 text-sm bg-white text-gray-800 placeholder:text-gray-400"/>
                                <div className="overflow-y-auto space-y-1">
                                     {filteredStudents.map(s => (
                                        <div key={s.id} className="flex items-center gap-2 p-1 text-sm rounded hover:bg-gray-100">
                                            <input type="checkbox" checked={assignedStudentIds.has(s.id)} onChange={() => handleToggleStudent(s.id)}/>
                                            <label>{s.name}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
             )}
        </div>
    );
    
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Criar Novo Teste</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><XIcon className="w-6 h-6"/></button>
                </header>
                <main className="flex-grow p-6 overflow-y-auto">
                    {isLoading ? <div className="flex justify-center items-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div> : (
                        step === 1 ? renderStep1() :
                        step === 2 ? renderStep2() :
                        renderStep3()
                    )}
                </main>
                <footer className="p-4 bg-gray-50 border-t flex justify-between items-center">
                    <div>
                        {step > 1 && <button onClick={() => setStep(s => s - 1 as Step)} className="px-4 py-2 flex items-center gap-2 font-semibold rounded-lg hover:bg-gray-200"><ArrowLeftIcon className="w-5 h-5"/> Voltar</button>}
                    </div>
                    <div>
                        {step < 3 ? (
                            <button onClick={() => setStep(s => s + 1 as Step)} disabled={step === 1 ? !isStep1Valid : !isStep2Valid} className="px-4 py-2 flex items-center gap-2 font-semibold rounded-lg bg-primary text-white hover:bg-primary-dark disabled:bg-gray-300">
                                Próximo <ChevronRightIcon className="w-5 h-5"/>
                            </button>
                        ) : (
                            <button onClick={handleCreateTest} disabled={!isStep3Valid || isCreating} className="px-6 py-2 font-semibold rounded-lg bg-primary text-white hover:bg-primary-dark disabled:bg-gray-300">
                                {isCreating ? 'Criando...' : 'Criar Teste'}
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default CreateTestModal;
