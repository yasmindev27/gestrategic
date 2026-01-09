import { 
  LayoutDashboard, 
  ClipboardList, 
  FileText, 
  Users, 
  Settings, 
  HelpCircle,
  Activity
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: ClipboardList, label: "Tarefas", active: false },
  { icon: FileText, label: "Documentos", active: false },
  { icon: ClipboardList, label: "Formulários", active: false },
  { icon: Users, label: "Equipe", active: false },
  { icon: Activity, label: "Relatórios", active: false },
];

const bottomItems = [
  { icon: Settings, label: "Configurações" },
  { icon: HelpCircle, label: "Ajuda" },
];

const Sidebar = () => {
  return (
    <aside className="w-64 bg-card border-r border-border h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl">
            <Activity className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground">UPA Sistema</h1>
            <p className="text-xs text-muted-foreground">Gestão Integrada</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={index}>
                <a
                  href="#"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    item.active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Menu */}
      <div className="p-4 border-t border-border">
        <ul className="space-y-1">
          {bottomItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={index}>
                <a
                  href="#"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
