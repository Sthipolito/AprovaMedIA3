import React, { useState, useEffect } from 'react';
import { XIcon, SaveIcon, UploadCloudIcon, ImageIcon } from './IconComponents';
import * as storageService from '../services/storageService';

type ContentType = 'course' | 'module' | 'discipline' | 'class' | 'student' | 'question_set';

interface EditContentModalProps {
    item: any;
    type: ContentType;
    onClose: () => void;
    onSave: (updates: { name: string; image_url: string; email?: string }) => void;
}

const typeLabels: Record<ContentType, string> = {
    course: "Curso",
    module: "Módulo",
    discipline: "Disciplina",
    class: "Turma",
    student: "Aluno",
    question_set: "Assunto",
};

const EditContentModal: React.FC<EditContentModalProps> = ({ item, type, onClose, onSave }) => {
    const initialName = type === 'question_set' ? item.subjectName : item.name;
    const [name, setName] = useState(initialName);
    const [email, setEmail] = useState(item.email || '');
    const [imageUrl, setImageUrl] = useState(item.image_url || '');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        if (selectedFile) {
            const newObjectUrl = URL.createObjectURL(selectedFile);
            setObjectUrl(newObjectUrl);
            // Cleanup when the component unmounts or the file changes
            return () => URL.revokeObjectURL(newObjectUrl);
        }
    }, [selectedFile]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };
    
    // When user types a URL, clear the file and its object URL
    const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setImageUrl(e.target.value);
        if (selectedFile) {
            setSelectedFile(null);
            setObjectUrl(null);
        }
    };

    const handleSubmit = async () => {
        setIsUploading(true);
        let finalImageUrl = imageUrl;

        if (selectedFile) {
            const uploadedUrl = await storageService.uploadImage(selectedFile);
            if (uploadedUrl) {
                finalImageUrl = uploadedUrl;
            } else {
                alert("Falha no upload da imagem. Por favor, tente novamente.");
                setIsUploading(false);
                return;
            }
        }
        
        onSave({ name, image_url: finalImageUrl, email });
        setIsUploading(false);
    };

    const showImageField = true;
    // Determine which URL to display for the preview
    const displayUrl = objectUrl || imageUrl;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Editar {typeLabels[type]}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><XIcon className="w-5 h-5 text-gray-500" /></button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-primary focus:outline-none" />
                    </div>

                    {type === 'student' && (
                        <div>
                            <label htmlFor="student-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" id="student-email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-primary focus:outline-none" />
                        </div>
                    )}

                    {showImageField && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{type === 'student' ? 'Foto de Perfil' : 'Imagem de Capa'}</label>
                            <div className="flex items-center gap-4">
                                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border">
                                    {displayUrl ? <img src={displayUrl} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-gray-400" />}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <input type="text" value={imageUrl} onChange={handleUrlInputChange} placeholder="Cole uma URL pública aqui" className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-800 focus:ring-2 focus:ring-primary focus:outline-none" />
                                    <label className="w-full flex items-center justify-center gap-2 p-2 border border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                                        <UploadCloudIcon className="w-5 h-5 text-gray-500" />
                                        <span className="text-sm text-gray-600">{selectedFile ? selectedFile.name : 'Ou envie um arquivo'}</span>
                                        <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleFileChange} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
                    <button onClick={handleSubmit} disabled={isUploading} className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center gap-2 disabled:bg-gray-400">
                        <SaveIcon className="w-5 h-5" />
                        {isUploading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditContentModal;