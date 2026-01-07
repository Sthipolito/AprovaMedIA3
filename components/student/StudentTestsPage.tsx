import React, { useState, useEffect } from 'react';
import { Student, StudentAvailableTest } from '../../types';
import * as testService from '../../services/testService';
import TestSessionModal from '../TestSessionModal';

interface StudentTestsPageProps {
    student: Student;
}

const StudentTestsPage: React.FC<StudentTestsPageProps> = ({ student }) => {
    const [availableTests, setAvailableTests] = useState<StudentAvailableTest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [takingTest, setTakingTest] = useState<StudentAvailableTest | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        const data = await testService.getStudentAvailableTests(student.id);
        setAvailableTests(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [student.id]);
    
    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-64"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
        }
        
        if (availableTests.length === 0) {
            return <div className="text-center py-20"><p className="text-gray-500">Nenhum teste disponível para você no momento.</p></div>;
        }
        
        return (
            <div className="space-y-4">
                {availableTests.map(test => {
                    const isScheduled = test.test_type === 'scheduled';
                    const assignment = isScheduled && test.assignments && test.assignments.length > 0 ? test.assignments[0] : null;
                    
                    let isAvailable = test.test_type === 'fixed';
                    let statusText = 'Disponível para estudo';
                    let statusColor = 'bg-blue-100 text-blue-800';
                    
                    if (isScheduled && assignment) {
                        const now = new Date();
                        const start = new Date(assignment.start_time);
                        const end = new Date(assignment.end_time);
                        isAvailable = now >= start && now <= end;
                        if (now < start) {
                            statusText = `Agendado para ${start.toLocaleDateString()}`;
                            statusColor = 'bg-purple-100 text-purple-800';
                        } else if (now > end) {
                            statusText = 'Encerrado';
                            statusColor = 'bg-gray-100 text-gray-800';
                            isAvailable = false;
                        } else {
                            statusText = 'Em andamento';
                            statusColor = 'bg-yellow-100 text-yellow-800';
                        }
                    }

                    return (
                        <div key={test.id} className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-800">{test.name}</p>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                                        {statusText}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => setTakingTest(test)} 
                                    disabled={!isAvailable}
                                    className="px-4 py-2 bg-primary text-white font-semibold rounded-lg text-sm hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    Fazer Teste
                                </button>
                            </div>
                            {test.attempts.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                    <p className="text-xs font-semibold text-gray-500 mb-1">Suas Tentativas Anteriores:</p>
                                    {test.attempts.map(attempt => (
                                        <div key={attempt.id} className="text-sm flex justify-between items-center py-1">
                                            <span className="text-gray-500">Tentativa em: {new Date(attempt.created_at).toLocaleString()}</span>
                                            <span className={`font-bold ${attempt.score >= 70 ? 'text-green-600' : 'text-red-600'}`}>{attempt.score}%</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
                <header className="p-6 border-b border-gray-200 bg-white">
                    <h1 className="text-3xl font-bold text-gray-800">Meus Testes</h1>
                    <p className="text-gray-500 mt-1">Visualize os testes disponíveis e seu histórico de tentativas.</p>
                </header>
                <main className="flex-grow p-6">
                    {renderContent()}
                </main>
            </div>
            {takingTest && (
                <TestSessionModal
                    studentId={student.id}
                    test={takingTest}
                    onClose={() => {
                        setTakingTest(null);
                        fetchData(); // Refresh data after test is done
                    }}
                />
            )}
        </>
    );
};

export default StudentTestsPage;
