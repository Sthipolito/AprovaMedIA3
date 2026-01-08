
import React, { useCallback, useState } from 'react';
import { UploadCloudIcon, FileTextIcon, SparklesIcon, LayersIcon, ClipboardListIcon } from './IconComponents';

interface LandingPageProps {
    onPdfUpload: (file: File) => void;
    isLoading: boolean;
    error: string | null;
}

const LandingPage: React.FC<LandingPageProps> = ({ onPdfUpload, isLoading, error }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onPdfUpload(e.target.files[0]);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
                onPdfUpload(file);
            } else {
                alert("Por favor, envie um arquivo PDF ou Imagem válido.");
            }
        }
    }, [onPdfUpload]);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-30">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
            </div>

            <main className="flex-grow flex flex-col items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-2xl text-center space-y-8 animate-fadeIn">
                    
                    <div className="inline-block p-3 bg-white rounded-2xl shadow-sm border border-gray-100 mb-2">
                        <SparklesIcon className="w-12 h-12 text-primary" />
                    </div>

                    <div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-3">
                            Gerador de Material Didático
                        </h1>
                        <p className="text-lg text-gray-500 max-w-lg mx-auto leading-relaxed">
                            Transforme qualquer PDF em questões, flashcards e resumos automaticamente com IA. 
                            Ideal para professores criarem conteúdo em segundos.
                        </p>
                    </div>

                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        className={`relative group w-full bg-white p-10 rounded-3xl shadow-xl transition-all duration-300 border-2 border-dashed
                            ${isDragging 
                                ? 'border-primary bg-primary/5 scale-105 shadow-2xl' 
                                : 'border-gray-200 hover:border-primary/50 hover:shadow-2xl'}`}
                    >
                        <input
                            type="file"
                            id="file-upload"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            onChange={handleFileChange}
                            accept=".pdf, .png, .jpg, .jpeg"
                            disabled={isLoading}
                        />
                        
                        <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
                            {isLoading ? (
                                <div className="py-8">
                                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
                                    <p className="text-gray-600 font-medium animate-pulse">Lendo e analisando documento...</p>
                                </div>
                            ) : (
                                <>
                                    <div className={`p-4 rounded-full transition-colors ${isDragging ? 'bg-white' : 'bg-gray-50 group-hover:bg-primary/10'}`}>
                                        <UploadCloudIcon className={`w-10 h-10 transition-colors ${isDragging ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xl font-bold text-gray-700 group-hover:text-primary transition-colors">
                                            Solte o PDF aqui
                                        </p>
                                        <p className="text-sm text-gray-400">
                                            ou clique para selecionar
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex justify-center gap-6 text-sm text-gray-400 font-medium flex-wrap">
                        <span className="flex items-center gap-1"><ClipboardListIcon className="w-4 h-4"/> Extração de Questões</span>
                        <span className="flex items-center gap-1"><LayersIcon className="w-4 h-4"/> Criação de Flashcards</span>
                        <span className="flex items-center gap-1"><FileTextIcon className="w-4 h-4"/> Resumos Oficiais</span>
                    </div>

                    {error && (
                        <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-center justify-center gap-2 animate-shake">
                            ⚠️ {error}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default LandingPage;
