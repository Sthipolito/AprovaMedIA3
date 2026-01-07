import React, { useState } from 'react';
import { QuizQuestion } from '../types';

interface QuizModalProps {
    questions: QuizQuestion[];
    onClose: () => void;
}

const QuizModal: React.FC<QuizModalProps> = ({ questions, onClose }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);

    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    const handleAnswerSelect = (index: number) => {
        if (showResult) return;
        setSelectedAnswer(index);
    };

    const handleSubmit = () => {
        if (selectedAnswer === null) return;

        if (selectedAnswer === currentQuestion.correctAnswerIndex) {
            setScore(score + 1);
        }
        setShowResult(true);
    };

    const handleNext = () => {
        setShowResult(false);
        setSelectedAnswer(null);
        setCurrentQuestionIndex(currentQuestionIndex + 1);
    };
    
    const handleRestart = () => {
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setShowResult(false);
        setScore(0);
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-center text-primary">Quiz Interativo</h2>
                </div>

                <div className="p-8 flex-grow overflow-y-auto">
                    {currentQuestionIndex < questions.length ? (
                        <div>
                            <p className="text-gray-600 mb-2 font-medium">Questão {currentQuestionIndex + 1} de {questions.length}</p>
                            <h3 className="text-xl font-semibold mb-6">{currentQuestion.question}</h3>
                            <div className="space-y-3">
                                {currentQuestion.options.map((option, index) => {
                                    const isCorrect = index === currentQuestion.correctAnswerIndex;
                                    const isSelected = index === selectedAnswer;
                                    let buttonClass = 'w-full text-left p-4 border rounded-lg transition-all duration-200';
                                    
                                    if(showResult) {
                                        if (isCorrect) buttonClass += ' bg-green-100 border-green-400 text-green-800 scale-105';
                                        else if (isSelected) buttonClass += ' bg-red-100 border-red-400 text-red-800';
                                        else buttonClass += ' border-gray-300 opacity-70';
                                    } else {
                                        if(isSelected) buttonClass += ' bg-primary/20 border-primary';
                                        else buttonClass += ' border-gray-300 hover:border-primary/50 hover:bg-primary/5';
                                    }

                                    return (
                                        <button key={index} onClick={() => handleAnswerSelect(index)} className={buttonClass} disabled={showResult}>
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <h3 className="text-3xl font-bold mb-4">Quiz Concluído!</h3>
                            <p className="text-xl text-gray-700">Sua pontuação: <span className="font-bold text-primary">{score}</span> / {questions.length}</p>
                             <button
                                onClick={handleRestart}
                                className="mt-8 px-8 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                            >
                                Reiniciar Quiz
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-between items-center">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 font-semibold hover:bg-gray-200 rounded-lg transition-colors">
                        Fechar
                    </button>
                    {currentQuestionIndex < questions.length && (
                        !showResult ? (
                            <button
                                onClick={handleSubmit}
                                disabled={selectedAnswer === null}
                                className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                Enviar
                            </button>
                        ) : (
                            <button
                                onClick={isLastQuestion ? () => setCurrentQuestionIndex(currentQuestionIndex + 1) : handleNext}
                                className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                            >
                                {isLastQuestion ? 'Finalizar' : 'Próxima Questão'}
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuizModal;
