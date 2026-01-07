import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import * as academicService from '../services/academicService';
import { XIcon, UserIcon } from './IconComponents';

interface SelectStudentModalProps {
    onClose: () => void;
    onStudentSelect: (studentId: string) => void;
}

const SelectStudentModal: React.FC<SelectStudentModalProps> = ({ onClose, onStudentSelect }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async () => {
            setIsLoading(true);
            const studentsData = await academicService.getAllStudentsWithDetails();
            setStudents(studentsData);
            setIsLoading(false);
        };
        fetchStudents();
    }, []);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Selecionar Aluno</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : students.length > 0 ? (
                        <div className="space-y-2">
                            {students.map(student => (
                                <button
                                    key={student.id}
                                    onClick={() => onStudentSelect(student.id)}
                                    className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-primary/10 transition-colors"
                                >
                                    <div className="w-8 h-8 flex-shrink-0 bg-primary/20 rounded-full flex items-center justify-center">
                                        <span className="text-primary font-bold">{student.name.charAt(0)}</span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{student.name}</p>
                                        <p className="text-xs text-gray-500">{student.classes?.name}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <UserIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                            <p className="text-gray-500">Nenhum aluno cadastrado.</p>
                            <p className="text-sm text-gray-400">Vá para a Gestão Acadêmica para adicionar alunos.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SelectStudentModal;
