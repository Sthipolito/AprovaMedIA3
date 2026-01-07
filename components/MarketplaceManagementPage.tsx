
import React, { useState, useEffect } from 'react';
import { MarketplaceItem, QuestionSet } from '../types';
import * as marketplaceService from '../services/marketplaceService';
import * as questionBankService from '../services/questionBankService';
import { ShoppingBagIcon, PlusCircleIcon, TrashIcon, TagIcon, XIcon } from './IconComponents';

const MarketplaceManagementPage: React.FC = () => {
    const [items, setItems] = useState<MarketplaceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState<number>(0);
    const [category, setCategory] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [selectedContentId, setSelectedContentId] = useState('');
    
    const [availableContent, setAvailableContent] = useState<QuestionSet[]>([]);

    const fetchData = async () => {
        setLoading(true);
        const [marketItems, questionBank] = await Promise.all([
            marketplaceService.getMarketplaceItems(),
            questionBankService.getQuestionBank()
        ]);
        setItems(marketItems);
        setAvailableContent(Object.values(questionBank));
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async () => {
        if (!title || !description || !selectedContentId) return alert("Preencha todos os campos obrigatórios");
        
        const newItem = {
            title,
            description,
            price: Number(price),
            category: category || 'Geral',
            image_url: imageUrl,
            content_id: selectedContentId,
            content_type: 'question_set' as const
        };

        await marketplaceService.addMarketplaceItem(newItem);
        setIsModalOpen(false);
        resetForm();
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Tem certeza que deseja remover este item da loja?")) {
            await marketplaceService.deleteMarketplaceItem(id);
            fetchData();
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setPrice(0);
        setCategory('');
        setImageUrl('');
        setSelectedContentId('');
    };

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
            <header className="p-6 border-b border-gray-200 bg-white flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <ShoppingBagIcon className="w-8 h-8 text-primary" />
                        Gestão da Loja
                    </h1>
                    <p className="text-gray-500 mt-1">Gerencie os produtos disponíveis para os alunos.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark flex items-center gap-2"
                >
                    <PlusCircleIcon className="w-5 h-5" /> Adicionar Produto
                </button>
            </header>

            <main className="flex-grow p-6">
                {loading ? (
                    <div className="flex justify-center items-center h-64"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                ) : items.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {items.map(item => (
                            <div key={item.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col group relative">
                                <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="absolute top-2 right-2 p-2 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 z-10"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                                <div className="h-40 bg-gray-200 relative">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                            <TagIcon className="w-12 h-12 text-gray-300" />
                                        </div>
                                    )}
                                    <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
                                        {item.category}
                                    </div>
                                </div>
                                <div className="p-5 flex-grow flex flex-col">
                                    <h3 className="text-lg font-bold text-gray-800 mb-1">{item.title}</h3>
                                    <p className="text-sm text-gray-500 mb-3">{item.content_type === 'question_set' ? 'Pacote de Questões' : 'Curso'}</p>
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-grow">{item.description}</p>
                                    
                                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                        <span className="font-bold text-lg text-primary">
                                            {item.price > 0 ? `R$ ${item.price.toFixed(2)}` : 'Grátis'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500">
                        <ShoppingBagIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h2 className="text-xl font-semibold">A loja está vazia</h2>
                        <p className="mt-2">Adicione o primeiro produto para os alunos.</p>
                    </div>
                )}
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">Novo Produto</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full"><XIcon className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-md" rows={3} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                                    <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="w-full p-2 border rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                                    <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Cardiologia" className="w-full p-2 border rounded-md" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">URL da Imagem (Capa)</label>
                                <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full p-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo Vinculado (Assunto)</label>
                                <select value={selectedContentId} onChange={e => setSelectedContentId(e.target.value)} className="w-full p-2 border rounded-md">
                                    <option value="">Selecione um Assunto...</option>
                                    {availableContent.map(c => (
                                        <option key={c.id} value={c.id}>{c.subjectName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 font-semibold hover:bg-gray-200 rounded-lg">Cancelar</button>
                            <button onClick={handleCreate} className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark">Salvar Produto</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketplaceManagementPage;
