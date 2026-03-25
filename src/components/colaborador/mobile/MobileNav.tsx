import { Calendar, Clock, Users, MapPin, Home } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userType?: 'colaborador' | 'motorista' | 'admin';
}

export const MobileNav = ({ activeTab, onTabChange, userType = 'colaborador' }: MobileNavProps) => {
  const tabs = userType === 'motorista' 
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
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 md:hidden shadow-2xl">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex flex-col items-center justify-center w-full h-full gap-1 text-xs font-medium transition-all
                ${activeTab === tab.id
                  ? 'text-primary bg-primary/10 border-t-2 border-primary'
                  : 'text-slate-600 hover:bg-slate-50'
              }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
