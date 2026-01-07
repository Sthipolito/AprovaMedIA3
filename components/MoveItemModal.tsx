import React, { useState, useEffect } from 'react';
import { XIcon, MoveIcon } from './IconComponents';
import { Course, Module, Discipline, QuestionSet } from '../types';

interface MoveItemModalProps {
    itemToMove: QuestionSet;
    structuredData: Course[];
    onClose: () => void;
    onConfirmMove: (itemId: string, newDisciplineId: string) => void;
}

const MoveItemModal: React.FC<MoveItemModalProps> = ({ itemToMove, structuredData, onClose, onConfirmMove }) => {
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [selectedDisciplineId, setSelectedDisciplineId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const modulesInSelectedCourse = structuredData.find(c => c.id === selectedCourseId)?.modules || [];
    const disciplinesInSelectedModule = modulesInSelectedCourse.find(m => m.id === selectedModuleId)?.disciplines || [];

    const handleConfirm = async () => {
        if (!selectedDisciplineId || selectedDisciplineId === itemToMove.disciplineId) {
            alert("Por favor, selecione uma nova disciplina de destino.");
            return;
        }
        setIsSaving(true);
        await onConfirmMove(itemToMove.id, selectedDisciplineId);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Mover Assunto</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <p>Mover <span className="font-bold text-primary">{itemToMove.subjectName}</span> para:</p>
                    <div className="space-y-2 p-3 bg-gray-50 border rounded-md">
                        <select
                            value={selectedCourseId}
                            onChange={(e) => { setSelectedCourseId(e.target.value); setSelectedModuleId(''); setSelectedDisciplineId(''); }}
                            className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                        >
                            <option value="">Selecione um Curso</option>
                            {structuredData.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
                        </select>
                        <select
                            value={selectedModuleId}
                            onChange={(e) => { setSelectedModuleId(e.target.value); setSelectedDisciplineId(''); }}
                            className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                            disabled={!selectedCourseId}
                        >
                            <option value="">Selecione um Módulo</option>
                            {modulesInSelectedCourse.map(module => <option key={module.id} value={module.id}>{module.name}</option>)}
                        </select>
                        <select
                            value={selectedDisciplineId}
                            onChange={(e) => setSelectedDisciplineId(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                            disabled={!selectedModuleId}
                        >
                            <option value="">Selecione uma Disciplina</option>
                            {disciplinesInSelectedModule.map(discipline => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg">
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isSaving || !selectedDisciplineId || selectedDisciplineId === itemToMove.disciplineId}
                        className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark flex items-center gap-2 disabled:bg-gray-400"
                    >
                        <MoveIcon className="w-5 h-5" />
                        {isSaving ? 'Movendo...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MoveItemModal;
