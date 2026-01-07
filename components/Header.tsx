import React from 'react';
import { BrainCircuitIcon } from './IconComponents';

interface HeaderProps {
    onStartNewSession?: () => void;
    fileName?: string;
}

const Header: React.FC<HeaderProps> = ({ onStartNewSession, fileName }) => {
    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 p-3 flex-shrink-0">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* The main logo is now in the sidebar, so we can remove it from here to avoid duplication */}
                </div>
                {fileName && <p className="text-sm text-gray-500 hidden md:block">{fileName}</p>}
                <div>
                    {onStartNewSession ? (
                        <button 
                            onClick={onStartNewSession}
                            className="px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary-dark transition-colors"
                        >
                            + Enviar Novo PDF
                        </button>
                    ) : null}
                </div>
            </div>
        </header>
    );
};

export default Header;
