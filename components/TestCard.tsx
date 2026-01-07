
import React, { useState, useRef, useEffect } from 'react';
import { TestWithAnalytics } from '../services/testService';
import { CalendarIcon, ClockIcon, MoreVerticalIcon, EditIcon, TrashIcon, ClipboardListIcon, CheckCircleIcon, PlayCircleIcon } from './IconComponents';

interface TestCardProps {
    test: TestWithAnalytics & { moduleName?: string; disciplineName?: string; };
    onResultsClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const Stat: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="flex flex-col items-center justify-center">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-lg font-bold text-gray-800">{value}</span>
    </div>
);

const TestCard: React.FC<TestCardProps> = ({ test, onResultsClick, onEdit, onDelete }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isScheduled = test.test_type === 'scheduled' && test.assignments && test.assignments.length > 0;
    const assignment = isScheduled ? test.assignments![0] : null;

    const getStatusConfig = () => {
        if (!isScheduled || !assignment) return { text: 'Disponível', bg: 'bg-green-100', textCol: 'text-green-700', icon: CheckCircleIcon };

        const now = new Date();
        const start = new Date(assignment.start_time);
        const end = new Date(assignment.end_time);

        if (now < start) return { text: 'Agendado', bg: 'bg-blue-100', textCol: 'text-blue-700', icon: CalendarIcon };
        if (now > end) return { text: 'Encerrado', bg: 'bg-gray-100', textCol: 'text-gray-600', icon: ClockIcon };
        return { text: 'Em Andamento', bg: 'bg-amber-100', textCol: 'text-amber-700', icon: PlayCircleIcon };
    };

    const status = getStatusConfig();
    const StatusIcon = status.icon;

    return (
        <div className="group relative bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full overflow-hidden">
            
            {/* Header Section */}
            <div className="p-5 flex-grow">
                <div className="flex justify-between items-start mb-3">
                    {/* Icon Box */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-teal-100 flex items-center justify-center text-primary shadow-inner">
                        <ClipboardListIcon className="w-6 h-6" />
                    </div>
                    
                    {/* Context Menu */}
                    <div className="relative z-20" ref={menuRef}>
                         <button 
                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} 
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        >
                            <MoreVerticalIcon className="w-5 h-5" />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-fadeIn">
                                <button onClick={(e) => { e.stopPropagation(); onEdit(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors">
                                    <EditIcon className="w-4 h-4" /> Editar
                                </button>
                                <div className="h-px bg-gray-100 my-0"></div>
                                <button onClick={(e) => { e.stopPropagation(); onDelete(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors">
                                    <TrashIcon className="w-4 h-4" /> Excluir
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Title & Context */}
                <div className="pr-12"> {/* Padding right to prevent overlapping with absolute badges from parent */}
                    {(test.moduleName || test.disciplineName) && (
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 truncate">
                            {test.moduleName} {test.moduleName && test.disciplineName && '/'} {test.disciplineName}
                        </div>
                    )}
                    <h3 className="text-lg font-bold text-gray-800 leading-snug mb-2 line-clamp-2" title={test.name}>
                        {test.name}
                    </h3>
                </div>

                {/* Status Badge */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${status.bg} ${status.textCol} mt-2`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {status.text}
                </div>

                {isScheduled && assignment && (
                    <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1.5">
                        <div className="flex justify-between">
                            <span>Início:</span>
                            <span className="font-medium text-gray-700">{new Date(assignment.start_time).toLocaleDateString()} {new Date(assignment.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Fim:</span>
                            <span className="font-medium text-gray-700">{new Date(assignment.end_time).toLocaleDateString()} {new Date(assignment.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Footer */}
            <div className="bg-gray-50 p-4 border-t border-gray-100 grid grid-cols-2 divide-x divide-gray-200">
                <Stat label="Tentativas" value={test.attemptCount} />
                <Stat label="Média Geral" value={`${test.averageScore}%`} />
            </div>

            {/* Action Button Overlay (Optional hover effect or bottom button) */}
            <div className="p-3 bg-white border-t border-gray-100">
                <button 
                    onClick={onResultsClick}
                    className="w-full py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 hover:border-gray-300 hover:text-primary transition-all shadow-sm flex items-center justify-center gap-2"
                >
                    Ver Detalhes
                </button>
            </div>
        </div>
    );
};

export default TestCard;
