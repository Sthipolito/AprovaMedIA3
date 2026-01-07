import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { XIcon, SaveIcon } from './IconComponents';

interface EditQuestionModalProps {
    question: QuizQuestion;
    onClose: () => void;
    onSave: (updatedQuestion: QuizQuestion) => void;
}

const EditQuestionModal: React.FC<EditQuestionModalProps> = ({ question, onClose, onSave }) => {
    const [editedQuestion, setEditedQuestion] = useState<QuizQuestion>(question);

    useEffect(() => {
        setEditedQuestion(question);
    }, [question]);

    const handleInputChange = (field: keyof QuizQuestion, value: any) => {
        setEditedQuestion(prev => ({ ...prev, [field]: value }));
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...editedQuestion.options];
        newOptions[index] = value;
        handleInputChange('options', newOptions);
    };
    
    const handleCorrectAnswerChange = (index: number) => {
        handleInputChange('correctAnswerIndex', index);
    };

    const handleSubmit = () => {
        onSave(editedQuestion);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Editar Questão</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label htmlFor="question-text" className="block text-sm font-medium text-gray-700 mb-1">Texto da Pergunta</label>
                        <textarea
                            id="question-text"
                            rows={4}
                            value={editedQuestion.question}
                            onChange={(e) => handleInputChange('question', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white text-gray-800 placeholder:text-gray-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Alternativas</label>
                        <div className="space-y-2">
                            {editedQuestion.options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="correctAnswer"
                                        checked={editedQuestion.correctAnswerIndex === index}
                                        onChange={() => handleCorrectAnswerChange(index)}
                                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                                    />
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white text-gray-800 placeholder:text-gray-400"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                     <div>
                        <label htmlFor="media-url" className="block text-sm font-medium text-gray-700 mb-1">URL de Mídia (Imagem/Vídeo - Opcional)</label>
                        <input
                            type="text"
                            id="media-url"
                            value={editedQuestion.mediaUrl || ''}
                            onChange={(e) => handleInputChange('mediaUrl', e.target.value)}
                            placeholder="https://... (link público da Cloudflare, etc.)"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white text-gray-800 placeholder:text-gray-400"
                        />
                    </div>
                     <div>
                        <label htmlFor="explanation-text" className="block text-sm font-medium text-gray-700 mb-1">Explicação (Opcional)</label>
                        <textarea
                            id="explanation-text"
                            rows={3}
                            value={editedQuestion.explanation || ''}
                            onChange={(e) => handleInputChange('explanation', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white text-gray-800 placeholder:text-gray-400"
                        />
                    </div>

                </div>
                <div className="p-4 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center gap-2"
                    >
                        <SaveIcon className="w-5 h-5" />
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditQuestionModal;