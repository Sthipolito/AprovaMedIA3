
import React, { useState } from 'react';
import { PlusCircleIcon, SearchIcon, ChevronRightIcon, MoreVerticalIcon, EditIcon, TrashIcon, LayersIcon, ImageIcon } from './IconComponents';

export interface ColumnItem {
    id: string;
    name: string; // or subjectName
    subTitle?: string;
    imageUrl?: string; // New property for cover image
    data?: any; // The original object
}

export interface ColumnDefinition {
    id: string;
    title: string;
    items: ColumnItem[];
    selectedId: string | null;
    onSelect: (item: ColumnItem) => void;
    onAdd?: () => void;
    onEdit?: (item: ColumnItem) => void;
    onDelete?: (id: string) => void;
    renderCustomItem?: (item: ColumnItem) => React.ReactNode;
    emptyMessage?: string;
}

interface ColumnNavigationProps {
    columns: ColumnDefinition[];
}

const Column: React.FC<ColumnDefinition> = ({ 
    title, 
    items, 
    selectedId, 
    onSelect, 
    onAdd, 
    onEdit, 
    onDelete,
    renderCustomItem,
    emptyMessage 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    const filteredItems = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-shrink-0 w-80 border-r border-gray-200 bg-white flex flex-col h-full first:rounded-l-2xl">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 backdrop-blur-sm bg-white/90">
                <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider flex items-center gap-2">
                    {title} 
                    <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-[10px] border border-gray-200">{items.length}</span>
                </h3>
                {onAdd && (
                    <button onClick={onAdd} className="text-primary hover:bg-primary/10 p-1.5 rounded-md transition-colors" title={`Adicionar ${title}`}>
                        <PlusCircleIcon className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-gray-50 bg-white">
                <div className="relative group">
                    <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-primary transition-colors" />
                    <input 
                        type="text" 
                        placeholder={`Buscar...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-transparent bg-gray-50 rounded-md focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none placeholder:text-gray-400"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto p-2 space-y-0.5 custom-scrollbar bg-white">
                {filteredItems.length > 0 ? (
                    filteredItems.map(item => {
                        const isSelected = selectedId === item.id;
                        const isMenuOpen = menuOpenId === item.id;
                        
                        return (
                            <div 
                                key={item.id}
                                onClick={() => onSelect(item)}
                                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all
                                    ${isSelected 
                                        ? 'bg-primary text-white shadow-sm' 
                                        : 'hover:bg-gray-50 text-gray-700'
                                    }`}
                            >
                                <div className="flex-1 min-w-0 flex items-center gap-3">
                                    {renderCustomItem ? (
                                        // Se houver renderCustomItem, injetamos as props de estilo selecionado para ele usar se quiser
                                        // Mas como o renderCustomItem é opaco, apenas renderizamos.
                                        // Para manter consistência visual no "Finder", o ideal é padronizar aqui.
                                        // Vamos ignorar renderCustomItem complexo aqui e usar o padrão para consistência visual
                                        // OU envolver o custom item. Vamos usar a estrutura padrão para garantir o look "Finder".
                                        // Se for questionSet (que usava renderCustom), adaptamos:
                                        <>
                                             {item.imageUrl ? (
                                                <img 
                                                    src={item.imageUrl} 
                                                    alt={item.name} 
                                                    className={`w-8 h-8 rounded-md object-cover flex-shrink-0 border ${isSelected ? 'border-white/30' : 'border-gray-200'}`} 
                                                />
                                            ) : (
                                                <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                    <LayersIcon className="w-4 h-4" />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className={`font-medium truncate text-sm ${isSelected ? 'text-white' : 'text-gray-800'}`}>{item.name}</p>
                                                {item.subTitle && <p className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>{item.subTitle}</p>}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {item.imageUrl ? (
                                                <img 
                                                    src={item.imageUrl} 
                                                    alt={item.name} 
                                                    className={`w-8 h-8 rounded-md object-cover flex-shrink-0 border ${isSelected ? 'border-white/30' : 'border-gray-200'}`} 
                                                />
                                            ) : (
                                                <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                    <ImageIcon className="w-4 h-4" />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className={`font-medium truncate text-sm ${isSelected ? 'text-white' : 'text-gray-800'}`}>{item.name}</p>
                                                {item.subTitle && <p className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>{item.subTitle}</p>}
                                            </div>
                                        </>
                                    )}
                                </div>
                                
                                {isSelected && (
                                    <ChevronRightIcon className="w-4 h-4 text-white flex-shrink-0 ml-2" />
                                )}

                                {/* Management Actions */}
                                {(onEdit || onDelete) && (
                                    <div className={`absolute right-1 top-1/2 -translate-y-1/2 ${isSelected || isMenuOpen ? 'opacity-100 z-40' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                         <div className="relative">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : item.id); }}
                                                className={`p-1.5 rounded-md transition-all ${isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-200 text-gray-500'}`}
                                            >
                                                <MoreVerticalIcon className="w-4 h-4" />
                                            </button>
                                            {isMenuOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); }}></div>
                                                    <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-30 overflow-hidden animate-fadeIn">
                                                        {onEdit && (
                                                            <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onEdit(item); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 text-gray-700 transition-colors">
                                                                <EditIcon className="w-3 h-3" /> Editar
                                                            </button>
                                                        )}
                                                        {onDelete && (
                                                            <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onDelete(item.id); }} className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 flex items-center gap-2 text-red-600 transition-colors border-t border-gray-50">
                                                                <TrashIcon className="w-3 h-3" /> Excluir
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                         <p className="text-xs text-gray-400 font-medium">{emptyMessage || "Vazio"}</p>
                         {onAdd && (
                             <button onClick={onAdd} className="mt-2 text-primary text-xs font-bold hover:underline">
                                 + Criar Novo
                             </button>
                         )}
                    </div>
                )}
            </div>
        </div>
    );
};

const ColumnNavigation: React.FC<ColumnNavigationProps> = ({ columns }) => {
    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex-grow flex flex-nowrap overflow-x-auto bg-white border border-gray-200 rounded-2xl shadow-sm">
                {columns.map(col => (
                    <Column key={col.id} {...col} />
                ))}
                {/* Empty State filler for right side */}
                <div className="flex-grow bg-gray-50 min-w-[200px] border-l border-gray-100 flex items-center justify-center">
                    <div className="text-center opacity-30 pointer-events-none">
                        <LayersIcon className="w-24 h-24 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-400 font-medium">Selecione um item para ver detalhes</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ColumnNavigation;
