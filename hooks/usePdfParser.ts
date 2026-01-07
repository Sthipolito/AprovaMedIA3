import { useState, useCallback, useEffect } from 'react';

declare global {
    interface Window {
        pdfjsLib: any;
    }
}

export const usePdfParser = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.mjs`;
        }
    }, []);

    const parsePdf = useCallback(async (file: File) => {
        setIsLoading(true);
        setError(null);
        if (!window.pdfjsLib) {
             setError("A biblioteca de processamento de PDF não foi carregada. Por favor, atualize a página.");
             setIsLoading(false);
             return;
        }

        const arrayBuffer = await file.arrayBuffer();
        try {
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                let pageText = textContent.items.map((item: any) => item.str).join(' ');
                
                // Normalização de Ligaduras (Ligatures Fix)
                // Substitui caracteres especiais de tipografia pelas letras normais
                pageText = pageText
                    .replace(/ﬁ/g, 'fi')
                    .replace(/ﬂ/g, 'fl')
                    .replace(/ﬀ/g, 'ff')
                    .replace(/ﬃ/g, 'ffi')
                    .replace(/ﬄ/g, 'ffl');

                fullText += pageText + '\n\n';
            }
            setIsLoading(false);
            return { text: fullText };
        } catch (e) {
            console.error(e);
            setError('Falha ao analisar o arquivo PDF. Por favor, certifique-se de que é um PDF válido.');
            setIsLoading(false);
            return null;
        }
    }, []);

    return { parsePdf, isLoading, error };
};