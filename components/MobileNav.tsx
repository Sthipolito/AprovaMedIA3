import React from 'react';
import { StudentView } from './StudentApp';
import { HomeIcon, GlobeIcon, BookOpenIcon, UserIcon, LayersIcon } from './IconComponents';

interface MobileNavProps {
    currentView: StudentView;
    setCurrentView: (view: StudentView) => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ currentView, setCurrentView }) => {
    const navItems = [
        { view: 'dashboard', label: 'Início', icon: HomeIcon },
        { view: 'explore', label: 'Explorar', icon: GlobeIcon },
        { view: 'library', label: 'Biblioteca', icon: BookOpenIcon },
        { view: 'trueFlashcards', label: 'Cards', icon: LayersIcon },
        { view: 'profile', label: 'Perfil', icon: UserIcon },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden pb-safe">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.view;
                    return (
                        <button
                            key={item.view}
                            onClick={() => setCurrentView(item.view as StudentView)}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                                isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileNav;