import { useState } from "react";
import { IdentificationData, SECTORS, TIME_OPTIONS, LEADERSHIP_EXPERIENCE } from "@/types/disc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { User, Briefcase, Building, Clock, GraduationCap, Users } from "lucide-react";

interface IdentificationFormProps {
  onSubmit: (data: IdentificationData) => void;
}

export function IdentificationForm({ onSubmit }: IdentificationFormProps) {
  const [formData, setFormData] = useState<Partial<IdentificationData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.nomeCompleto?.trim()) newErrors.nomeCompleto = "Nome é obrigatório";
    if (!formData.cargoAtual?.trim()) newErrors.cargoAtual = "Cargo é obrigatório";
    if (!formData.setor) newErrors.setor = "Setor é obrigatório";
    if (formData.setor === "Outro" && !formData.setorOutro?.trim()) newErrors.setorOutro = "Especifique o setor";
    if (!formData.tempoAtuacao) newErrors.tempoAtuacao = "Tempo de atuação é obrigatório";
    if (!formData.formacao?.trim()) newErrors.formacao = "Formação é obrigatória";
    if (!formData.experienciaLideranca) newErrors.experienciaLideranca = "Selecione uma opção";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData as IdentificationData);
      return;
    }
    toast({ title: "Campos obrigatórios", description: "Preencha todos os campos para iniciar a avaliação.", variant: "destructive" });
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-semibold">Identificação</CardTitle>
        <CardDescription>Preencha suas informações para iniciar a avaliação</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nome" className="flex items-center gap-2 font-medium">
              <User className="w-4 h-4 text-primary" /> Nome completo
            </Label>
            <Input id="nome" placeholder="Digite seu nome completo" value={formData.nomeCompleto || ""} onChange={(e) => setFormData({ ...formData, nomeCompleto: e.target.value })} className={errors.nomeCompleto ? "border-destructive" : ""} />
            {errors.nomeCompleto && <p className="text-sm text-destructive">{errors.nomeCompleto}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargo" className="flex items-center gap-2 font-medium">
              <Briefcase className="w-4 h-4 text-primary" /> Cargo atual
            </Label>
            <Input id="cargo" placeholder="Ex: Enfermeiro, Técnico de Enfermagem, Médico..." value={formData.cargoAtual || ""} onChange={(e) => setFormData({ ...formData, cargoAtual: e.target.value })} className={errors.cargoAtual ? "border-destructive" : ""} />
            {errors.cargoAtual && <p className="text-sm text-destructive">{errors.cargoAtual}</p>}
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2 font-medium">
              <Building className="w-4 h-4 text-primary" /> Setor
            </Label>
            <RadioGroup value={formData.setor || ""} onValueChange={(value) => setFormData({ ...formData, setor: value, setorOutro: "" })} className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SECTORS.map((sector) => (
                <div key={sector} className="flex items-center space-x-2">
                  <RadioGroupItem value={sector} id={`sector-${sector}`} />
                  <Label htmlFor={`sector-${sector}`} className="text-sm cursor-pointer">{sector}</Label>
                </div>
              ))}
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Outro" id="setor-outro" />
                <Label htmlFor="setor-outro" className="text-sm cursor-pointer">Outro</Label>
              </div>
            </RadioGroup>
            {formData.setor === "Outro" && (
              <Input placeholder="Especifique o setor" value={formData.setorOutro || ""} onChange={(e) => setFormData({ ...formData, setorOutro: e.target.value })} className={errors.setorOutro ? "border-destructive mt-2" : "mt-2"} />
            )}
            {(errors.setor || errors.setorOutro) && <p className="text-sm text-destructive">{errors.setor || errors.setorOutro}</p>}
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2 font-medium">
              <Clock className="w-4 h-4 text-primary" /> Tempo de atuação na UPA
            </Label>
            <RadioGroup value={formData.tempoAtuacao || ""} onValueChange={(value) => setFormData({ ...formData, tempoAtuacao: value })} className="flex flex-wrap gap-3">
              {TIME_OPTIONS.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`time-${option}`} />
                  <Label htmlFor={`time-${option}`} className="text-sm cursor-pointer">{option}</Label>
                </div>
              ))}
            </RadioGroup>
            {errors.tempoAtuacao && <p className="text-sm text-destructive">{errors.tempoAtuacao}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="formacao" className="flex items-center gap-2 font-medium">
              <GraduationCap className="w-4 h-4 text-primary" /> Formação
            </Label>
            <Input id="formacao" placeholder="Ex: Enfermagem, Medicina, Técnico em Enfermagem..." value={formData.formacao || ""} onChange={(e) => setFormData({ ...formData, formacao: e.target.value })} className={errors.formacao ? "border-destructive" : ""} />
            {errors.formacao && <p className="text-sm text-destructive">{errors.formacao}</p>}
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2 font-medium">
              <Users className="w-4 h-4 text-primary" /> Já exerceu função de liderança formal ou informal?
            </Label>
            <RadioGroup value={formData.experienciaLideranca || ""} onValueChange={(value) => setFormData({ ...formData, experienciaLideranca: value })} className="space-y-2">
              {LEADERSHIP_EXPERIENCE.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`exp-${option}`} />
                  <Label htmlFor={`exp-${option}`} className="text-sm cursor-pointer">{option}</Label>
                </div>
              ))}
            </RadioGroup>
            {errors.experienciaLideranca && <p className="text-sm text-destructive">{errors.experienciaLideranca}</p>}
          </div>

          <Button type="submit" className="w-full font-semibold py-6">
            Iniciar Avaliação DISC
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
