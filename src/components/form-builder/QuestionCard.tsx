import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GripVertical, Trash2, Copy, X, Plus,
  Type, AlignLeft, Hash, Calendar, List, CheckSquare, ToggleLeft, CircleDot
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuestionType {
  value: string;
  label: string;
  icon: React.ReactNode;
}

export const QUESTION_TYPES: QuestionType[] = [
  { value: "texto", label: "Resposta curta", icon: <Type className="h-4 w-4" /> },
  { value: "texto_longo", label: "Parágrafo", icon: <AlignLeft className="h-4 w-4" /> },
  { value: "selecao", label: "Múltipla escolha", icon: <CircleDot className="h-4 w-4" /> },
  { value: "multipla_escolha", label: "Caixas de seleção", icon: <CheckSquare className="h-4 w-4" /> },
  { value: "numero", label: "Número", icon: <Hash className="h-4 w-4" /> },
  { value: "data", label: "Data", icon: <Calendar className="h-4 w-4" /> },
  { value: "sim_nao", label: "Sim / Não", icon: <ToggleLeft className="h-4 w-4" /> },
  { value: "escala", label: "Escala linear", icon: <List className="h-4 w-4" /> },
];

export interface QuestionData {
  id?: string;
  tipo: string;
  label: string;
  obrigatorio: boolean;
  opcoes: string[];
  ordem: number;
}

interface QuestionCardProps {
  question: QuestionData;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updated: QuestionData) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const QuestionCard = ({
  question, index, isSelected, onSelect, onChange, onDelete, onDuplicate
}: QuestionCardProps) => {
  const [newOption, setNewOption] = useState("");
  const needsOptions = ["selecao", "multipla_escolha"].includes(question.tipo);
  const isScale = question.tipo === "escala";

  const handleTypeChange = (tipo: string) => {
    let opcoes = question.opcoes;
    if (tipo === "sim_nao") {
      opcoes = ["Sim", "Não"];
    } else if (tipo === "escala") {
      opcoes = ["1", "2", "3", "4", "5"];
    } else if (["selecao", "multipla_escolha"].includes(tipo) && opcoes.length === 0) {
      opcoes = ["Opção 1"];
    } else if (!["selecao", "multipla_escolha", "sim_nao", "escala"].includes(tipo)) {
      opcoes = [];
    }
    onChange({ ...question, tipo, opcoes });
  };

  const addOption = () => {
    const val = newOption.trim() || `Opção ${question.opcoes.length + 1}`;
    onChange({ ...question, opcoes: [...question.opcoes, val] });
    setNewOption("");
  };

  const removeOption = (idx: number) => {
    onChange({ ...question, opcoes: question.opcoes.filter((_, i) => i !== idx) });
  };

  const updateOption = (idx: number, val: string) => {
    const updated = [...question.opcoes];
    updated[idx] = val;
    onChange({ ...question, opcoes: updated });
  };

  const typeInfo = QUESTION_TYPES.find(t => t.value === question.tipo);

  return (
    <Card
      className={cn(
        "transition-all cursor-pointer group relative",
        isSelected
          ? "ring-2 ring-primary border-primary shadow-md"
          : "hover:shadow-sm hover:border-primary/30"
      )}
      onClick={onSelect}
    >
      {/* Left accent bar when selected */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
      )}

      <CardContent className="p-5 space-y-4">
        {/* Top row: drag handle + question label + type selector */}
        <div className="flex items-start gap-3">
          <div className="mt-2 cursor-grab opacity-30 group-hover:opacity-60 transition-opacity">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="flex-1 space-y-3">
            {isSelected ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={question.label}
                  onChange={(e) => onChange({ ...question, label: e.target.value })}
                  placeholder="Pergunta"
                  className="flex-1 text-base font-medium border-0 border-b-2 border-muted rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary bg-transparent"
                  onClick={(e) => e.stopPropagation()}
                />
                <Select value={question.tipo} onValueChange={handleTypeChange}>
                  <SelectTrigger className="w-full sm:w-[200px] shrink-0">
                    <div className="flex items-center gap-2">
                      {typeInfo?.icon}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          {t.icon}
                          {t.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-base font-medium flex-1">
                  {question.label || "Pergunta sem título"}
                </p>
                <Badge variant="outline" className="text-xs flex items-center gap-1 shrink-0">
                  {typeInfo?.icon}
                  {typeInfo?.label}
                </Badge>
              </div>
            )}

            {/* Options preview / editing */}
            {isSelected ? (
              <>
                {needsOptions && (
                  <div className="space-y-2 pl-1">
                    {question.opcoes.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {question.tipo === "selecao" ? (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded border-2 border-muted-foreground/40 shrink-0" />
                        )}
                        <Input
                          value={opt}
                          onChange={(e) => updateOption(idx, e.target.value)}
                          className="border-0 border-b border-muted rounded-none px-0 h-8 focus-visible:ring-0 focus-visible:border-primary bg-transparent"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {question.opcoes.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={(e) => { e.stopPropagation(); removeOption(idx); }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-1">
                      {question.tipo === "selecao" ? (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/20 shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded border-2 border-muted-foreground/20 shrink-0" />
                      )}
                      <button
                        className="text-sm text-primary hover:underline"
                        onClick={(e) => { e.stopPropagation(); addOption(); }}
                      >
                        Adicionar opção
                      </button>
                    </div>
                  </div>
                )}

                {question.tipo === "sim_nao" && (
                  <div className="space-y-2 pl-1">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40" />
                      <span className="text-sm text-muted-foreground">Sim</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40" />
                      <span className="text-sm text-muted-foreground">Não</span>
                    </div>
                  </div>
                )}

                {isScale && (
                  <div className="flex items-center gap-2 pl-1">
                    {question.opcoes.map((v, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40" />
                        <span className="text-xs text-muted-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                {question.tipo === "texto" && (
                  <div className="border-b border-muted-foreground/20 py-2 text-sm text-muted-foreground">
                    Resposta curta
                  </div>
                )}

                {question.tipo === "texto_longo" && (
                  <div className="border-b border-muted-foreground/20 py-2 pb-8 text-sm text-muted-foreground">
                    Resposta longa
                  </div>
                )}

                {question.tipo === "numero" && (
                  <div className="border-b border-muted-foreground/20 py-2 text-sm text-muted-foreground w-32">
                    0
                  </div>
                )}

                {question.tipo === "data" && (
                  <div className="border-b border-muted-foreground/20 py-2 text-sm text-muted-foreground w-40">
                    dd/mm/aaaa
                  </div>
                )}
              </>
            ) : (
              <>
                {needsOptions && question.opcoes.length > 0 && (
                  <div className="space-y-1 pl-1">
                    {question.opcoes.slice(0, 3).map((opt, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        {question.tipo === "selecao" ? (
                          <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded border border-muted-foreground/30" />
                        )}
                        {opt}
                      </div>
                    ))}
                    {question.opcoes.length > 3 && (
                      <p className="text-xs text-muted-foreground ml-5">+{question.opcoes.length - 3} mais</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bottom toolbar when selected */}
        {isSelected && (
          <div className="flex items-center justify-between pt-3 border-t" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate} title="Duplicar">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} title="Excluir">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor={`req-${index}`} className="text-sm text-muted-foreground cursor-pointer">
                Obrigatória
              </Label>
              <Switch
                id={`req-${index}`}
                checked={question.obrigatorio}
                onCheckedChange={(checked) => onChange({ ...question, obrigatorio: checked })}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
