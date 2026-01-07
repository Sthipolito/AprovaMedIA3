
import React, { useState, useEffect, useMemo } from 'react';
import { XIcon, ChevronRightIcon, ArrowLeftIcon, SearchIcon, EditIcon } from './IconComponents';
import * as academicService from '../services/academicService';
import * as testService from '../services/testService';
import { Course, Module, Discipline, QuizQuestion, Class, Student, Test } from '../types';
import { TestWithAnalytics } from '../services/testService';

type Step = 1 | 2 | 3;

const EditTestModal: React.FC<{ test: TestWithAnalytics; onClose: () => void; onTestUpdated: () => void; }> = ({ test, onClose, onTestUpdated }) => {
    const [step, setStep] = useState<Step>(1);
    
    // Step 1 State
    const [testName, setTestName] = useState('');
    const [banca, setBanca] = useState(''); // New Field for Banca
    const [contextCourseId, setContextCourseId] = useState<string | null>(null);
    const [contextModuleId, setContextModuleId] = useState<string | null>(null);
    const [contextDisciplineId, setContextDisciplineId] = useState<string | null>(null);
    
    // Step 2 State
    const [selectedQuestions, setSelectedQuestions] = useState<Map<string, QuizQuestion>>(new Map());

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
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch initial data for selectors and populate state from test prop
    useEffect(() => {
        const fetchDataAndInit = async () => {
            setIsLoading(true);

            // Populate from prop
            setTestName(test.name);
            setBanca(test.banca || ''); // Populate Banca
            setContextCourseId(test.course_id || null);
            setContextModuleId(test.module_id || null);
            setContextDisciplineId(test.discipline_id || null);
            setSelectedQuestions(new Map(test.questions.map((q, i) => [`initial-q-${i}`, q])));
            setTestType(test.test_type);

            if (test.test_type === 'scheduled' && test.assignments.length > 0) {
                const assignment = test.assignments[0];
                setStartTime(new Date(assignment.start_time).toISOString().slice(0, 16));
                setEndTime(new Date(assignment.end_time).toISOString().slice(0, 16));
                setAssignedClassIds(new Set(assignment.classes.map(c => c.id)));
                setAssignedStudentIds(new Set(assignment.students.map(s => s.id)));
            }

            // Fetch selectors data
            const [coursesData, classesData, studentsData] = await Promise.all([
                academicService.getCourses(),
                academicService.getClasses(),
                academicService.getAllStudentsWithDetails(),
            ]);
            setCourses(coursesData);
            setClasses(classesData);
            setStudents(studentsData);

            setIsLoading(false);
        };
        fetchDataAndInit();
    }, [test]);

    // Fetch dependent data
    useEffect(() => {
        if (contextCourseId) academicService.getModules(contextCourseId).then(setModules);
        else setModules([]);
    }, [contextCourseId]);

    useEffect(() => {
        if (contextModuleId) academicService.getDisciplines(contextModuleId).then(setDisciplines);
        else setDisciplines([]);
    }, [contextModuleId]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()));
    }, [students, studentSearchTerm]);

    // Validation
    const isStep1Valid = testName.trim() !== '';
    const isStep2Valid = selectedQuestions.size > 0;
    const isStep3Valid = testType === 'fixed' || (testType === 'scheduled' && startTime && endTime && (assignedClassIds.size > 0 || assignedStudentIds.size > 0));

    // Handlers
    const handleToggleClass = (classId: string) => {
        const newSelection = new Set(assignedClassIds);
        if (newSelection.has(classId)) newSelection.delete(classId);
        else newSelection.add(classId);
        setAssignedClassIds(newSelection);
    };
    
    const handleToggleStudent = (studentId: string) => {
        const newSelection = new Set(assignedStudentIds);
        if (newSelection.has(studentId)) newSelection.delete(studentId);
        else newSelection.add(studentId);
        setAssignedStudentIds(newSelection);
    };

    const handleSaveChanges = async () => {
        if (!isStep1Valid || !isStep2Valid || !isStep3Valid) return;
        setIsSaving(true);

        const testDetailsPayload: Partial<Omit<Test, 'id' | 'createdAt' | 'assignments' | 'attemptCount' | 'averageScore'>> = {
            name: testName,
            banca: banca, // Include Banca
            questions: Array.from(selectedQuestions.values()),
            test_type: testType,
            course_id: contextCourseId || undefined,
            module_id: contextModuleId || undefined,
            discipline_id: contextDisciplineId || undefined,
        };

        const assignmentDetailsPayload: { startTime: string; endTime: string; classIds: string[]; studentIds: string[]; } | null = testType === 'scheduled' ? {
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            classIds: Array.from(assignedClassIds),
            studentIds: Array.from(assignedStudentIds),
        } : null;

        const success = await testService.updateTestAndAssignments(
            test.id,
            testDetailsPayload,
            assignmentDetailsPayload
        );
        
        setIsSaving(false);
        if (success) {
            alert("Prova atualizada com sucesso!");
            onTestUpdated();
        } else {
            alert("Falha ao atualizar a prova.");
        }
    };
    
    const renderStep1 = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">1. Detalhes da Prova</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Prova</label>
                    <input type="text" value={testName} onChange={e => setTestName(e.target.value)} placeholder="Ex: Prova Mensal de Cardiologia" className="w-full p-2 border rounded-md bg-white text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-primary outline-none"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Banca Examinadora</label>
                    <input type="text" value={banca} onChange={e => setBanca(e.target.value)} placeholder="Ex: FGV, Cebraspe" className="w-full p-2 border rounded-md bg-white text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-primary outline-none"/>
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contexto Acadêmico (Opcional)</label>
                <div className="space-y-2 p-2 border rounded-md bg-gray-50">
                    <select value={contextCourseId || ''} onChange={e => setContextCourseId(e.target.value)} className="w-full p-2 border rounded-md bg-white text-gray-800 disabled:bg-gray-100">
                        <option value="">Selecione o Curso</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={contextModuleId || ''} onChange={e => {setContextModuleId(e.target.value); setContextDisciplineId(null);}} className="w-full p-2 border rounded-md bg-white text-gray-800 disabled:bg-gray-100" disabled={!contextCourseId}>
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
            <h3 className="text-xl font-semibold text-gray-800 mb-4">2. Questões Incluídas ({selectedQuestions.size})</h3>
            <div className="border rounded-lg p-3 h-[50vh] flex flex-col">
                <div className="overflow-y-auto space-y-1 text-sm">
                    <p className="text-xs text-center p-2 bg-yellow-100 text-yellow-800 rounded-md">A edição de questões individuais não é suportada aqui. Para alterar as questões, por favor, crie uma nova prova.</p>
                    {/* FIX: Explicitly type the 'q' parameter to resolve the 'unknown' type error. */}
                    {Array.from(selectedQuestions.values()).map((q: QuizQuestion, i) => (
                        <div key={i} className="flex items-center gap-2 p-1 bg-gray-50 rounded">
                            <span className="font-mono text-xs w-6">{i+1}.</span>
                            <p className="truncate flex-grow">{q.question}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
         <div className="space-y-4">
             <h3 className="text-xl font-semibold text-gray-800">3. Agendamento e Atribuição</h3>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Prova</label>
                <div className="flex gap-2">
                    <button onClick={() => setTestType('fixed')} className={`flex-1 p-3 rounded-lg border ${testType === 'fixed' ? 'bg-primary/10 border-primary' : ''}`}>Fixa (Na Íntegra)</button>
                    <button onClick={() => setTestType('scheduled')} className={`flex-1 p-3 rounded-lg border ${testType === 'scheduled' ? 'bg-primary/10 border-primary' : ''}`}>Simulado (Agendado)</button>
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
                                <div className="relative">
                                    <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                                    <input type="text" value={studentSearchTerm} onChange={e => setStudentSearchTerm(e.target.value)} placeholder="Buscar aluno..." className="w-full pl-7 p-1 border rounded-md mb-1 text-sm bg-white text-gray-800 placeholder:text-gray-400"/>
                                </div>
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
                    <div className="flex items-center gap-3">
                        <EditIcon className="w-6 h-6 text-primary"/>
                        <h2 className="text-2xl font-bold text-gray-800">Editar Prova</h2>
                    </div>
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
                            <button onClick={handleSaveChanges} disabled={!isStep3Valid || isSaving} className="px-6 py-2 font-semibold rounded-lg bg-primary text-white hover:bg-primary-dark disabled:bg-gray-300">
                                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default EditTestModal;
