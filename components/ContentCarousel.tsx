import React from 'react';
import { Course, Module, Discipline, QuestionSet, Class, Student } from '../types';
import ContentCard from './ContentCard';

type Item = Course | Module | Discipline | QuestionSet | Class | Student;
type ContentType = 'course' | 'module' | 'discipline' | 'question_set' | 'class' | 'student';

interface ContentCarouselProps {
    title: string;
    items: Item[];
    type: ContentType;
    onSelect: (item: any) => void;
    onEdit?: (item: Item) => void;
    onDelete?: (id: string) => void;
    onDetails?: (item: Item) => void;
    onMove?: (item: Item) => void;
}

const ContentCarousel: React.FC<ContentCarouselProps> = ({ title, items, type, onSelect, onEdit, onDelete, onDetails, onMove }) => {
    if (!items || items.length === 0) {
        return (
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
                <p className="text-gray-500 italic">Nenhum item encontrado.</p>
            </div>
        );
    }
    
    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {items.map(item => (
                    <ContentCard 
                        key={item.id}
                        item={item}
                        type={type}
                        onSelect={() => onSelect(item)}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onDetails={onDetails}
                        onMove={onMove}
                    />
                ))}
            </div>
        </div>
    );
};

export default ContentCarousel;
