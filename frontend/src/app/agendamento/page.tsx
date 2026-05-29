'use client';
import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Clock, Scissors, Phone, User, CheckCircle, ArrowLeft, MessageCircle } from 'lucide-react';

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
}

export default function AgendamentoPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Step
  const [step, setStep] = useState<'services' | 'dados' | 'confirmacao'>('services');

  // Seleção
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Dados do cliente
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState('');

  // Número do WhatsApp do admin (barbeiro) - ALTERE AQUI
  const ADMIN_WHATSAPP = '5511999999999';

  useEffect(() => {
    fetch('http://192.168.1.1:8000/services/')
      .then((res) => res.json())
      .then((data) => {
        setServices(data || []);
        setLoading(false);
      })
      .catch(() => {
        setServices([]);
        setLoading(false);
      });
  }, []);

  // Gera as próximas 14 dias como opções de data
  const gerarDatas = () => {
    const datas: { value: string; label: string }[] = [];
    const hoje = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(hoje);
      d.setDate(d.getDate() + i);
      if (d.getDay() !== 0) {
        const value = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
        datas.push({ value, label });
      }
    }
    return datas;
  };

  // Gera horários disponíveis (08:00 às 18:00)
  const gerarHorarios = () => {
    const horarios: string[] = [];
    for (let h = 8; h <= 17; h++) {
      horarios.push(`${String(h).padStart(2, '0')}:00`);
      if (h < 17) horarios.push(`${String(h).padStart(2, '0')}:30`);
    }
    return horarios;
  };

  const handleSelecionarServico = (svc: Service) => {
    setSelectedService(svc);
    setStep('dados');
  };

  const handleVoltar = () => {
    if (step === 'dados') {
      setStep('services');
    } else if (step === 'confirmacao') {
      setStep('dados');
    }
  };

  const handleContinuarDados = (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim() || !data || !hora) {
      alert('Preencha todos os campos.');
      return;
    }
    setStep('confirmacao');
  };

  const handleConfirmar = async () => {
    if (!selectedService) return;
    setEnviando(true);

    const appointmentDate = new Date(`${data}T${hora}:00`);

    try {
      const res = await fetch('http://192.168.1.1:8000/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: 2, // cliente genérico
          barber_id: 1,   // único barbeiro (admin)
          service_id: selectedService.id,
          appointment_date: appointmentDate.toISOString(),
          notes: `Cliente: ${nome} - Tel: ${telefone}`,
        }),
      });

      if (res.ok) {
        // Gera link do WhatsApp
        const dataFormatada = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR');
        const mensagem = `🪒 *Novo Agendamento!*\n\n👤 *Cliente:* ${nome}\n📞 *Tel:* ${telefone}\n✂️ *Serviço:* ${selectedService.name}\n💰 *Valor:* R$ ${selectedService.price.toFixed(2)}\n📅 *Data:* ${dataFormatada}\n⏰ *Horário:* ${hora}\n\n✅ Aguardando aprovação no painel!`;
        const link = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
        setWhatsappLink(link);
        setSucesso(true);
      } else {
        const err = await res.json();
        alert(err.detail || 'Erro ao agendar.');
      }
    } catch {
      alert('Erro de conexão com o servidor.');
    } finally {
      setEnviando(false);
    }
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Agendamento Enviado!</h1>
            <p className="text-zinc-400 text-sm mt-2">Seu horário foi registrado e enviado para aprovação.</p>
          </div>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98]"
          >
            <MessageCircle size={20} />
            Falar com o Barbeiro
          </a>

          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-zinc-800 text-zinc-300 rounded-xl text-sm border border-zinc-700 hover:bg-zinc-700 transition"
          >
            Voltar para Home
          </button>

          <p className="text-zinc-600 text-xs">O barbeiro foi notificado sobre seu agendamento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black border-b border-white/[0.06] h-16 flex items-center px-5 sticky top-0 z-40">
        <div className="flex items-center gap-3 w-full">
          <button onClick={() => step === 'services' ? router.push('/') : handleVoltar()} className="text-zinc-400 hover:text-white transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-sm font-bold">Agendar Horário</h1>
            <p className="text-[10px] text-zinc-500">
              {step === 'services' && 'Escolha um serviço'}
              {step === 'dados' && 'Seus dados'}
              {step === 'confirmacao' && 'Confirme o agendamento'}
            </p>
          </div>
          {/* Steps indicator */}
          <div className="ml-auto flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${step === 'services' ? 'bg-blue-500' : 'bg-zinc-700'}`} />
            <span className={`w-2 h-2 rounded-full ${step === 'dados' ? 'bg-blue-500' : 'bg-zinc-700'}`} />
            <span className={`w-2 h-2 rounded-full ${step === 'confirmacao' ? 'bg-blue-500' : 'bg-zinc-700'}`} />
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <div className="p-5 space-y-4">

        {/* PASSO 1: LISTA DE SERVIÇOS */}
        {step === 'services' && (
          <>
            <p className="text-xs text-zinc-500">Selecione o serviço desejado:</p>

            {loading ? (
              <div className="text-center py-10">
                <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-blue-500 animate-spin mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">Carregando serviços...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-sm">
                Nenhum serviço disponível no momento.
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => handleSelecionarServico(svc)}
                    className="w-full text-left bg-zinc-900/50 border border-zinc-800 hover:border-blue-500/40 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Scissors size={15} className="text-blue-400" />
                          <h3 className="font-bold text-sm">{svc.name}</h3>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">{svc.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-zinc-600 flex items-center gap-1">
                            <Clock size={11} />
                            {svc.duration_minutes}min
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-green-500">R$ {svc.price.toFixed(2)}</p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">a partir de</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* PASSO 2: DADOS DO CLIENTE */}
        {step === 'dados' && selectedService && (
          <form onSubmit={handleContinuarDados} className="space-y-4">
            {/* Resumo do serviço selecionado */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors size={15} className="text-blue-400" />
                  <span className="font-semibold text-sm">{selectedService.name}</span>
                </div>
                <span className="text-green-500 font-bold">R$ {selectedService.price.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <User size={12} /> Seu Nome
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite seu nome"
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <Phone size={12} /> WhatsApp
              </label>
              <input
                type="tel"
                required
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(41) 99999-0000"
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <CalendarDays size={12} /> Data
                </label>
                <select
                  required
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition"
                >
                  <option value="">Selecione</option>
                  {gerarDatas().map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <Clock size={12} /> Horário
                </label>
                <select
                  required
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition"
                >
                  <option value="">Selecione</option>
                  {gerarHorarios().map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors mt-2 active:scale-[0.99]"
            >
              Continuar
            </button>
          </form>
        )}

        {/* PASSO 3: CONFIRMAÇÃO */}
        {step === 'confirmacao' && selectedService && (
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-center">Confirme seu Agendamento</h2>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Serviço:</span>
                  <span className="font-medium">{selectedService.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Valor:</span>
                  <span className="font-bold text-green-500">R$ {selectedService.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Cliente:</span>
                  <span className="font-medium">{nome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Telefone:</span>
                  <span className="font-medium">{telefone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Data:</span>
                  <span className="font-medium">{new Date(data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Horário:</span>
                  <span className="font-medium">{hora}</span>
                </div>
              </div>

              <hr className="border-zinc-800" />

              <p className="text-xs text-zinc-500 text-center">
                Ao confirmar, seu agendamento será enviado para aprovação do administrador.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleVoltar}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 py-3 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={enviando}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60"
              >
                {enviando ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
