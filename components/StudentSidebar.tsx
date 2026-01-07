
import React, { useState, useRef, useEffect } from 'react';
import { StudentView } from './StudentApp';
import { HomeIcon, LayersIcon, ClipboardListIcon, UserIcon, BookOpenIcon, FileTextIcon, MoreVerticalIcon, GlobeIcon, TrendingUpIcon, TrophyIcon, ShoppingBagIcon, MessageCircleIcon, PanelLeftClose, PanelLeftOpen } from './IconComponents';
import * as gamificationService from '../services/gamificationService';
import { useUser } from '../contexts/UserContext';

interface StudentSidebarProps {
    studentName: string;
    currentView: StudentView;
    setCurrentView: (view: StudentView) => void;
    onLogout: () => void;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({ studentName, currentView, setCurrentView, onLogout }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false); // Colapso para desktop
    const menuRef = useRef<HTMLDivElement>(null);
    const { userRole } = useUser();
    const [stats, setStats] = useState({ xp: 0, level: 1, current_streak: 0 });

    const navItems = [
        { view: 'dashboard', label: 'Meu Dashboard', icon: HomeIcon },
        { view: 'explore', label: 'Explorar Banco', icon: GlobeIcon },
        { view: 'library', label: 'Minha Biblioteca', icon: BookOpenIcon },
        { view: 'marketplace', label: 'Loja', icon: ShoppingBagIcon }, 
        { view: 'rooms', label: 'Salas de Estudo', icon: MessageCircleIcon }, 
        { view: 'community', label: 'Comunidade', icon: TrophyIcon },
        { view: 'tests', label: 'Meus Testes', icon: ClipboardListIcon },
        { view: 'summaries', label: 'Resumos Oficiais', icon: FileTextIcon },
        { view: 'trueFlashcards', label: 'Flashcards', icon: LayersIcon },
        { view: 'profile', label: 'Meu Perfil', icon: UserIcon },
    ];
    
    const logoUrl = "https://pub-872633efa2d545638be12ea86363c2ca.r2.dev/WhatsApp%20Image%202025-11-09%20at%2013.47.15%20(1).png";

    useEffect(() => {
        if (userRole.role === 'student') {
            const fetchStats = async () => {
                const data = await gamificationService.getStudentGamificationStats(userRole.studentId);
                if (data) setStats(data);
            };
            fetchStats();
        }
    }, [userRole]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const levelProgress = gamificationService.calculateLevelProgress(stats.xp);

    const sidebarWidth = isCollapsed ? 'w-20' : 'w-64';

    return (
        <aside className={`${sidebarWidth} bg-gray-900 text-white flex flex-col flex-shrink-0 h-full border-r border-gray-800 transition-all duration-300 ease-in-out`}>
            {/* Header: Logo & Toggle - Maximizado TOTAL */}
            <div className={`flex items-center border-b border-gray-800 h-48 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                 {!isCollapsed && (
                    <div className="flex-1 h-full w-full flex items-center justify-center overflow-hidden">
                        <img 
                            src={logoUrl} 
                            alt="AprovaMed" 
                            className="w-full h-full object-contain" 
                        />
                    </div>
                 )}
                 
                 {/* Collapse Toggle - Absolute positioning to float over logo if needed, or stick to corner */}
                 <button 
                    onClick={() => setIsCollapsed(!isCollapsed)} 
                    className={`text-gray-500 hover:text-white transition-colors absolute right-2 top-2 z-10`}
                    title={isCollapsed ? "Expandir" : "Recolher"}
                 >
                    {isCollapsed ? <PanelLeftOpen className="w-6 h-6 relative top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"/> : <PanelLeftClose className="w-5 h-5"/>}
                 </button>
            </div>

            {/* Gamification Stats (Compact Mode support) */}
            <div className="px-4 py-4 border-b border-gray-800 bg-gray-800/50">
                {isCollapsed ? (
                    <div className="flex flex-col items-center gap-1" title={`${stats.xp} XP - Nível ${stats.level}`}>
                        <TrophyIcon className="w-5 h-5 text-yellow-500"/>
                        <span className="text-[10px] font-bold text-gray-300">Lvl {stats.level}</span>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-2 text-xs text-gray-400 font-bold uppercase tracking-wider">
                            <span>Nível {stats.level}</span>
                            <span className="text-primary flex items-center gap-1"><TrendingUpIcon className="w-3 h-3"/> {stats.current_streak} dias</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                            <div className="bg-gradient-to-r from-primary to-primary-light h-2 rounded-full transition-all duration-500" style={{ width: `${levelProgress}%` }}></div>
                        </div>
                        <p className="text-[10px] text-right text-gray-500">{stats.xp} XP Total</p>
                    </>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-grow p-3 overflow-y-auto custom-scrollbar space-y-1">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = currentView === item.view;
                    
                    return (
                        <button
                            key={item.view}
                            onClick={() => setCurrentView(item.view as StudentView)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left font-medium text-sm transition-all duration-200 group relative
                                ${isActive 
                                ? 'bg-primary text-white shadow-md shadow-primary/20' 
                                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'}
                                ${isCollapsed ? 'justify-center' : ''}
                            `}
                        >
                            <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`} />
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                            
                            {/* Hover Tooltip for Collapsed State */}
                            {isCollapsed && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg border border-gray-700">
                                    {item.label}
                                </div>
                            )}
                        </button>
                    );
                })}
            </nav>
            
            {/* Footer: User Profile Menu */}
            <div className="mt-auto p-3 border-t border-gray-800 relative" ref={menuRef}>
                 {/* Popover Menu */}
                 {isMenuOpen && (
                    <div className={`absolute bottom-full mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 w-56 ${isCollapsed ? 'left-14' : 'left-2 right-2'}`}>
                        <div className="p-3 border-b border-gray-100 bg-gray-50 text-center">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Aluno Conectado</p>
                            <p className="text-sm font-bold text-gray-800 truncate">{studentName}</p>
                        </div>
                        <div className="p-2">
                            <button
                                onClick={onLogout}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                Sair da Plataforma
                            </button>
                        </div>
                    </div>
                )}

                {/* User Trigger Button */}
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-200 group ${isMenuOpen ? 'bg-gray-800' : 'hover:bg-gray-800'} ${isCollapsed ? 'justify-center' : ''}`}
                >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-gray-800 group-hover:ring-gray-700 transition-all flex-shrink-0">
                        {studentName.charAt(0)}
                    </div>
                    {!isCollapsed && (
                        <>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-sm font-medium text-white truncate">{studentName}</p>
                                <p className="text-xs text-gray-400 truncate">Aluno</p>
                            </div>
                            <MoreVerticalIcon className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
};

export default StudentSidebar;
