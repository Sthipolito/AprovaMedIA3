
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define Deno to avoid typescript errors if types are not loaded
declare const Deno: any;

Deno.serve(async (req: any) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { event, payment } = await req.json()

    // Verifica se é um evento válido de pagamento
    if (!payment || !payment.customer) {
        return new Response(JSON.stringify({ message: 'Ignored: No payment data' }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' } 
        })
    }

    const customerId = payment.customer

    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
        // Liberar acesso
        const { error } = await supabase
            .from('students')
            .update({ subscription_status: 'active' })
            .eq('asaas_customer_id', customerId)
        
        if (error) console.error("Erro ao ativar aluno:", error);
        else console.log(`Acesso liberado para cliente ${customerId}`)

    } else if (event === 'PAYMENT_OVERDUE' || event === 'SUBSCRIPTION_DELETED') {
        // Bloquear acesso
        const { error } = await supabase
            .from('students')
            .update({ subscription_status: 'inactive' })
            .eq('asaas_customer_id', customerId)
        
        if (error) console.error("Erro ao desativar aluno:", error);
        else console.log(`Acesso revogado para cliente ${customerId}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Webhook Error:", error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  }
})