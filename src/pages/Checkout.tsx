import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SURVIVAL_KITS } from '../data/mockData';
import { motion } from 'motion/react';
import { ShoppingBag, Trash2, Plus, Minus, CreditCard, QrCode, Receipt, CheckCircle, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';

export const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  
  const bookingData = location.state;
  
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'boleto' | 'pix'>('credit');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<{ qr_code: string, qr_code_base64: string } | null>(null);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    number: '', 
    expiry: '', 
    cvv: '', 
    cpf: '' 
  });

  if (!bookingData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-paper">
        <h2 className="text-2xl font-serif">Nenhuma reserva em andamento</h2>
        <Link to="/" className="text-[10px] uppercase tracking-widest border-b border-ink flex items-center gap-2">
          <ArrowLeft className="w-3 h-3" /> Voltar para a Coleção
        </Link>
      </div>
    );
  }

  const { destination, checkIn, checkOut, total } = bookingData;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg(null);

    // 0. Validate form fields
    if (!formData.name || !formData.email || !formData.phone || !formData.cpf) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios (Nome, Email, Telefone e CPF).');
      setIsProcessing(false);
      return;
    }

    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Double check for conflicts
      const { data: existingBookings, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('destination_id', destination.id)
        .lte('check_in', checkOut)
        .gte('check_out', checkIn);

      if (fetchError && !fetchError.message.includes('does not exist')) {
        throw fetchError;
      }

      if (existingBookings && existingBookings.length > 0) {
        throw new Error('As datas selecionadas acabaram de ser reservadas. Por favor, escolha outro período.');
      }

      // 2. Create Mercado Pago preference (or payment) and booking in backend
      const response = await fetch('/api/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          totalAmount: total,
          paymentMethodId: paymentMethod === 'boleto' ? 'bolbradesco' : paymentMethod,
          payer: {
            name: formData.name,
            email: formData.email,
            cpf: formData.cpf,
          },
          bookingData: {
            user_id: user?.id || null,
            destination_id: destination.id,
            check_in: new Date(checkIn).toISOString(),
            check_out: new Date(checkOut).toISOString(),
            total_price: total,
            guest_phone: formData.phone,
          },
          items: [
            {
              title: `Reserva: ${destination.title}`,
              price: total,
              quantity: 1,
            }
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro detalhado da API de pagamento:', errorData);
        throw new Error(errorData.error || 'Não conseguimos iniciar o processo de pagamento. Por favor, tente novamente.');
      }

      const data = await response.json();
      console.log('Payment/Preference created successfully:', data);
      
      if (paymentMethod === 'pix' || paymentMethod === 'boleto') {
        if (paymentMethod === 'pix') {
          setQrCode({ qr_code: data.qr_code, qr_code_base64: data.qr_code_base64 });
        } else if (paymentMethod === 'boleto') {
          setTicketUrl(data.ticket_url);
        }
        // Do not clear cart here so the UI can render the QR code / Boleto link
      } else {
        if (data.init_point) {
          setPaymentUrl(data.init_point);
          // Try to open in a new tab first (better for iframes)
          const win = window.open(data.init_point, '_blank');
          
          if (!win) {
            // If popup is blocked, try to redirect the current frame
            window.location.href = data.init_point;
          }
          
          clearCart();
        } else {
          throw new Error('Link de pagamento não recebido do servidor.');
        }
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMsg(err.message || 'Ocorreu um erro inesperado. Por favor, tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-paper flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md px-6"
          >
            <div className="w-20 h-20 bg-ink text-paper rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-4xl font-serif mb-4">Reserva Confirmada</h2>
            <p className="text-sm opacity-60 mb-8 leading-relaxed">
              Sua jornada para o silêncio está garantida. As datas de {checkIn} a {checkOut} foram bloqueadas exclusivamente para você.
            </p>
            <Link to="/" className="text-[10px] uppercase tracking-widest border-b border-ink pb-1">
              Retornar à Coleção
            </Link>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      
      <main className="container mx-auto px-6 py-24">
        <h1 className="text-5xl font-serif mb-16">Finalizar Reserva</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2 space-y-12">
            
            {/* Resumo do Santuário */}
            <div className="border-b border-ink/10 pb-12">
              <h2 className="text-[11px] uppercase tracking-[0.3em] opacity-50 mb-8">Santuário Selecionado</h2>
              <div className="flex gap-8">
                <div className="w-32 h-40 overflow-hidden shrink-0">
                  <img src={destination.image} alt={destination.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl mb-2">{destination.title}</h3>
                    <p className="text-xs opacity-50 mb-1">{destination.location}</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-40">
                      {checkIn} até {checkOut}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-serif italic">${destination.price} / noite</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Pagamento */}
            <div>
              <h2 className="text-[11px] uppercase tracking-[0.3em] opacity-50 mb-8">Método de Pagamento</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <button 
                  type="button"
                  disabled={isProcessing || !!qrCode || !!ticketUrl}
                  onClick={() => setPaymentMethod('credit')}
                  className={`p-4 border flex flex-col items-center gap-3 transition-all ${paymentMethod === 'credit' ? 'border-ink bg-ink/5' : 'border-ink/10 hover:border-ink/30'} ${(isProcessing || qrCode || ticketUrl) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="text-[9px] uppercase tracking-widest">Crédito</span>
                </button>
                <button 
                  type="button"
                  disabled={isProcessing || !!qrCode || !!ticketUrl}
                  onClick={() => setPaymentMethod('debit')}
                  className={`p-4 border flex flex-col items-center gap-3 transition-all ${paymentMethod === 'debit' ? 'border-ink bg-ink/5' : 'border-ink/10 hover:border-ink/30'} ${(isProcessing || qrCode || ticketUrl) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="text-[9px] uppercase tracking-widest">Débito</span>
                </button>
                <button 
                  type="button"
                  disabled={isProcessing || !!qrCode || !!ticketUrl}
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-4 border flex flex-col items-center gap-3 transition-all ${paymentMethod === 'pix' ? 'border-ink bg-ink/5' : 'border-ink/10 hover:border-ink/30'} ${(isProcessing || qrCode || ticketUrl) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <QrCode className="w-6 h-6" />
                  <span className="text-[9px] uppercase tracking-widest">Pix</span>
                </button>
                <button 
                  type="button"
                  disabled={isProcessing || !!qrCode || !!ticketUrl}
                  onClick={() => setPaymentMethod('boleto')}
                  className={`p-4 border flex flex-col items-center gap-3 transition-all ${paymentMethod === 'boleto' ? 'border-ink bg-ink/5' : 'border-ink/10 hover:border-ink/30'} ${(isProcessing || qrCode || ticketUrl) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Receipt className="w-6 h-6" />
                  <span className="text-[9px] uppercase tracking-widest">Boleto</span>
                </button>
              </div>

              {isProcessing ? (
                <div className="py-24 text-center space-y-6 border border-ink/10 bg-ink/5">
                  <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-[10px] uppercase tracking-widest opacity-60">Processando seu pagamento...</p>
                </div>
              ) : qrCode || ticketUrl ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-10 border border-ink/10 bg-ink/5 text-center space-y-8">
                  {paymentMethod === 'pix' && qrCode && (
                    <>
                      <h3 className="text-2xl font-serif">Pagamento via Pix</h3>
                      <div className="bg-white p-4 inline-block mx-auto border border-ink/10">
                        <img 
                          src={`data:image/png;base64,${qrCode.qr_code_base64}`} 
                          alt="QR Code Pix" 
                          className="w-64 h-64"
                        />
                      </div>
                      <div className="space-y-4">
                        <p className="text-xs opacity-60">Escaneie o QR Code acima ou copie o código abaixo.</p>
                        <div className="flex gap-2">
                          <input 
                            readOnly 
                            value={qrCode.qr_code} 
                            className="flex-1 bg-white border border-ink/10 p-3 text-[10px] font-mono outline-none"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(qrCode.qr_code);
                              alert('Código copiado!');
                            }}
                            className="bg-ink text-paper px-4 text-[10px] uppercase tracking-widest"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {paymentMethod === 'boleto' && ticketUrl && (
                    <>
                      <h3 className="text-2xl font-serif">Pagamento via Boleto</h3>
                      <div className="w-20 h-20 bg-ink/10 rounded-full flex items-center justify-center mx-auto">
                        <Receipt className="w-10 h-10 opacity-60" />
                      </div>
                      <p className="text-sm opacity-80">Seu boleto foi gerado com sucesso.</p>
                      <a 
                        href={ticketUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block w-full py-4 border border-ink text-[10px] uppercase tracking-widest hover:bg-ink hover:text-paper transition-all"
                      >
                        Visualizar / Imprimir Boleto
                      </a>
                    </>
                  )}

                  <div className="pt-8 mt-8 border-t border-ink/10">
                    <Link 
                      to="/sucesso?status=pending"
                      className="text-[10px] uppercase tracking-widest border-b border-ink pb-1"
                    >
                      Já realizei o pagamento
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-8">
                  {/* Dados do Hóspede */}
                  <div className="space-y-6">
                    <h2 className="text-[11px] uppercase tracking-[0.3em] opacity-50">Informações do Hóspede</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Nome Completo</label>
                        <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-ink/5 border-none p-4 text-sm focus:ring-1 focus:ring-ink outline-none" placeholder="Seu nome completo" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">E-mail</label>
                        <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-ink/5 border-none p-4 text-sm focus:ring-1 focus:ring-ink outline-none" placeholder="seu@email.com" />
                        <p className="text-[8px] opacity-40 mt-1 uppercase tracking-widest">
                          Aviso: Não use o mesmo e-mail da sua conta de vendedor do Mercado Pago.
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Telefone / WhatsApp</label>
                        <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-ink/5 border-none p-4 text-sm focus:ring-1 focus:ring-ink outline-none" placeholder="(00) 00000-0000" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">CPF</label>
                        <input required type="text" maxLength={14} value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} className="w-full bg-ink/5 border-none p-4 text-sm focus:ring-1 focus:ring-ink outline-none" placeholder="000.000.000-00" />
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-ink/10 w-full" />

                  {/* Dados de Pagamento */}
                  <div>
                    <h2 className="text-[11px] uppercase tracking-[0.3em] opacity-50 mb-8">Dados de Pagamento</h2>
                    
                    {(paymentMethod === 'credit' || paymentMethod === 'debit') && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div>
                          <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Nome no Cartão</label>
                          <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-ink/5 border-none p-4 text-sm focus:ring-1 focus:ring-ink outline-none" placeholder="Como impresso no cartão" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Número do Cartão</label>
                          <input required type="text" maxLength={19} value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} className="w-full bg-ink/5 border-none p-4 text-sm focus:ring-1 focus:ring-ink outline-none" placeholder="0000 0000 0000 0000" />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Validade</label>
                            <input required type="text" maxLength={5} value={formData.expiry} onChange={e => setFormData({...formData, expiry: e.target.value})} className="w-full bg-ink/5 border-none p-4 text-sm focus:ring-1 focus:ring-ink outline-none" placeholder="MM/AA" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">CVV</label>
                            <input required type="text" maxLength={4} value={formData.cvv} onChange={e => setFormData({...formData, cvv: e.target.value})} className="w-full bg-ink/5 border-none p-4 text-sm focus:ring-1 focus:ring-ink outline-none" placeholder="123" />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {(paymentMethod === 'pix' || paymentMethod === 'boleto') && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="p-6 bg-ink/5 border border-ink/10 text-center">
                          <p className="text-xs opacity-70">
                            {paymentMethod === 'pix' 
                              ? 'O QR Code do Pix será gerado após a confirmação.' 
                              : 'O Boleto será gerado e enviado para o seu e-mail após a confirmação.'}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-ink text-paper p-10 sticky top-32">
              <h3 className="text-2xl font-serif mb-8 border-b border-paper/10 pb-6">Resumo</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">Estadia no Santuário (80%)</span>
                  <span>${(total * 0.80).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">Taxa Administrativa (20%)</span>
                  <span>${(total * 0.20).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="border-t border-paper/10 pt-6 mb-12">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] uppercase tracking-widest opacity-60">Total</span>
                  <span className="text-4xl font-serif italic">${total.toFixed(2)}</span>
                </div>
              </div>
              
              {qrCode || ticketUrl ? (
                <button 
                  type="button"
                  onClick={() => navigate('/perfil')}
                  className="w-full py-5 bg-paper text-ink text-[11px] uppercase tracking-[0.3em] hover:opacity-90 transition-all mb-6"
                >
                  Ir para Meus Pedidos
                </button>
              ) : (
                <button 
                  type="submit"
                  form="checkout-form"
                  disabled={isProcessing}
                  className="w-full py-5 bg-paper text-ink text-[11px] uppercase tracking-[0.3em] hover:opacity-90 transition-all mb-6 disabled:opacity-50"
                >
                  {isProcessing ? 'Processando...' : 'Concluir Reserva'}
                </button>
              )}

              {paymentUrl && !isProcessing && (
                <div className="mb-6 p-4 bg-white/10 border border-white/20 text-center">
                  <p className="text-[10px] uppercase tracking-widest mb-3 opacity-70">O checkout não abriu?</p>
                  <a 
                    href={paymentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block text-[10px] uppercase tracking-widest border-b border-paper pb-1 hover:opacity-70"
                  >
                    Clique aqui para pagar
                  </a>
                </div>
              )}

              {errorMsg && (
                <p className="text-center text-red-400 text-[10px] uppercase tracking-widest mb-6">
                  {errorMsg}
                </p>
              )}
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-[9px] uppercase tracking-widest opacity-40">
                  <div className="w-1 h-1 rounded-full bg-paper" />
                  Pagamento Analógico Seguro
                </div>
                <div className="flex items-center gap-3 text-[9px] uppercase tracking-widest opacity-40">
                  <div className="w-1 h-1 rounded-full bg-paper" />
                  Confirmação via Satélite
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};
