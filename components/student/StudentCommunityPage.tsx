
import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import * as gamificationService from '../../services/gamificationService';
import { TrophyIcon, MedalIcon, TrendingUpIcon } from '../IconComponents';

interface StudentCommunityPageProps {
    student: Student;
}

interface LeaderboardEntry {
    id: string;
    name: string;
    image_url?: string;
    xp: number;
    level: number;
    current_streak: number;
}

const StudentCommunityPage: React.FC<StudentCommunityPageProps> = ({ student }) => {
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

    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    if (isLoading) {
        return <div className="h-full flex justify-center items-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
            <header className="p-6 border-b border-gray-200 bg-white text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary/5 to-blue-500/5 z-0"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
                        <TrophyIcon className="w-8 h-8 text-yellow-500" />
                        Ranking Global
                    </h1>
                    <p className="text-gray-500 mt-1">Veja quem está dominando os estudos nesta semana!</p>
                </div>
            </header>

            <main className="flex-grow p-6 max-w-4xl mx-auto w-full">
                
                {/* PODIUM */}
                {top3.length > 0 && (
                    <div className="flex justify-center items-end mb-12 gap-4">
                        {/* 2nd Place */}
                        {top3[1] && (
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full border-4 border-gray-300 overflow-hidden mb-2 relative">
                                    <img src={top3[1].image_url || `https://ui-avatars.com/api/?name=${top3[1].name}&background=random`} alt={top3[1].name} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-0 w-full bg-gray-300 text-gray-700 text-[10px] font-bold text-center">2º</div>
                                </div>
                                <div className="w-24 h-32 bg-gradient-to-t from-gray-300 to-gray-200 rounded-t-lg flex flex-col justify-end items-center p-2 shadow-md relative">
                                    <p className="font-bold text-gray-700 text-sm text-center leading-tight">{top3[1].name}</p>
                                    <p className="text-xs text-gray-500 font-semibold mt-1">{top3[1].xp} XP</p>
                                </div>
                            </div>
                        )}

                        {/* 1st Place */}
                        {top3[0] && (
                            <div className="flex flex-col items-center z-10">
                                <div className="relative mb-2">
                                    <TrophyIcon className="w-8 h-8 text-yellow-400 absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce" />
                                    <div className="w-20 h-20 rounded-full border-4 border-yellow-400 overflow-hidden relative shadow-lg">
                                        <img src={top3[0].image_url || `https://ui-avatars.com/api/?name=${top3[0].name}&background=random`} alt={top3[0].name} className="w-full h-full object-cover" />
                                    </div>
                                </div>
                                <div className="w-28 h-40 bg-gradient-to-t from-yellow-400 to-yellow-300 rounded-t-xl flex flex-col justify-end items-center p-3 shadow-xl relative">
                                    <span className="absolute top-2 text-white font-black text-4xl opacity-50">1</span>
                                    <p className="font-bold text-yellow-900 text-base text-center leading-tight">{top3[0].name}</p>
                                    <p className="text-sm text-yellow-800 font-extrabold mt-1">{top3[0].xp} XP</p>
                                </div>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {top3[2] && (
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full border-4 border-orange-300 overflow-hidden mb-2 relative">
                                    <img src={top3[2].image_url || `https://ui-avatars.com/api/?name=${top3[2].name}&background=random`} alt={top3[2].name} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-0 w-full bg-orange-300 text-orange-800 text-[10px] font-bold text-center">3º</div>
                                </div>
                                <div className="w-24 h-24 bg-gradient-to-t from-orange-300 to-orange-200 rounded-t-lg flex flex-col justify-end items-center p-2 shadow-md relative">
                                    <p className="font-bold text-orange-800 text-sm text-center leading-tight">{top3[2].name}</p>
                                    <p className="text-xs text-orange-700 font-semibold mt-1">{top3[2].xp} XP</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* LIST */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {rest.map((user, index) => (
                        <div 
                            key={user.id} 
                            className={`flex items-center p-4 border-b last:border-b-0 transition-colors ${user.id === student.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-gray-50'}`}
                        >
                            <span className="font-bold text-gray-400 w-8 text-center">{index + 4}</span>
                            
                            <img src={user.image_url || `https://ui-avatars.com/api/?name=${user.name}&background=random`} alt={user.name} className="w-10 h-10 rounded-full object-cover mx-4" />
                            
                            <div className="flex-grow">
                                <p className={`font-semibold ${user.id === student.id ? 'text-primary' : 'text-gray-800'}`}>
                                    {user.name} {user.id === student.id && "(Você)"}
                                </p>
                                <p className="text-xs text-gray-500">Nível {user.level}</p>
                            </div>

                            <div className="flex items-center gap-6 text-right">
                                <div className="hidden sm:block">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Streak</p>
                                    <p className="font-bold text-orange-500 flex items-center gap-1 justify-end"><TrendingUpIcon className="w-3 h-3"/> {user.current_streak}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">XP Total</p>
                                    <p className="font-bold text-primary">{user.xp}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default StudentCommunityPage;
