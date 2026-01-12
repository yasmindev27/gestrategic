import { Sun, Moon, Sunset } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const getGreeting = () => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return {
      text: "Bom dia",
      icon: Sun,
      description: "Tenha um ótimo turno de trabalho!"
    };
  } else if (hour >= 12 && hour < 18) {
    return {
      text: "Boa tarde",
      icon: Sunset,
      description: "Continue com o excelente trabalho!"
    };
  } else {
    return {
      text: "Boa noite",
      icon: Moon,
      description: "Obrigado pela sua dedicação!"
    };
  }
};

const GreetingHeader = () => {
  const [userName, setUserName] = useState<string>("Usuário");
  const greeting = getGreeting();
  const Icon = greeting.icon;
  const today = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  useEffect(() => {
    const fetchUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário";
        // Get first name only
        const firstName = fullName.split(" ")[0];
        setUserName(firstName);
      }
    };
    
    fetchUserName();
  }, []);

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {greeting.text}, <span className="text-primary">{userName}</span>!
          </h1>
          <p className="text-muted-foreground">{greeting.description}</p>
          <p className="text-sm text-muted-foreground mt-1 capitalize">{today}</p>
        </div>
      </div>
    </div>
  );
};

export default GreetingHeader;