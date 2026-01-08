
import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion, TrueFlashcard } from '../types';

// Helper para obter a instância da IA apenas quando necessário
const getAI = () => {
    let apiKey = '';

    // 1. Tenta obter do Vite (Padrão para Vercel/Frontend moderno)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        apiKey = import.meta.env.VITE_API_KEY || '';
    }

    // 2. Fallback seguro para process.env (Node.js ou builds que polyfillam process)
    // Verifica typeof process antes de acessar para evitar ReferenceError no navegador
    if (!apiKey && typeof process !== 'undefined' && process.env) {
        apiKey = process.env.API_KEY || process.env.VITE_API_KEY || '';
    }

    if (!apiKey) {
        console.error("ERRO CRÍTICO: Nenhuma API Key encontrada. Verifique VITE_API_KEY na Vercel.");
        throw new Error("Chave de API não configurada. Adicione 'VITE_API_KEY' nas variáveis de ambiente.");
    }
    
    return new GoogleGenAI({ apiKey: apiKey });
};

const MODEL_NAME = 'gemini-3-flash-preview';

// Helper to clean JSON string from Markdown formatting
const cleanJson = (text: string): string => {
    if (!text) return "";
    let cleaned = text.trim();
    // Remove markdown code blocks if present
    if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(json)?/, "").replace(/```$/, "");
    }
    return cleaned.trim();
};

const quizQuestionSchema = {
    type: Type.OBJECT,
    properties: {
        question: { type: Type.STRING, description: "O texto completo do enunciado da questão (Caso clínico + Pergunta)." },
        options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Uma lista contendo as opções de resposta (A, B, C, D, E)."
        },
        correctAnswerIndex: { 
            type: Type.INTEGER, 
            description: "O índice (0-4) da resposta correta. OMITA se não encontrar." 
        },
        explanation: {
            type: Type.STRING,
            description: "A explicação detalhada ou comentário do professor associado a esta questão."
        },
        mediaUrl: {
            type: Type.STRING,
            description: "URL de imagem se houver."
        }
    },
    required: ['question', 'options']
};

// --- Helper para converter File em Base64 para o Gemini ---
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


export const answerQuestion = async (pdfText: string, userQuestion: string): Promise<string> => {
    try {
        const ai = getAI();
        const prompt = `Com base estritamente no conteúdo do documento a seguir, responda à pergunta do usuário. Se a informação não estiver no documento, afirme que não consegue encontrar a resposta no texto fornecido.
        
        CONTEÚDO DO DOCUMENTO:
        """
        ${pdfText.substring(0, 50000)}
        """

        PERGUNTA DO USUÁRIO: "${userQuestion}"`;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
        });

        return response.text || "Não consegui gerar uma resposta.";
    } catch (error: any) {
        console.error("Erro ao responder pergunta:", error);
        if (error.message && (error.message.includes("API Key") || error.message.includes("VITE_API_KEY"))) {
            return "Erro de Configuração: Chave de API inválida ou ausente. Verifique o painel da Vercel.";
        }
        return "Desculpe, encontrei um erro ao processar sua solicitação. Verifique sua conexão ou a chave de API.";
    }
};

// --- NOVO: Análise Inicial estilo ChatPDF ---
export const getPDFAnalysis = async (pdfText: string): Promise<{ summary: string; questions: string[] }> => {
    try {
        const ai = getAI();
        // Pega os primeiros 30k caracteres para ter contexto suficiente do início do documento
        const context = pdfText.substring(0, 30000);
        
        const prompt = `
        Você é um assistente de estudo inteligente (estilo ChatPDF).
        Analise o texto do documento fornecido abaixo.
        
        SUA TAREFA:
        1. Crie um resumo de boas-vindas curto, amigável e convidativo (máximo 2 parágrafos curtos) explicando sobre o que é o documento.
        2. Gere 3 perguntas de exemplo muito interessantes e específicas que o usuário poderia fazer sobre este documento para aprender mais.
        
        Retorne APENAS um JSON válido no seguinte formato:
        {
            "summary": "Olá! Este documento trata de...",
            "questions": ["Pergunta 1?", "Pergunta 2?", "Pergunta 3?"]
        }

        TEXTO DO DOCUMENTO:
        """
        ${context}
        """
        `;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        questions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['summary', 'questions']
                }
            }
        });

        const text = response.text || "{}";
        const data = JSON.parse(cleanJson(text));
        
        return {
            summary: data.summary || "Olá! Li seu documento. O que você gostaria de saber?",
            questions: data.questions && data.questions.length > 0 ? data.questions : [
                "Qual é o tema principal?",
                "Quais são os pontos chave?",
                "Crie um resumo para mim."
            ]
        };

    } catch (error) {
        console.error("Erro na análise inicial do PDF:", error);
        return {
            summary: "Olá! Processei seu arquivo. Estou pronto para responder suas perguntas.",
            questions: ["Do que se trata este arquivo?", "Faça um resumo.", "Quais os tópicos principais?"]
        };
    }
};

// Helper function to process a single chunk
const extractQuestionsFromChunk = async (chunkText: string): Promise<QuizQuestion[] | null> => {
    let jsonString = '';
    try {
        const ai = getAI();
        
        const prompt = `Você é um especialista em processamento de provas médicas e concursos. Analise o texto e reconstrua as questões.
        
        TEXTO PARA ANÁLISE:
        """
        ${chunkText}
        """`;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: quizQuestionSchema,
                },
            },
        });

        jsonString = response.text || "";
        if (!jsonString) return [];
        const parsed = JSON.parse(cleanJson(jsonString));
        
        return parsed.map((q: any) => ({
            question: q.question ? q.question.trim() : '',
            options: q.options || [],
            correctAnswerIndex: q.correctAnswerIndex === undefined ? null : q.correctAnswerIndex,
            explanation: q.explanation || '',
            mediaUrl: q.mediaUrl || undefined,
        })).filter((q: QuizQuestion) => q.question.length > 15 && q.options.length >= 2);

    } catch (error: any) {
        console.error("Erro ao extrair questões:", error);
        return [];
    }
};

export const extractQuestionsFromPdf = async (pdfText: string): Promise<QuizQuestion[] | null> => {
    const CHUNK_SIZE = 60000; 
    const CHUNK_OVERLAP = 1000;

    const chunks: string[] = [];
    if (pdfText.length < CHUNK_SIZE) {
        chunks.push(pdfText);
    } else {
        for (let i = 0; i < pdfText.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
            chunks.push(pdfText.substring(i, i + CHUNK_SIZE));
        }
    }
    
    try {
        const allQuestions: QuizQuestion[] = [];
        for (const chunk of chunks) {
            const result = await extractQuestionsFromChunk(chunk);
            if (result) allQuestions.push(...result);
        }
        return Array.from(new Map(allQuestions.map(q => [q.question.trim(), q])).values());
    } catch (error: any) {
        console.error("Erro ao processar chunks de PDF:", error);
        return null;
    }
};

export const generateSummary = async (pdfText: string): Promise<string> => {
    try {
        const ai = getAI();
        const prompt = `Crie um resumo conciso do seguinte documento médico.
        """
        ${pdfText.substring(0, 40000)} 
        """`;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
        });

        return response.text || "Não foi possível gerar o resumo.";
    } catch (error: any) {
        return "Erro ao gerar o resumo.";
    }
};

export const generateSummaryFromQuestions = async (context: string): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Gere um resumo didático conectando estes conceitos:\n${context.substring(0, 30000)}`,
        });
        return response.text || "Erro ao gerar resumo.";
    } catch (error: any) {
        return "Erro ao processar solicitação.";
    }
};

