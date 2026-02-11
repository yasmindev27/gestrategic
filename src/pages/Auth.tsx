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
    <div className="min-h-screen bg-gradient-to-br from-header to-header/80 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>
      
      <Card className="w-full max-w-md bg-card/95 backdrop-blur-sm border-border shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto flex items-center justify-center gap-3">
            <img 
              src={logoGestrategic} 
              alt="GESTRATEGIC" 
              className="h-12 w-auto object-contain rounded"
            />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-semibold text-foreground">
              Área do Cliente
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Faça login para acessar o sistema
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Login Type Selector */}
            <div className="flex gap-2 bg-muted/50 p-1 rounded-lg">
              <Button
                type="button"
                variant={loginType === "email" ? "default" : "ghost"}
                size="sm"
                className="flex-1 transition-all duration-200"
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
                className="flex-1 transition-all duration-200"
                onClick={() => {
                  setLoginType("matricula");
                  setLoginIdentifier("");
                }}
              >
                Matrícula
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-identifier" className="text-foreground">
                {loginType === "email" ? "Email" : "Matrícula"}
              </Label>
              <Input
                id="login-identifier"
                type={loginType === "email" ? "email" : "text"}
                placeholder={loginType === "email" ? "seu@email.com" : "Digite sua matrícula"}
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
                className="bg-background border-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-foreground">Senha</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="bg-background border-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
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
          
          <p className="text-center text-sm text-foreground/60 mt-6">
            Para obter acesso ao sistema, entre em contato com o administrador.
          </p>
        </CardContent>
      </Card>

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
