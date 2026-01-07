
import React, { useState, useEffect } from 'react';
import { Student, MarketplaceItem } from '../../types';
import * as marketplaceService from '../../services/marketplaceService';
import { ShoppingBagIcon, TagIcon, CheckCircleIcon } from '../IconComponents';

interface StudentMarketplacePageProps {
    student: Student;
}

const StudentMarketplacePage: React.FC<StudentMarketplacePageProps> = ({ student }) => {
    const [items, setItems] = useState<MarketplaceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasingId, setPurchasingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            const data = await marketplaceService.getMarketplaceItems();
            setItems(data);
            setLoading(false);
        };
        fetchItems();
    }, []);

    const handlePurchase = async (item: MarketplaceItem) => {
        setPurchasingId(item.id);
        const success = await marketplaceService.purchaseItem(student.id, item.id);
        if (success) {
            alert(`Sucesso! Você adquiriu "${item.title}". O conteúdo foi adicionado à sua biblioteca.`);
        } else {
            alert("Ocorreu um erro ao processar sua aquisição.");
        }
        setPurchasingId(null);
    };

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
            <header className="p-6 border-b border-gray-200 bg-white">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <ShoppingBagIcon className="w-8 h-8 text-primary" />
                    Loja de Conteúdos
                </h1>
                <p className="text-gray-500 mt-1">Adquira materiais premium e pacotes de estudo exclusivos.</p>
            </header>

            <main className="flex-grow p-6">
                {loading ? (
                    <div className="flex justify-center items-center h-64"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                ) : items.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {items.map(item => (
                            <div key={item.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                                <div className="h-40 bg-gray-200 relative">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-blue-500/20">
                                            <TagIcon className="w-12 h-12 text-primary/40" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-gray-700 uppercase">
                                        {item.category}
                                    </div>
                                </div>
                                <div className="p-5 flex-grow flex flex-col">
                                    <h3 className="text-lg font-bold text-gray-800 mb-2">{item.title}</h3>
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{item.description}</p>
                                    
                                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                                        <span className="text-xl font-bold text-primary">
                                            {item.price > 0 ? `R$ ${item.price.toFixed(2)}` : 'Grátis'}
                                        </span>
                                        <button
                                            onClick={() => handlePurchase(item)}
                                            disabled={purchasingId === item.id}
                                            className="px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary-dark transition-colors disabled:bg-gray-300"
                                        >
                                            {purchasingId === item.id ? 'Processando...' : 'Adquirir'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500">
                        <TagIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h2 className="text-xl font-semibold">A loja está vazia no momento</h2>
                        <p className="mt-2">Volte em breve para novos conteúdos premium.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default StudentMarketplacePage;
