import React from 'react';
import { QuizQuestion } from '../types';
import { SparklesIcon, LayersIcon, SaveIcon } from './IconComponents';

interface QuestionBankViewProps {
    questions: QuizQuestion[] | null;
    isExtracting: boolean;
    onExtract: () => void;
    onStudy: () => void;
    onSave: () => void;
    selectedIndices: Set<number>;
    onSelectionChange: (index: number) => void;
    onSelectAll: (checked: boolean) => void;
}

const QuestionBankView: React.FC<QuestionBankViewProps> = ({
    questions,
    isExtracting,
    onExtract,
    onStudy,
    onSave,
    selectedIndices,
    onSelectionChange,
    onSelectAll,
}) => {
    const areAllSelected = questions ? selectedIndices.size === questions.length && questions.length > 0 : false;
    const numSelected = selectedIndices.size;

    return (
        <div className="flex-grow flex flex-col h-full">
            {questions === null && !isExtracting && (
                <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
                    <div className="p-4 bg-primary/10 rounded-full mb-4">
                        <SparklesIcon className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Crie um Banco de Questões de Estudo</h3>
                    <p className="text-gray-600 max-w-sm mb-6">
                        Encontre e extraia automaticamente questões do seu PDF para construir um banco de questões interativo para praticar.
                    </p>
                    <button
                        onClick={onExtract}
                        disabled={isExtracting}
                        className="w-full max-w-xs px-4 py-3 bg-primary text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {isExtracting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Extraindo...</span>
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-5 h-5" />
                                <span>Extrair Questões de Estudo</span>
                            </>
                        )}
                    </button>
                </div>
            )}
            
            {isExtracting && (
                 <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600 font-semibold">Analisando o PDF em busca de questões...</p>
                 </div>
            )}

            {questions && (
                <div className="flex-grow overflow-y-auto p-6">
                     <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Questões Extraídas ({questions.length})</h2>
                        {questions.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={onSave}
                                    disabled={numSelected === 0}
                                    className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-semibold text-sm hover:bg-primary/20 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <SaveIcon className="w-5 h-5"/>
                                    Salvar ({numSelected})
                                </button>
                                <button 
                                    onClick={onStudy}
                                    disabled={numSelected === 0}
                                    className="px-4 py-2 bg-amber-400 text-amber-900 rounded-lg font-semibold text-sm hover:bg-amber-500 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <LayersIcon className="w-5 h-5"/>
                                    Estudar ({numSelected})
                                </button>
                            </div>
                        )}
                    </div>

                    {questions.length > 0 ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 p-2">
                                <input 
                                    type="checkbox"
                                    checked={areAllSelected}
                                    onChange={(e) => onSelectAll(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label className="font-semibold text-gray-600">Selecionar Todas</label>
                            </div>
                            {questions.map((q, index) => (
                                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-start gap-4">
                                     <input 
                                        type="checkbox"
                                        checked={selectedIndices.has(index)}
                                        onChange={() => onSelectionChange(index)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1 flex-shrink-0"
                                    />
                                    <div>
                                        <p className="font-semibold mb-3 text-gray-700">{index + 1}. {q.question}</p>
                                        <ul className="space-y-2 pl-4">
                                            {q.options.map((opt, i) => (
                                                <li key={i} className={`text-sm flex items-center gap-2 ${i === q.correctAnswerIndex ? 'font-bold text-green-700' : 'text-gray-600'}`}>
                                                    {i === q.correctAnswerIndex ? 
                                                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg> 
                                                        : <div className="w-4 h-4 flex-shrink-0"></div>
                                                    }
                                                    <span>{opt}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <h3 className="text-lg font-semibold text-gray-700">Nenhuma Questão Encontrada</h3>
                            <p className="text-gray-500 mt-2">A IA não conseguiu identificar nenhuma questão estruturada neste documento.</p>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default QuestionBankView;