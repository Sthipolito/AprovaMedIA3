
import React, { useState, useEffect, useRef } from 'react';

interface PdfViewerProps {
    file: File;
}

declare global {
    interface Window {
        pdfjsLib: any;
    }
}

const PdfViewer: React.FC<PdfViewerProps> = ({ file }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [pageNum, setPageNum] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [isRendering, setIsRendering] = useState(false);
    const [pageWidth, setPageWidth] = useState(0);
    
    // New state for Image viewing
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const isImage = file.type.startsWith('image/');

    // Cleanup object URL when file changes or component unmounts
    useEffect(() => {
        if (isImage) {
            const url = URL.createObjectURL(file);
            setImageSrc(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setImageSrc(null);
        }
    }, [file, isImage]);

    // Effect to observe container size changes
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(entries => {
            if (entries[0]) {
                setPageWidth(entries[0].contentRect.width);
            }
        });

        resizeObserver.observe(container);

        return () => resizeObserver.disconnect();
    }, []);

    // Effect to load the PDF document (Only if NOT an image)
    useEffect(() => {
        if (isImage || !file || !window.pdfjsLib) return;

        const loadPdf = async () => {
            setPdfDoc(null);
            setNumPages(0);
            setPageNum(1);
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                setPdfDoc(pdf);
                setNumPages(pdf.numPages);
            } catch (error) {
                console.error("Failed to load PDF", error);
            }
        };

        loadPdf();
    }, [file, isImage]);

    // Effect to render a page when the doc, page number, or width changes
    useEffect(() => {
        if (isImage || !pdfDoc || !canvasRef.current || pageWidth === 0) return;

        let renderTask: any = null;
        let cancelled = false;

        const renderPage = async () => {
            setIsRendering(true);
            try {
                const page = await pdfDoc.getPage(pageNum);
                const canvas = canvasRef.current;
                if (!canvas || cancelled) return;

                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                // Adjust for padding (p-4 -> 1rem * 2 = 32px)
                const availableWidth = pageWidth > 32 ? pageWidth - 32 : pageWidth;
                
                const viewport = page.getViewport({ scale: 1 });
                const scale = availableWidth / viewport.width;
                const scaledViewport = page.getViewport({ scale });

                canvas.height = scaledViewport.height;
                canvas.width = scaledViewport.width;

                renderTask = page.render({
                    canvasContext: ctx,
                    viewport: scaledViewport,
                });
                
                await renderTask.promise;

            } catch (error) {
                if ((error as Error).name !== 'RenderingCancelledException') {
                    console.error('Error rendering page:', error);
                }
            } finally {
                if (!cancelled) {
                    setIsRendering(false);
                }
            }
        };

        renderPage();

        return () => {
            cancelled = true;
            if (renderTask) {
                renderTask.cancel();
            }
        };
    }, [pdfDoc, pageNum, pageWidth, isImage]);

    const goToPrevPage = () => setPageNum(p => Math.max(1, p - 1));
    const goToNextPage = () => setPageNum(p => Math.min(numPages, p + 1));

    // Render Image View
    if (isImage && imageSrc) {
        return (
            <div className="w-full h-full flex flex-col bg-gray-200 border-r border-gray-300 overflow-hidden">
                 <div className="flex-grow overflow-auto p-4 flex justify-center items-start">
                    <img src={imageSrc} alt="Uploaded content" className="max-w-full shadow-lg rounded-lg" />
                 </div>
                 <div className="flex-shrink-0 p-2 bg-gray-800 text-white text-center text-xs">
                    Visualização de Imagem (OCR Ativo)
                 </div>
            </div>
        );
    }

    // Render PDF View
    return (
        <div className="w-full h-full flex flex-col bg-gray-200 border-r border-gray-300">
            <div ref={containerRef} className="flex-grow overflow-y-scroll p-4 flex justify-center items-start">
                {pdfDoc ? (
                    <div className="relative">
                        <canvas
                            ref={canvasRef}
                            className={`shadow-lg transition-opacity duration-200 ${isRendering ? 'opacity-50' : 'opacity-100'}`}
                        />
                        {isRendering && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-200/20">
                                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                         <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                         <p>Carregando documento...</p>
                    </div>
                 )}
            </div>
            {pdfDoc && (
                <div className="flex-shrink-0 flex items-center justify-center gap-4 p-2 bg-gray-800 text-white shadow-inner">
                    <button onClick={goToPrevPage} disabled={pageNum <= 1 || isRendering} className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        Anterior
                    </button>
                    <span className="font-mono text-sm">Página {pageNum} / {numPages}</span>
                    <button onClick={goToNextPage} disabled={pageNum >= numPages || isRendering} className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        Próxima
                    </button>
                </div>
            )}
        </div>
    );
};

export default PdfViewer;
