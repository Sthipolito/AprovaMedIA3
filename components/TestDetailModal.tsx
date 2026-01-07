import React, { useState, useEffect } from 'react';
import { TestWithAnalytics } from '../services/testService';
import { StudentTestAttempt } from '../types';
import * as testService from '../services/testService';
import { XIcon, UsersIcon, BarChartIcon, CheckCircleIcon, XCircleIcon, ClipboardListIcon } from './IconComponents';

interface TestDetailModalProps {
    test: TestWithAnalytics;
    onClose: () => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <div className="bg-gray-100 p-4 rounded-lg flex items-center gap-4">
        <div className="p-2 bg-primary/20 rounded-full">
            <Icon className="w-6 h-6 text-primary" />
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const TestDetailModal: React.FC<TestDetailModalProps> = ({ test, onClose }) => {
    const [attempts, setAttempts] = useState<StudentTestAttempt[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAttempts = async () => {
            setIsLoading(true);
            const attemptsData = await testService.getTestAttempts(test.id);
            setAttempts(attemptsData);
            setIsLoading(false);
        };
        fetchAttempts();
    }, [test.id]);

    const highestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : 0;
    const lowestScore = attempts.length > 0 ? Math.min(...attempts.map(a => a.score)) : 0;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl h-[90vh] flex flex-col">
                <header className="p-4 border-b bg-gray-50 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-primary uppercase">Resultados do Teste</p>
                            <h2 className="text-xl font-bold text-gray-800">{test.name}</h2>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
                            <XIcon className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>
                </header>

                <main className="flex-grow p-6 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <StatCard title="Tentativas" value={test.attemptCount} icon={UsersIcon} />
                        <StatCard title="Média Geral" value={`${test.averageScore}%`} icon={BarChartIcon} />
                        <StatCard title="Maior Nota" value={`${highestScore}%`} icon={CheckCircleIcon} />
                        <StatCard title="Menor Nota" value={`${lowestScore}%`} icon={XCircleIcon} />
                    </div>

                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Resultados por Aluno</h3>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : attempts.length > 0 ? (
                        <div className="overflow-x-auto bg-white rounded-lg border">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Nota</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {attempts.map(attempt => (
                                        <tr key={attempt.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{attempt.students?.name || 'Aluno Anônimo'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(attempt.created_at).toLocaleString()}</td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${attempt.score >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                                                {attempt.score}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <ClipboardListIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                            <p className="text-gray-500">Nenhuma tentativa registrada para este teste ainda.</p>
                        </div>
                    )}
                </main>

                <footer className="p-4 bg-gray-50 rounded-b-2xl flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-colors">
                        Fechar
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default TestDetailModal;