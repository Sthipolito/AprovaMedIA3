
import React, { useCallback, useState } from 'react';
import { UploadCloudIcon, FileTextIcon } from './IconComponents';

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
        <div className="h-full w-full flex flex-col bg-slate-50 relative overflow-hidden">
            {/* Minimal Header */}
            <div className="absolute top-0 left-0 p-6 z-10 flex items-center gap-2">
                <FileTextIcon className="w-6 h-6 text-gray-800" />
                <span className="text-xl font-bold text-gray-800 tracking-tight">AprovaMed IA</span>
            </div>

            <main className="flex-grow flex flex-col items-center justify-center p-4 relative z-10">
                <div className="w-full max-w-2xl text-center">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
                        Converse com qualquer PDF
                    </h1>
                    <p className="text-lg text-gray-500 mb-10 max-w-lg mx-auto">
                        Junte-se a milhões de estudantes e profissionais. Faça upload de livros, artigos ou manuais e obtenha respostas instantâneas.
                    </p>

                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        className={`relative group w-full bg-white p-12 rounded-2xl shadow-xl transition-all duration-300 border-2 
                            ${isDragging 
                                ? 'border-blue-500 scale-105 shadow-2xl' 
                                : 'border-transparent hover:border-gray-200'}`}
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
                                <>
                                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                                    <p className="text-gray-600 font-medium animate-pulse">Analisando documento...</p>
                                </>
                            ) : (
                                <>
                                    <div className="p-5 bg-gray-100 rounded-full group-hover:bg-blue-50 transition-colors">
                                        <UploadCloudIcon className="w-12 h-12 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xl font-semibold text-gray-700 group-hover:text-gray-900">
                                            Solte o PDF aqui
                                        </p>
                                        <p className="text-sm text-gray-400">
                                            ou clique para navegar no computador
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    
                    {error && (
                        <div className="mt-6 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                            ⚠️ {error}
                        </div>
                    )}
                </div>
            </main>
            
            {/* Background Decoration */}
            <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-gray-100 to-transparent pointer-events-none"></div>
        </div>
    );
};

export default LandingPage;
