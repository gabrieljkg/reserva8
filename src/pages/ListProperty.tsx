import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { CheckCircle, ArrowRight, MapPin, Info, DollarSign, SignalHigh, Camera, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ListProperty = () => {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    description: '',
    price: '',
    signalStrength: '0',
    images: [] as string[]
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    
    if (formData.images.length + files.length > 10) {
      alert('Você pode enviar no máximo 10 fotos.');
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, reader.result as string].slice(0, 10)
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage(null);

    try {
      if (!supabase || !supabase.from) {
        throw new Error('Cliente Supabase não inicializado corretamente.');
      }

      const payload: any = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        price_per_night: parseFloat(formData.price),
        image: formData.images,
        user_id: session?.user?.id || null
      };

      console.log('Enviando dados para Supabase (tabela destinations):', payload);

      let { error, data } = await supabase
        .from('destinations')
        .insert([payload])
        .select();

      if (error) {
        console.error('ERRO TÉCNICO SUPABASE:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        setErrorMessage(error.message);
        throw error;
      }

      console.log('Sucesso ao inserir:', data);
      setStatus('success');
      setFormData({
        title: '',
        location: '',
        description: '',
        price: '',
        signalStrength: '0',
        images: []
      });
    } catch (err: any) {
      console.error('Error listing property:', err);
      setStatus('error');
      if (!errorMessage) {
        setErrorMessage(err.message || 'Erro desconhecido ao conectar com o servidor.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      
      <main className="container mx-auto px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <span className="text-[11px] uppercase tracking-[0.3em] opacity-50 mb-4 block">Parceria</span>
              <h1 className="text-6xl font-serif mb-8 leading-tight">Anuncie seu Santuário</h1>
              <p className="text-ink/60 leading-relaxed mb-12">
                Junte-se à rede mais exclusiva do mundo de refúgios desconectados. Ajudamos os buscadores a encontrar o silêncio que desejam.
              </p>
              
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-full border border-ink/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold">01</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2 uppercase tracking-wider">Verificação</h4>
                    <p className="text-xs opacity-50 leading-relaxed">Cada santuário é auditado via satélite para garantir padrões de conectividade zero.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-full border border-ink/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold">02</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2 uppercase tracking-wider">Curadoria</h4>
                    <p className="text-xs opacity-50 leading-relaxed">Oferecemos fotografia profissional e consultoria em experiências analógicas.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-10 border border-ink/5 shadow-sm">
              {!session ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 bg-ink/5 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="w-8 h-8 opacity-50" />
                  </div>
                  <h2 className="text-2xl font-serif mb-4">Acesso Restrito</h2>
                  <p className="text-sm opacity-60 mb-8">Você precisa ter uma conta e estar logado para anunciar um santuário.</p>
                  <Link 
                    to="/perfil"
                    className="py-4 px-8 bg-ink text-paper text-[10px] uppercase tracking-widest hover:bg-ink/90 transition-colors"
                  >
                    Fazer Login ou Cadastro
                  </Link>
                </div>
              ) : status === 'success' ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center py-12"
                >
                  <div className="w-20 h-20 bg-ink text-paper rounded-full flex items-center justify-center mb-8">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h2 className="text-3xl font-serif mb-4">Sucesso!</h2>
                  <p className="text-sm opacity-60 mb-8">Seu santuário foi enviado para auditoria. Entraremos em contato em breve.</p>
                  <button 
                    onClick={() => setStatus('idle')}
                    className="text-[10px] uppercase tracking-widest border-b border-ink pb-1"
                  >
                    Anunciar outro local
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2 flex items-center gap-2">
                      <Info className="w-3 h-3" /> Nome do Local
                    </label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: The Silent Valley Retreat"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full bg-ink/5 border-none p-4 text-sm focus:ring-1 focus:ring-ink outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2 flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Localização
                    </label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: Patagonia, Chile"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full bg-ink/5 border-none p-4 text-sm focus:ring-1 focus:ring-ink outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2 flex items-center gap-2">
                      <Info className="w-3 h-3" /> Descrição
                    </label>
                    <textarea 
                      required
                      rows={4}
                      placeholder="Descreva a experiência de desconexão..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-ink/5 border-none p-4 text-sm focus:ring-1 focus:ring-ink outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2"><Camera className="w-3 h-3" /> Imagens do Local (Máx 10)</span>
                      <span>{formData.images.length}/10</span>
                    </label>
                    <div className="bg-ink/5 p-4 space-y-4">
                      {formData.images.length > 0 && (
                        <div className="grid grid-cols-5 gap-2">
                          {formData.images.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded overflow-hidden bg-ink/10 group">
                              <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                              <button 
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute inset-0 bg-ink/50 text-paper flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                              >
                                Remover
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {formData.images.length < 10 && (
                        <input 
                          required={formData.images.length === 0}
                          type="file" 
                          accept="image/*"
                          multiple
                          onChange={handleImageChange}
                          className="w-full text-sm outline-none file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-[10px] file:uppercase file:tracking-widest file:font-semibold file:bg-ink file:text-paper hover:file:bg-ink/90 file:cursor-pointer cursor-pointer"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2 flex items-center gap-2">
                        <DollarSign className="w-3 h-3" /> Preço por Noite
                      </label>
                      <input 
                        required
                        type="number" 
                        placeholder="850"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        className="w-full bg-ink/5 border-none p-4 text-sm focus:ring-1 focus:ring-ink outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2 flex items-center gap-2">
                        <SignalHigh className="w-3 h-3" /> Nível de Sinal
                      </label>
                      <select 
                        value={formData.signalStrength}
                        onChange={(e) => setFormData({...formData, signalStrength: e.target.value})}
                        className="w-full bg-ink/5 border-none p-4 text-sm focus:ring-1 focus:ring-ink outline-none appearance-none"
                      >
                        <option value="2">No Wi-Fi</option>
                        <option value="1">No Signal</option>
                        <option value="0">Blackout</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    disabled={status === 'loading'}
                    type="submit"
                    className="w-full py-5 bg-ink text-paper text-[11px] uppercase tracking-[0.3em] hover:bg-ink/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {status === 'loading' ? 'Processando...' : (
                      <>
                        Enviar para Auditoria
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {status === 'error' && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-100">
                      <p className="text-center text-red-600 text-[10px] uppercase tracking-widest">
                        Erro ao enviar
                      </p>
                      <p className="text-center text-red-500 text-[9px] mt-1 font-mono">
                        {errorMessage}
                      </p>
                      {errorMessage?.includes('relation "destinations" does not exist') && (
                        <p className="text-center text-red-400 text-[8px] mt-2 uppercase tracking-tighter">
                          Dica: Verifique se a tabela 'destinations' foi criada no seu painel Supabase.
                        </p>
                      )}
                      {errorMessage?.includes('new row violates row-level security policy') && (
                        <p className="text-center text-red-400 text-[8px] mt-2 uppercase tracking-tighter">
                          Dica: Habilite permissões de INSERT para usuários anônimos na política RLS da tabela 'destinations'.
                        </p>
                      )}
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};
