import React from 'react';
import { MessageSquareIcon } from './IconComponents';

interface FloatingChatButtonProps {
    onClick: () => void;
}

const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-6 right-6 bg-primary text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center transform transition-transform hover:scale-110 z-30"
            aria-label="Abrir Tutor IA"
        >
            <MessageSquareIcon className="w-8 h-8" />
        </button>
    );
};

export default FloatingChatButton;