export const extractTrueFlashcards = async (pdfText: string): Promise<TrueFlashcard[]> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Crie flashcards Pergunta/Resposta deste texto médico:\n${pdfText.substring(0, 40000)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING },
                            answer: { type: Type.STRING },
                            tag: { type: Type.STRING },
                            mnemonic: { type: Type.STRING }
                        },
                        required: ['question', 'answer', 'tag']
                    },
                },
            },
        });
        const jsonString = response.text;
        return jsonString ? JSON.parse(cleanJson(jsonString)) : [];
    } catch (error: any) {
        return [];
    }
};

export const refineFlashcardText = async (text: string, type: 'question' | 'answer'): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Melhore este texto de flashcard tornando-o mais conciso:\n${text}`,
        });
        return response.text?.trim() || text;
    } catch { return text; }
};

export const processAnswerKey = async (answerKeyText: string): Promise<{ identifier: string; option: string; explanation?: string }[] | null> => {
    const CHUNK_SIZE = 15000; 
    const chunks: string[] = [];
    for (let i = 0; i < answerKeyText.length; i += CHUNK_SIZE) {
        chunks.push(answerKeyText.substring(i, i + CHUNK_SIZE));
    }

    try {
        const allAnswers: any[] = [];
        const ai = getAI();
        for (const chunk of chunks) {
            const response = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: `Extraia Gabarito e Comentários (JSON):\n${chunk}`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                questionIdentifier: { type: Type.STRING },
                                correctOptionLetter: { type: Type.STRING },
                                explanation: { type: Type.STRING }
                            },
                            required: ['questionIdentifier', 'correctOptionLetter']
                        },
                    },
                },
            });
            const parsed = JSON.parse(cleanJson(response.text || "[]"));
            allAnswers.push(...parsed.map((item: any) => ({
                identifier: item.questionIdentifier?.replace(/[^0-9]/g, '') || '',
                option: item.correctOptionLetter?.trim().toUpperCase() || '',
                explanation: item.explanation || ''
            })));
        }
        return Array.from(new Map(allAnswers.map(item => [item.identifier, item])).values());
    } catch (error) { return null; }
};

export const getAIHint = async (question: string, options: string[]): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Dê uma dica sutil para esta questão sem dizer a resposta:\n${question}`,
        });
        return response.text || "Dica indisponível.";
    } catch { return "Erro ao gerar dica."; }
};

