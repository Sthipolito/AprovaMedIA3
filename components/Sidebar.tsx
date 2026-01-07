
import React, { useState, useRef, useEffect } from 'react';
import { View } from './TeacherApp';
import { PlusCircleIcon, GraduationCapIcon, UsersIcon, ClipboardListIcon, LayersIcon, BookOpenIcon, HomeIcon, FileTextIcon, UserCheckIcon, MoreVerticalIcon, ShoppingBagIcon, TrophyIcon, MessageCircleIcon, PanelLeftClose, PanelLeftOpen, XIcon } from './IconComponents';
import { useUser } from '../contexts/UserContext';
import { UserRole } from '../types';

interface SidebarProps {
    currentView: View;
    setCurrentView: (view: View) => void;
    onLogout: () => void;
    isOpen: boolean;        // Estado Mobile: Aberto/Fechado
    onClose: () => void;    // Função para fechar no Mobile
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, onLogout, isOpen, onClose }) => {
    const { userRole, setUserRole, allStudents } = useUser();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false); // Estado Desktop: Colapsado/Expandido
    const menuRef = useRef<HTMLDivElement>(null);
    
    const navItems = [
        { view: 'dashboard', label: 'Dashboard', icon: HomeIcon },
        { view: 'landing', label: 'Nova Sessão', icon: PlusCircleIcon },
        { view: 'academicManagement', label: 'Gestão Acadêmica', icon: GraduationCapIcon },
        { view: 'studyBank', label: 'Banco de Estudos', icon: BookOpenIcon },
        { view: 'marketplace', label: 'Loja', icon: ShoppingBagIcon },
        { view: 'gamification', label: 'Ranking', icon: TrophyIcon },
        { view: 'studyRooms', label: 'Salas', icon: MessageCircleIcon },
        { view: 'tests', label: 'Provas', icon: ClipboardListIcon },
        { view: 'crm', label: 'CRM', icon: UsersIcon },
        { view: 'officialSummaries', label: 'Resumos', icon: FileTextIcon },
        { view: 'trueFlashcards', label: 'Flashcards', icon: LayersIcon },
    ];
    
    const logoUrl = "https://pub-872633efa2d545638be12ea86363c2ca.r2.dev/WhatsApp%20Image%202025-11-09%20at%2013.47.15%20(1).png";

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleRoleChange = (role: UserRole) => {
        setUserRole(role);
        setIsMenuOpen(false);
    };

    const currentRoleLabel = userRole.role === 'teacher' ? 'Professor' : userRole.studentName;
    const initials = userRole.role === 'teacher' ? 'P' : userRole.studentName.charAt(0);

    // Classes dinâmicas para o container da Sidebar
    // Mobile: fixed inset-0 z-50 ... (Drawer)
    // Desktop: relative h-full transition-all duration-300 ... (Collapsible)
    const sidebarClasses = `
        bg-gray-900 text-white flex flex-col border-r border-gray-800 transition-all duration-300 ease-in-out
        ${isOpen ? 'fixed inset-y-0 left-0 z-50 w-64 shadow-2xl' : 'hidden md:flex'} 
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
    `;

    return (
        <>
            {/* Overlay para Mobile */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            <aside className={sidebarClasses}>
                {/* Header - Maximizado TOTAL para logo gigante */}
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
                     
                     {/* Mobile Close Button */}
                     <button onClick={onClose} className="md:hidden p-1 text-gray-400 hover:text-white absolute top-2 right-2 bg-gray-900/50 rounded-full z-10">
                        <XIcon className="w-6 h-6" />
                     </button>

                     {/* Desktop Collapse Toggle */}
                     <button 
                        onClick={() => setIsCollapsed(!isCollapsed)} 
                        className={`hidden md:block text-gray-500 hover:text-white transition-colors absolute right-2 top-2 z-10`}
                        title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
                    >
                        {isCollapsed ? <PanelLeftOpen className="w-6 h-6 relative top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"/> : <PanelLeftClose className="w-5 h-5"/>}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-grow p-3 overflow-y-auto custom-scrollbar space-y-1">
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive = currentView === item.view || (item.view === 'landing' && currentView === 'chat');
                        
                        return (
                            <button
                                key={item.view}
                                onClick={() => { setCurrentView(item.view as View); onClose(); }} // Fecha drawer no mobile ao clicar
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left font-medium text-sm transition-all duration-200 group relative
                                    ${isActive 
                                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'}
                                    ${isCollapsed ? 'justify-center' : ''}
                                `}
                                title={isCollapsed ? item.label : ''}
                            >
                                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`} />
                                {!isCollapsed && <span className="truncate">{item.label}</span>}
                                
                                {/* Tooltip for Collapsed State */}
                                {isCollapsed && (
                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg border border-gray-700">
                                        {item.label}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Footer: User Profile */}
                <div className="p-3 border-t border-gray-800 mt-auto relative" ref={menuRef}>
                    
                    {/* Popover Menu */}
                    {isMenuOpen && (
                        <div className={`absolute bottom-full mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 w-56 ${isCollapsed ? 'left-14' : 'left-2 right-2'}`}>
                            <div className="p-3 border-b border-gray-100 bg-gray-50">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Perfil</p>
                                <p className="text-sm font-semibold text-gray-800 truncate">{currentRoleLabel}</p>
                            </div>
                            
                            <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                                <button
                                    onClick={() => handleRoleChange({ role: 'teacher' })}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${userRole.role === 'teacher' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    <UserCheckIcon className="w-4 h-4"/> Professor (Admin)
                                </button>
                                
                                {allStudents.length > 0 && (
                                    <div className="mt-2 mb-1 px-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Alunos</p>
                                    </div>
                                )}
                                
                                {allStudents.map(student => (
                                    <button
                                        key={student.id}
                                        onClick={() => handleRoleChange({ role: 'student', studentId: student.id, studentName: student.name })}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-lg truncate transition-colors ${
                                            userRole.role === 'student' && userRole.studentId === student.id 
                                            ? 'bg-primary/10 text-primary font-medium' 
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        {student.name}
                                    </button>
                                ))}
                            </div>

                            <div className="p-2 border-t border-gray-100 bg-gray-50">
                                <button
                                    onClick={onLogout}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    Sair
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Trigger Button */}
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-200 group ${isMenuOpen ? 'bg-gray-800' : 'hover:bg-gray-800'} ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <div className="w-9 h-9 flex-shrink-0 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-gray-800 group-hover:ring-gray-700 transition-all">
                            {initials}
                        </div>
                        {!isCollapsed && (
                            <>
                                <div className="flex-1 text-left min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{currentRoleLabel}</p>
                                    <p className="text-xs text-gray-400 truncate">Opções</p>
                                </div>
                                <MoreVerticalIcon className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                            </>
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
