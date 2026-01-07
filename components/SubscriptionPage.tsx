
import React, { useState } from 'react';
import { Student } from '../types';
import { CheckCircleIcon, ShieldAlertIcon, CreditCardIcon, DownloadIcon } from './IconComponents';
import { supabase } from '../services/supabaseClient';

interface SubscriptionPageProps {
    student: Student;
    onSuccess: () => void;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ student, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [cpfCnpj, setCpfCnpj] = useState('');
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

    const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 14) value = value.slice(0, 14);
        
        // Máscara CPF/CNPJ
        if (value.length > 11) {
            // CNPJ: 00.000.000/0000-00
            value = value.replace(/^(\d{2})(\d)/, '$1.$2');
            value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
            value = value.replace(/(\d{4})(\d)/, '$1-$2');
        } else {
            // CPF: 000.000.000-00
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        setCpfCnpj(value);
    };

    const handleSubscribe = async () => {
        if (!student.user_id) {
            alert("Erro: ID do usuário não encontrado. Tente fazer login novamente.");
            return;
        }

        const cleanCpf = cpfCnpj.replace(/\D/g, '');
        if (cleanCpf.length < 11) {
            alert("Por favor, digite um CPF ou CNPJ válido para a emissão da nota fiscal.");
            return;
        }

        setLoading(true);
        try {
            console.log("Iniciando checkout para:", student.email);
            
            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: { 
                    userId: student.user_id, 
                    email: student.email, 
                    name: student.name,
                    cpfCnpj: cleanCpf
                }
            });

            if (error) {
                console.error('Erro na Edge Function:', error);
                throw new Error("Falha na comunicação com o servidor de pagamentos. Tente novamente.");
            }

            if (data?.error) {
                 console.error('Erro lógico retornado pela função:', data.error);
                 throw new Error(data.error);
            }

            if (data?.paymentUrl) {
                setPaymentUrl(data.paymentUrl);
                // Tenta abrir em nova aba para evitar erro de X-Frame-Options
                window.open(data.paymentUrl, '_blank');
            } else {
                throw new Error('O servidor não retornou um link de pagamento válido.');
            }
            
        } catch (error: any) {
            console.error("Erro detalhado:", error);
            alert(`Não foi possível iniciar o pagamento: ${error.message || "Verifique sua conexão."}`);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    // Tela de Sucesso/Pagamento Gerado
    if (paymentUrl) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircleIcon className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Fatura Gerada!</h2>
                    <p className="text-gray-500 mb-6">
                        Sua cobrança foi criada com sucesso no Asaas.
                    </p>
                    
                    <div className="space-y-3">
                        <a 
                            href={paymentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors shadow-lg"
                        >
                            Pagar Agora (Abrir Fatura)
                        </a>
                        <button 
                            onClick={() => window.location.reload()}
                            className="block w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Já paguei, liberar acesso
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">
                        Caso a nova aba não tenha aberto, clique no botão "Pagar Agora".
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
                
                {/* Lado Esquerdo: Benefícios */}
                <div className="bg-gray-900 text-white p-8 md:w-1/2 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 to-transparent z-0"></div>
                    <div className="relative z-10">
                        <h1 className="text-3xl font-bold mb-2">AprovaMed IA</h1>
                        <p className="text-gray-400 mb-8">Potencialize sua aprovação com Inteligência Artificial.</p>
                        
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-3">
                                <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" />
                                <span>Mais de 50 mil questões</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" />
                                <span>Provas na Íntegra de grandes instituições</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" />
                                <span>Chat com PDF (Tire dúvidas na hora)</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" />
                                <span>Flashcards com Neuro-Repetição</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" />
                                <span>Tutor IA 24 horas</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" />
                                <span>Download de Resumos</span>
                            </li>
                            <li className="flex items-center gap-3 pt-2 border-t border-gray-700">
                                <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" />
                                <span className="font-medium text-primary-light">Estamos em constante evolução para a sua aprovação</span>
                            </li>
                        </ul>
                    </div>
                    <div className="relative z-10 mt-8">
                        <p className="text-sm text-gray-400 italic">"A melhor decisão da minha preparação."</p>
                        <p className="text-sm font-bold text-white mt-1">- Dr. Rafael, Residente USP</p>
                    </div>
                </div>

                {/* Lado Direito: Checkout */}
                <div className="p-8 md:w-1/2 flex flex-col justify-center">
                    <div className="text-center mb-8">
                        <div className="inline-block p-3 bg-yellow-100 text-yellow-700 rounded-full mb-4">
                            <ShieldAlertIcon className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Assinatura Necessária</h2>
                        <p className="text-gray-500 mt-2">
                            Olá, <span className="font-bold">{student.name}</span>. Para acessar a plataforma, complete seu cadastro.
                        </p>
                    </div>

                    <div className="border-2 border-primary rounded-xl p-6 relative bg-primary/5">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                            Oferta Especial
                        </div>
                        <div className="text-center mb-4">
                            <p className="text-gray-600 font-medium">Plano Mensal</p>
                            <div className="flex items-center justify-center gap-1 mt-2">
                                <span className="text-sm text-gray-500 align-top mt-1">R$</span>
                                <span className="text-4xl font-bold text-gray-900">29,90</span>
                                <span className="text-gray-500 self-end mb-1">/mês</span>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">CPF ou CNPJ (Obrigatório)</label>
                            <input 
                                type="text" 
                                value={cpfCnpj}
                                onChange={handleCpfChange}
                                placeholder="000.000.000-00"
                                className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:outline-none text-gray-800"
                            />
                        </div>

                        <button 
                            onClick={handleSubscribe}
                            disabled={loading}
                            className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:bg-gray-400"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <CreditCardIcon className="w-5 h-5" /> Ir para Pagamento
                                </>
                            )}
                        </button>
                        <p className="text-xs text-center text-gray-400 mt-3 flex items-center justify-center gap-1">
                            <ShieldAlertIcon className="w-3 h-3"/> Pagamento seguro via Asaas (PIX ou Cartão)
                        </p>
                    </div>

                    <button 
                        onClick={handleLogout}
                        className="mt-6 text-sm text-gray-500 hover:text-gray-700 underline text-center"
                    >
                        Entrar com outra conta
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPage;
