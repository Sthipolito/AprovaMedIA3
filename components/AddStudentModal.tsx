import React, { useState, useEffect } from 'react';
import { XIcon, SaveIcon } from './IconComponents';
import { Course, Class } from '../types';
import * as academicService from '../services/academicService';

interface AddStudentModalProps {
    onClose: () => void;
    onStudentAdded: () => void;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ onClose, onStudentAdded }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        academicService.getCourses().then(setCourses);
    }, []);

    useEffect(() => {
        if (selectedCourseId) {
            academicService.getClasses(selectedCourseId).then(setClasses);
            setSelectedClassId('');
        } else {
            setClasses([]);
        }
    }, [selectedCourseId]);

    const handleSave = async () => {
        setError('');
        if (!name.trim() || !email.trim() || !password.trim() || !selectedClassId) {
            setError('Por favor, preencha todos os campos obrigatórios.');
            return;
        }
        setIsSaving(true);
        try {
            await academicService.addStudent(selectedClassId, name.trim(), email.trim(), password, imageUrl.trim());
            onStudentAdded();
        } catch (err: any) {
            setError(`Falha ao adicionar o aluno: ${err.message}`);
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Adicionar Novo Aluno</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Turma do Aluno</label>
                        <div className="space-y-2 p-3 bg-gray-50 border rounded-md">
                            <select
                                value={selectedCourseId}
                                onChange={(e) => setSelectedCourseId(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                            >
                                <option value="">Selecione um Curso</option>
                                {courses.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                            </select>
                            <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                                disabled={!selectedCourseId}
                            >
                                <option value="">Selecione uma Turma</option>
                                {classes.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="student-name" className="block text-sm font-medium text-gray-700 mb-1">
                            Nome Completo
                        </label>
                        <input
                            type="text"
                            id="student-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: João da Silva"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                     <div>
                        <label htmlFor="student-email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email de Acesso
                        </label>
                        <input
                            type="email"
                            id="student-email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@dominio.com"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                     <div>
                        <label htmlFor="student-password" className="block text-sm font-medium text-gray-700 mb-1">
                            Senha Provisória
                        </label>
                        <input
                            type="password"
                            id="student-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Crie uma senha forte"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                     <div>
                        <label htmlFor="student-image" className="block text-sm font-medium text-gray-700 mb-1">
                            URL da Foto (Opcional)
                        </label>
                        <input
                            type="text"
                            id="student-image"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
                <div className="p-4 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark flex items-center gap-2 disabled:bg-gray-400"
                    >
                        <SaveIcon className="w-5 h-5" />
                        {isSaving ? 'Salvando...' : 'Salvar Aluno'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddStudentModal;