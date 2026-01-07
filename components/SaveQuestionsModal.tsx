
import React, { useState, useEffect } from 'react';
import { XIcon } from './IconComponents';
import { Course, Module, Discipline, QuestionSet } from '../types';
import * as academicService from '../services/academicService';
import * as questionBankService from '../services/questionBankService';

interface SaveQuestionsModalProps {
    onClose: () => void;
    onSave: (details: {
        disciplineId: string;
        subjectName: string;
        createTest: boolean;
        testName: string;
        existingSetId?: string; // New: optional existing ID
    }) => void;
}

const SaveQuestionsModal: React.FC<SaveQuestionsModalProps> = ({ onClose, onSave }) => {
    const [mode, setMode] = useState<'new' | 'existing'>('new');
    
    // New Subject State
    const [subjectName, setSubjectName] = useState('');
    
    // Selectors
    const [courses, setCourses] = useState<Course[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [existingSets, setExistingSets] = useState<QuestionSet[]>([]);

    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [selectedDisciplineId, setSelectedDisciplineId] = useState('');
    const [selectedSetId, setSelectedSetId] = useState('');
    
    const [shouldCreateTest, setShouldCreateTest] = useState(false);
    const [testName, setTestName] = useState('');

    const [error, setError] = useState('');
    
    useEffect(() => {
        if (subjectName && mode === 'new') {
            setTestName(subjectName);
        }
    }, [subjectName, mode]);

    useEffect(() => {
        const fetchCourses = async () => {
            setCourses(await academicService.getCourses());
        }
        fetchCourses();
    }, []);

    useEffect(() => {
        const fetchModules = async () => {
            if (selectedCourseId) {
                setModules(await academicService.getModules(selectedCourseId));
                setSelectedModuleId('');
                setDisciplines([]);
                setSelectedDisciplineId('');
            } else {
                setModules([]);
            }
        };
        fetchModules();
    }, [selectedCourseId]);

    useEffect(() => {
        const fetchDisciplines = async () => {
            if (selectedModuleId) {
                setDisciplines(await academicService.getDisciplines(selectedModuleId));
                setSelectedDisciplineId('');
            } else {
                setDisciplines([]);
            }
        };
        fetchDisciplines();
    }, [selectedModuleId]);

    useEffect(() => {
        const fetchSets = async () => {
            if (selectedDisciplineId) {
                const sets = await questionBankService.getQuestionSetsByDiscipline(selectedDisciplineId);
                setExistingSets(sets);
                setSelectedSetId('');
            } else {
                setExistingSets([]);
            }
        }
        if (mode === 'existing') {
            fetchSets();
        }
    }, [selectedDisciplineId, mode]);

    const handleSave = async () => {
        setError('');
        
        if (mode === 'new') {
            if (!selectedDisciplineId || !subjectName.trim()) {
                setError('Por favor, preencha o nome do assunto e selecione uma disciplina.');
                return;
            }
        } else {
            if (!selectedSetId) {
                setError('Por favor, selecione o assunto existente.');
                return;
            }
        }

        if (shouldCreateTest && !testName.trim()) {
            setError('Por favor, forneça um nome para o teste.');
            return;
        }

        if (mode === 'existing') {
            // Logic handled in parent or service wrapper
            // But we need to update the parent callback to handle append
            // For now, we reuse the onSave but maybe pass a flag?
            // Actually, best to call service here if it was simple, but parent holds the questions.
            // Let's pass 'existingSetId' up.
            
            // To be safe, we need the disciplineId of the existing set (we have it in selectedDisciplineId)
            // and the name (we can find it)
            const chosenSet = existingSets.find(s => s.id === selectedSetId);
            onSave({
                disciplineId: selectedDisciplineId,
                subjectName: chosenSet?.subjectName || '',
                createTest: shouldCreateTest,
                testName: testName.trim(),
                existingSetId: selectedSetId
            });
        } else {
            onSave({
                disciplineId: selectedDisciplineId,
                subjectName: subjectName.trim(),
                createTest: shouldCreateTest,
                testName: testName.trim(),
            });
        }
        onClose();
    };

    const renderSelect = (id: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: {id: string, name: string}[], placeholder: string) => (
        <select
            id={id}
            value={value}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-primary focus:outline-none"
        >
            <option value="">{placeholder}</option>
            {options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
        </select>
    );

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Salvar Questões</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    
                    {/* Mode Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setMode('new')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'new' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Novo Assunto
                        </button>
                        <button 
                            onClick={() => setMode('existing')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'existing' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Adicionar a Existente
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vincular a:</label>
                        <div className="space-y-2 p-3 bg-gray-50 border rounded-md">
                             {renderSelect("course-select", selectedCourseId, e => setSelectedCourseId(e.target.value), courses, "Selecione um curso")}
                             {renderSelect("module-select", selectedModuleId, e => setSelectedModuleId(e.target.value), modules, "Selecione um módulo")}
                             {renderSelect("discipline-select", selectedDisciplineId, e => setSelectedDisciplineId(e.target.value), disciplines, "Selecione uma disciplina")}
                        </div>
                    </div>

                    {mode === 'new' ? (
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                                Nome do Novo Assunto
                            </label>
                            <input
                                type="text"
                                id="subject"
                                value={subjectName}
                                onChange={(e) => setSubjectName(e.target.value)}
                                placeholder="Ex: Farmacologia - Prova 2023"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white text-gray-800 placeholder:text-gray-400"
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Assunto Existente</label>
                            <select
                                value={selectedSetId}
                                onChange={(e) => setSelectedSetId(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-primary focus:outline-none"
                                disabled={!selectedDisciplineId}
                            >
                                <option value="">-- Escolha um assunto --</option>
                                {existingSets.map(set => (
                                    <option key={set.id} value={set.id}>{set.subjectName} ({set.questions.length} Qs)</option>
                                ))}
                            </select>
                        </div>
                    )}

                     <div className="p-3 border-t">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={shouldCreateTest}
                                onChange={(e) => setShouldCreateTest(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="font-medium text-gray-700">Também criar um Teste com estas questões</span>
                        </label>
                        {shouldCreateTest && (
                            <div className="mt-3 pl-7">
                                <label htmlFor="testName" className="block text-sm font-medium text-gray-600 mb-1">
                                    Nome do Teste
                                </label>
                                <input
                                    type="text"
                                    id="testName"
                                    value={testName}
                                    onChange={(e) => setTestName(e.target.value)}
                                    placeholder="Ex: Prova Mensal de Farmacologia"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:outline-none bg-white text-gray-800 placeholder:text-gray-400"
                                />
                            </div>
                        )}
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
                <div className="p-4 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveQuestionsModal;