export const generateSimilarQuestion = async (originalQuestion: QuizQuestion): Promise<QuizQuestion | null> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Crie uma questão similar sobre o mesmo tema:\n${JSON.stringify(originalQuestion)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswerIndex: { type: Type.INTEGER },
                        explanation: { type: Type.STRING }
                    },
                    required: ['question', 'options', 'correctAnswerIndex']
                }
            }
        });
        return response.text ? JSON.parse(cleanJson(response.text)) : null;
    } catch { return null; }
};

export const generateStudyInsights = async (analyticsData: any): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Analise estes dados de estudo e dê um diagnóstico curto:\n${JSON.stringify(analyticsData)}`,
        });
        return response.text || "Continue estudando.";
    } catch { return "Erro ao gerar insights."; }
};

export const transcribeImage = async (file: File): Promise<string> => {
    try {
        const ai = getAI();
        const base64Data = await fileToBase64(file);
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [
                { text: "Transcreva o texto desta imagem com precisão médica:" },
                { inlineData: { mimeType: file.type, data: base64Data } }
            ]
        });
        return response.text || "Erro na transcrição.";
    } catch { return "Erro ao processar imagem."; }
};

// Implementação de Batching com Prompt de Alta Qualidade Médica
export const generateExplanationsForQuestions = async (questions: QuizQuestion[]): Promise<QuizQuestion[]> => {
    const ai = getAI();
    const BATCH_SIZE = 5; // Tamanho seguro
    const updatedQuestions = [...questions]; 

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        const chunk = questions.slice(i, i + BATCH_SIZE);
        
        // Formata as questões para o prompt
        const chunkForAI = chunk.map((q, idx) => ({
            id: idx, // ID relativo ao lote (0-4)
            enunciado: q.question,
            alternativas: q.options,
            gabarito_index: q.correctAnswerIndex !== null ? q.correctAnswerIndex : "Desconhecido"
        }));

        try {
            console.log(`Processando lote ${i / BATCH_SIZE + 1} de ${Math.ceil(questions.length / BATCH_SIZE)} (Alta Qualidade)...`);
            
            // PROMPT ENGENHARIA AVANÇADA PARA MEDICINA
            const prompt = `
            Você é um Professor Sênior de Medicina preparando residentes para provas de alto nível (USP, Unifesp, ENARE).
            
            SUA TAREFA:
            Para cada questão médica fornecida abaixo, escreva um COMENTÁRIO DIDÁTICO COMPLETO.
            
            ESTRUTURA OBRIGATÓRIA DO COMENTÁRIO:
            1. Resumo do Raciocínio Clínico: Identifique os sintomas-chave e o diagnóstico provável.
            2. Por que a resposta correta é a correta: Explique a fisiopatologia, diretriz ou critério clínico.
            3. Análise dos Distratores: Explique resumidamente por que as outras alternativas estão incorretas (diagnóstico diferencial).
            
            IMPORTANTE:
            - NÃO apenas repita a resposta. Explique o "PORQUÊ".
            - Use linguagem técnica médica adequada.
            - Se o gabarito for "Desconhecido", deduza a resposta correta com base no conhecimento médico e explique.
            
            QUESTÕES PARA ANALISAR:
            ${JSON.stringify(chunkForAI)}
            `;

            const response = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            explanations: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: { type: Type.INTEGER, description: "O ID relativo enviado no prompt (0, 1, 2...)" },
                                        explanation: { type: Type.STRING, description: "O comentário completo formatado em texto corrido ou markdown simples." }
                                    },
                                    required: ['id', 'explanation']
                                }
                            }
                        },
                        required: ['explanations']
                    },
                },
            });

            const parsedData = JSON.parse(cleanJson(response.text || "{}"));
            const explanations = parsedData.explanations || [];

            // Merge das respostas
            explanations.forEach((item: any) => {
                const globalIndex = i + item.id;
                if (updatedQuestions[globalIndex]) {
                    // Adiciona um prefixo para dar credibilidade visual
                    const enrichedExplanation = item.explanation;
                    updatedQuestions[globalIndex].explanation = enrichedExplanation;
                }
            });

        } catch (e) {
            console.error(`Erro ao processar lote começando em índice ${i}:`, e);
            // Fallback silencioso para não quebrar a UI, mas loga o erro
        }
    }

    return updatedQuestions;
};
