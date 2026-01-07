
import React, { useState, useRef, useEffect } from 'react';
import { Course, Module, Discipline, QuestionSet, Class, Student, QuizQuestion } from '../types';
import { LayersIcon, ClipboardListIcon, MoreVerticalIcon, EditIcon, TrashIcon, BarChartIcon, MoveIcon, ImageIcon } from './IconComponents';

type Item = Course | Module | Discipline | QuestionSet | Class | Student;

interface ContentCardProps {
    item: Item;
    type: 'course' | 'module' | 'discipline' | 'question_set' | 'class' | 'student';
    onSelect: () => void;
    onEdit?: (item: Item) => void;
    onDelete?: (id: string) => void;
    onMove?: (item: Item) => void;
    onCreateTest?: (name: string, questions: QuizQuestion[]) => void;
    onDetails?: (item: Item) => void;
}

const ContentCard: React.FC<ContentCardProps> = ({ item, type, onSelect, onEdit, onDelete, onMove, onCreateTest, onDetails }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const isManagementCard = !!(onEdit || onDelete || onMove);
    const imageUrl = 'image_url' in item && item.image_url ? item.image_url : null;
    const name = 'subjectName' in item ? item.subjectName : item.name;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getMetaInfo = () => {
        switch (type) {
            case 'course': return `${(item as Course).modules?.length || 0} Módulos`;
            case 'module': return `${(item as Module).disciplines?.length || 0} Disciplinas`;
            case 'discipline': return `${(item as Discipline).question_sets?.length || 0} Assuntos`;
            case 'question_set': return `${(item as QuestionSet).questions.length} Questões`;
            case 'class': return `${(item as Class).students?.length || 0} Alunos`;
            case 'student': return 'Aluno';
            default: return '';
        }
    };

    const handleAction = (e: React.MouseEvent, action?: (item: Item) => void) => {
        e.stopPropagation();
        setIsMenuOpen(false);
        action?.(item);
    };

    const handleCreateTest = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onCreateTest && 'questions' in item) {
            const defaultName = `${name} - Teste Rápido`;
            if (window.confirm(`Deseja criar um teste com o nome "${defaultName}" contendo estas questões?`)) {
                onCreateTest(defaultName, (item as QuestionSet).questions);
            }
        }
    };

    // Styling based on standard
    const IconPlaceholder = type === 'course' ? ImageIcon : LayersIcon;

    return (
        <div 
            className="group relative bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full cursor-pointer"
            onClick={onSelect}
        >
            {/* Image / Header Area */}
            <div className="h-32 relative overflow-hidden bg-gray-100">
                {imageUrl ? (
                    <img 
                        src={imageUrl} 
                        alt={name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                        <IconPlaceholder className="w-12 h-12 opacity-50" />
                    </div>
                )}
                
                {/* Gradient Overlay for text readability if needed, or subtle shadow */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>

                {/* Badge Type */}
                <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-bold uppercase tracking-wider text-gray-800 shadow-sm">
                    {type.replace('_', ' ')}
                </div>

                {/* Management Menu */}
                {isManagementCard && (
                    <div ref={menuRef} className="absolute top-2 right-2 z-20">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} 
                            className="p-1.5 bg-white/90 hover:bg-white rounded-full text-gray-600 hover:text-primary shadow-sm backdrop-blur-sm transition-colors"
                        >
                            <MoreVerticalIcon className="w-4 h-4" />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-fadeIn">
                                {onEdit && <button onClick={(e) => handleAction(e, onEdit)} className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"><EditIcon className="w-3 h-3"/> Editar</button>}
                                {onDetails && <button onClick={(e) => handleAction(e, onDetails)} className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"><BarChartIcon className="w-3 h-3"/> Detalhes</button>}
                                {onMove && type === 'question_set' && <button onClick={(e) => handleAction(e, onMove)} className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"><MoveIcon className="w-3 h-3"/> Mover</button>}
                                {onDelete && <button onClick={(e) => handleAction(e, () => onDelete(item.id))} className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-50"><TrashIcon className="w-3 h-3"/> Excluir</button>}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="font-bold text-gray-800 text-base mb-1 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                    {name}
                </h3>
                <p className="text-xs text-gray-500 font-medium">{getMetaInfo()}</p>
                
                {/* Optional specific content info */}
                {type === 'question_set' && !isManagementCard && onCreateTest && (
                    <div className="mt-auto pt-4 flex gap-2">
                        <button 
                            onClick={handleCreateTest}
                            className="flex-1 py-2 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                            <ClipboardListIcon className="w-3 h-3"/> Criar Teste
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContentCard;
