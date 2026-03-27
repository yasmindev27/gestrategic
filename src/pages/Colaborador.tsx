import { useState, useEffect } from 'react';
import { NavLink } from "react-router-dom";
import PontoColaborador from '@/components/PontoColaborador/PontoColaborador';
import { MobileNav } from '@/components/colaborador/mobile/MobileNav';
import { HomeScreen } from '@/components/colaborador/mobile/HomeScreen';
import { EscalaScreen } from '@/components/colaborador/mobile/EscalaScreen';
import { TrocaPlantaoScreen } from '@/components/colaborador/mobile/TrocaPlantaoScreen';
import { HorasScreen } from '@/components/colaborador/mobile/HorasScreen';
import { RotasScreen } from '@/components/colaborador/mobile/RotasScreen';
import { useUserRole } from '@/hooks/useUserRole';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogOut, Home, Calendar, Users, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ColaboradorModule = () => {
  const { userId, isLoading, role } = useUserRole();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('home');
  const [userType, setUserType] = useState<'colaborador' | 'motorista' | 'admin'>('colaborador');
  const [userName, setUserName] = useState('Colaborador');
  const [userRole, setUserRole] = useState('Enfermeiro - UTI');
  const [pendingHoras, setPendingHoras] = useState(0);
  const [pendingTrocas, setPendingTrocas] = useState(0);

  // Determinar tipo de usuário e carregar nome baseado no role/setor
  useEffect(() => {
    const type = localStorage.getItem('userType') as 'colaborador' | 'motorista' | 'admin' | null;
    if (type) {
      setUserType(type);
    }
    
    // Carregar dados do usuário autenticado
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Tentar carregar dados reais do usuário
        let fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Colaborador';
        
        // Capitalizar o nome corretamente
        fullName = fullName
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        setUserName(fullName);
        
        // Buscar escala e setor do colaborador (data atual)
        const hoje = new Date();
        const { data: escalaData } = await (supabase as any)
          .from('escala')
          .select('setor_descricao, turno')
          .eq('colaborador_nome', fullName)
          .eq('dia', hoje.getDate())
          .eq('mes', hoje.getMonth() + 1)
          .eq('ano', hoje.getFullYear())
          .limit(1);
        
        if (escalaData && escalaData.length > 0) {
          const setor = escalaData[0].setor_descricao || 'Técnico de Enfermagem';
          const role = `${setor}${escalaData[0].turno ? ' (' + escalaData[0].turno + ')' : ''}`;
          setUserRole(role);
        } else {
          // Fallback: tentar do metadata
          if (user.user_metadata?.setor) {
            setUserRole(user.user_metadata.setor);
          } else {
            setUserRole(userType === 'motorista' ? 'Motorista - Transporte' : 'Técnico de Enfermagem');
          }
        }
        
        // Contar horas pendentes de justificativa
        const { data: horasPendentes } = await (supabase as any)
          .from('banco_horas')
          .select('id')
          .eq('funcionario_nome', fullName)
          .eq('status', 'pendente');
        
        setPendingHoras(horasPendentes?.length || 0);
      }
    } catch (error) {
      // Erro ao carregar dados do usuário silenciado
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <>
            <HomeScreen
              userName={userName}
              userRole={userRole}
              pendingActions={{
                horasExtras: pendingHoras,
                trocasPlantao: pendingTrocas,
                escalasAjustar: 0,
              }}
            />
            <div style={{ marginTop: 32 }}>
              <PontoColaborador />
            </div>
          </>
        );
      case 'escalas':
        return <EscalaScreen />;
      case 'plantoes':
        return <TrocaPlantaoScreen />;
      case 'horas':
        return <HorasScreen />;
      case 'rotas':
        return <RotasScreen />;
      default:
        return <HomeScreen
          userName={userName}
          userRole={userRole}
          pendingActions={{
            horasExtras: pendingHoras,
            trocasPlantao: pendingTrocas,
            escalasAjustar: 0,
          }}
        />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Você precisa estar autenticado</p>
          <NavLink to="/auth" className="text-blue-600 hover:underline">
            Clique aqui para fazer login
          </NavLink>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {/* Header - Estilo Principal */}
      <header className="bg-slate-950 text-white sticky top-0 z-40 shadow-md">
        <div className="h-20 flex items-center justify-between px-4 lg:px-8">
          {/* Logo + Texto */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center">
              <img
                src="/assets/logo-gestrategic.jpg"
                alt="GEStrategic"
                className="w-full h-full object-contain rounded"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-white leading-tight">GEStrategic</h1>
              <p className="text-xs text-slate-300">Área do Colaborador</p>
            </div>
          </div>

          {/* User Avatar + Logout */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="Fazer logout"
            >
              <LogOut className="w-5 h-5 text-slate-300" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {role?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Navigation Tabs */}
      <div className="hidden md:flex bg-white border-b border-slate-200 shadow-sm z-30 sticky top-20">
        <div className="w-full flex items-center px-4 lg:px-8 gap-2">
          {(userType === 'motorista'
            ? [
                { id: 'home', label: 'Início', icon: Home },
                { id: 'rotas', label: 'Rotas', icon: MapPin },
                { id: 'escalas', label: 'Escala', icon: Calendar },
                { id: 'horas', label: 'Horas', icon: Clock },
              ]
            : [
                { id: 'home', label: 'Início', icon: Home },
                { id: 'escalas', label: 'Escala', icon: Calendar },
                { id: 'plantoes', label: 'Plantões', icon: Users },
                { id: 'horas', label: 'Horas', icon: Clock },
              ]
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap
                  ${isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 bg-slate-100">
        <div className="w-full">
          {renderContent()}
        </div>
      </ScrollArea>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userType={userType}
      />
    </div>
  );
};

export default ColaboradorModule;
