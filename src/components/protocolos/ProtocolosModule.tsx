import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Thermometer, Baby } from 'lucide-react';
import { ProtocolosList } from './ProtocolosList';
import { FormDorToracica } from './FormDorToracica';
import { FormSepseAdulto } from './FormSepseAdulto';
import { FormSepsePediatrico } from './FormSepsePediatrico';

type View = 'list' | 'form';

export const ProtocolosModule = () => {
  const [activeTab, setActiveTab] = useState('dor_toracica');
  const [view, setView] = useState<View>('list');

  const handleNovo = () => setView('form');
  const handleBack = () => setView('list');

  if (view === 'form') {
    switch (activeTab) {
      case 'dor_toracica': return <FormDorToracica onBack={handleBack} />;
      case 'sepse_adulto': return <FormSepseAdulto onBack={handleBack} />;
      case 'sepse_pediatrico': return <FormSepsePediatrico onBack={handleBack} />;
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setView('list'); }}>
      <TabsList className="h-auto p-1">
        <TabsTrigger value="dor_toracica" className="gap-2">
          <Heart className="h-4 w-4" />
          <span className="hidden sm:inline">Dor Torácica</span>
          <span className="sm:hidden">DT</span>
        </TabsTrigger>
        <TabsTrigger value="sepse_adulto" className="gap-2">
          <Thermometer className="h-4 w-4" />
          <span className="hidden sm:inline">Sepse Adulto</span>
          <span className="sm:hidden">SA</span>
        </TabsTrigger>
        <TabsTrigger value="sepse_pediatrico" className="gap-2">
          <Baby className="h-4 w-4" />
          <span className="hidden sm:inline">Sepse Pediátrico</span>
          <span className="sm:hidden">SP</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dor_toracica" className="mt-6">
        <ProtocolosList tipo="dor_toracica" titulo="Protocolo Dor Torácica" onNovo={handleNovo} />
      </TabsContent>
      <TabsContent value="sepse_adulto" className="mt-6">
        <ProtocolosList tipo="sepse_adulto" titulo="Protocolo Sepse Adulto" onNovo={handleNovo} />
      </TabsContent>
      <TabsContent value="sepse_pediatrico" className="mt-6">
        <ProtocolosList tipo="sepse_pediatrico" titulo="Protocolo Sepse Pediátrico" onNovo={handleNovo} />
      </TabsContent>
    </Tabs>
  );
};
