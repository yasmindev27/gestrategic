import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import logoGestrategic from "@/assets/logo-gestrategic.jpg";
import { z } from "zod";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";

const emailSchema = z.string().email("Email inválido");
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres");
const matriculaSchema = z.string().min(1, "Matrícula é obrigatória");

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Login type: email or matricula
  const [loginType, setLoginType] = useState<"email" | "matricula">("email");
  
  // Login form
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && !showChangePasswordDialog) {
        // Check if user needs to change password
        setTimeout(() => {
          checkFirstLogin(session.user.id);
        }, 0);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !showChangePasswordDialog) {
        checkFirstLogin(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, showChangePasswordDialog]);

  const checkFirstLogin = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("deve_trocar_senha")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Erro ao verificar perfil:", error);
        navigate("/dashboard");
        return;
      }

      if (profile?.deve_trocar_senha) {
        setCurrentUserId(userId);
        setShowChangePasswordDialog(true);
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Erro:", error);
      navigate("/dashboard");
    }
  };

  const validateLogin = () => {
    try {
      if (loginType === "email") {
        emailSchema.parse(loginIdentifier);
      } else {
        matriculaSchema.parse(loginIdentifier);
      }
      passwordSchema.parse(loginPassword);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateLogin()) return;
    
    setIsLoading(true);
    
    let email = loginIdentifier;
    
    // If logging in with matricula, find the associated email
    if (loginType === "matricula") {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("matricula", loginIdentifier)
        .single();

      if (profileError || !profile) {
        setIsLoading(false);
        toast({
          title: "Erro",
          description: "Matrícula não encontrada no sistema.",
          variant: "destructive",
        });
        return;
      }

      // Get the email from the profile - we use the internal email format
      email = `${loginIdentifier}@interno.local`;
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: loginPassword,
    });

    setIsLoading(false);

    if (error) {
      let errorMessage = "Erro ao fazer login";
      
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = loginType === "email" 
          ? "Email ou senha incorretos" 
          : "Matrícula ou senha incorretos";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Por favor, confirme seu email antes de fazer login";
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handlePasswordChangeSuccess = () => {
    setShowChangePasswordDialog(false);
    setCurrentUserId(null);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d2137] via-[#112d4a] to-[#153656] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[#2d7dd2]/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#1a5a8a]/6 rounded-full blur-[100px]" />
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.02]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="loginGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#loginGrid)" />
          </svg>
        </div>
      </div>
      
      <div className="w-full max-w-md relative z-10 animate-slide-up-fade">
        {/* Logo above card */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img 
            src={logoGestrategic} 
            alt="GESTRATEGIC" 
            className="h-14 w-auto object-contain rounded-lg shadow-lg shadow-black/20"
          />
        </div>

        <Card className="glass-card shadow-2xl border-white/10">
          <CardHeader className="text-center space-y-3 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold text-foreground tracking-tight">
                Área do Cliente
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Faça login para acessar o sistema
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Login Type Selector */}
              <div className="flex gap-1 bg-muted/40 p-1 rounded-xl border border-border/50">
                <Button
                  type="button"
                  variant={loginType === "email" ? "default" : "ghost"}
                  size="sm"
                  className={`flex-1 rounded-lg transition-all duration-300 ${loginType === "email" ? "shadow-sm" : ""}`}
                  onClick={() => {
                    setLoginType("email");
                    setLoginIdentifier("");
                  }}
                >
                  Email
                </Button>
                <Button
                  type="button"
                  variant={loginType === "matricula" ? "default" : "ghost"}
                  size="sm"
                  className={`flex-1 rounded-lg transition-all duration-300 ${loginType === "matricula" ? "shadow-sm" : ""}`}
                  onClick={() => {
                    setLoginType("matricula");
                    setLoginIdentifier("");
                  }}
                >
                  Matrícula
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-identifier" className="text-foreground text-sm font-medium">
                  {loginType === "email" ? "Email" : "Matrícula"}
                </Label>
                <div className="input-glow rounded-lg transition-all duration-200">
                  <Input
                    id="login-identifier"
                    type={loginType === "email" ? "email" : "text"}
                    placeholder={loginType === "email" ? "seu@email.com" : "Digite sua matrícula"}
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    required
                    className="bg-background/50 border-border/60 h-11 transition-all duration-200 focus:bg-background"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-foreground text-sm font-medium">Senha</Label>
                <div className="relative input-glow rounded-lg transition-all duration-200">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="bg-background/50 border-border/60 pr-10 h-11 transition-all duration-200 focus:bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
            
            <div className="flex items-center gap-2 mt-6">
              <div className="h-px flex-1 bg-border/50" />
              <p className="text-xs text-muted-foreground px-2">
                Contate o administrador para obter acesso
              </p>
              <div className="h-px flex-1 bg-border/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Dialog */}
      {currentUserId && (
        <ChangePasswordDialog
          open={showChangePasswordDialog}
          onSuccess={handlePasswordChangeSuccess}
          userId={currentUserId}
        />
      )}
    </div>
  );
};

export default Auth;
