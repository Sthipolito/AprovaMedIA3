
import React, { useState, useEffect } from 'react';
import * as gamificationService from '../services/gamificationService';
import { TrophyIcon, TrendingUpIcon } from './IconComponents';

interface LeaderboardEntry {
    id: string;
    name: string;
    image_url?: string;
    xp: number;
    level: number;
    current_streak: number;
}

const GamificationManagementPage: React.FC = () => {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setIsLoading(true);
            const data = await gamificationService.getGlobalLeaderboard();
            setLeaderboard(data || []);
            setIsLoading(false);
        };
        fetchLeaderboard();
    }, []);

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
            <header className="p-6 border-b border-gray-200 bg-white">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <TrophyIcon className="w-8 h-8 text-yellow-500" />
                    Ranking Global (Gamificação)
                </h1>
                <p className="text-gray-500 mt-1">Acompanhe o engajamento e os líderes da plataforma.</p>
            </header>

            <main className="flex-grow p-6 max-w-5xl mx-auto w-full">
                {isLoading ? (
                     <div className="flex justify-center items-center h-64"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posição</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nível</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Streak</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">XP Total</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {leaderboard.map((user, index) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${index < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                                                    {index + 1}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <img className="h-10 w-10 rounded-full object-cover" src={user.image_url || `https://ui-avatars.com/api/?name=${user.name}&background=random`} alt="" />
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                Nível {user.level}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className="flex items-center gap-1 text-orange-500 font-bold">
                                                    <TrendingUpIcon className="w-4 h-4"/> {user.current_streak} dias
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-primary">
                                                {user.xp} XP
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {leaderboard.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                Nenhum dado de gamificação registrado.
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default GamificationManagementPage;
