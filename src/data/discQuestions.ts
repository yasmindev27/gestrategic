import { DISCProfileInfo } from "@/types/disc";

export interface DISCQuestion {
  id: number;
  block: number;
  question: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
}

// Mapping: a=D, b=I, c=C, d=S
export const DISC_QUESTIONS: DISCQuestion[] = [
  // BLOCO 1 – TOMADA DE DECISÃO E AÇÃO
  {
    id: 1, block: 1,
    question: "Quando surge uma situação crítica com um paciente grave, minha primeira reação é:",
    options: {
      a: "Assumir o controle da situação imediatamente e delegar tarefas com firmeza",
      b: "Mobilizar a equipe rapidamente, mantendo todos informados e engajados",
      c: "Verificar protocolos estabelecidos antes de agir, garantindo segurança",
      d: "Manter a calma e apoiar quem está à frente, oferecendo suporte necessário",
    },
  },
  {
    id: 2, block: 1,
    question: "Diante de uma mudança repentina de protocolo assistencial, eu:",
    options: {
      a: "Questiono a mudança se não vejo sentido prático e proponho ajustes",
      b: "Comunico a mudança à equipe de forma positiva e incentivo a adaptação",
      c: "Estudo o novo protocolo detalhadamente antes de aplicá-lo",
      d: "Aceito a mudança e busco entender como posso ajudar na transição",
    },
  },
  {
    id: 3, block: 1,
    question: "Quando preciso resolver um problema operacional urgente, eu:",
    options: {
      a: "Tomo decisões rápidas baseadas na minha experiência e sigo em frente",
      b: "Consulto rapidamente colegas próximos para decidir em conjunto",
      c: "Analiso as opções disponíveis metodicamente antes de escolher",
      d: "Sigo os procedimentos padrão e busco apoio quando necessário",
    },
  },
  {
    id: 4, block: 1,
    question: "Em uma situação de conflito entre dois colegas de equipe, minha tendência é:",
    options: {
      a: "Intervir diretamente e estabelecer limites claros de conduta",
      b: "Mediar o conflito buscando que ambos se expressem e cheguem a um acordo",
      c: "Propor uma reunião formal para discutir o problema com base em fatos",
      d: "Evitar me envolver diretamente, a menos que seja solicitado",
    },
  },
  {
    id: 5, block: 1,
    question: "Quando recebo críticas sobre meu trabalho, eu:",
    options: {
      a: "Avalio objetivamente se a crítica procede e, se não, defendo meu ponto de vista",
      b: "Procuro entender o lado da outra pessoa e busco melhorar o relacionamento",
      c: "Analiso os dados e evidências antes de aceitar ou refutar a crítica",
      d: "Fico incomodado inicialmente, mas reflito e busco melhorar",
    },
  },
  {
    id: 6, block: 1,
    question: "Diante de metas desafiadoras impostas pela gestão, eu:",
    options: {
      a: "Encaro como um desafio estimulante e busco formas de superá-las",
      b: "Motivo a equipe e crio um clima positivo para alcançarmos juntos",
      c: "Planejo detalhadamente as etapas necessárias para atingir os objetivos",
      d: "Sigo as orientações e faço minha parte com dedicação",
    },
  },
  // BLOCO 2 – RELACIONAMENTO E COMUNICAÇÃO
  {
    id: 7, block: 2,
    question: "Durante o plantão, minha forma de me comunicar com a equipe é:",
    options: {
      a: "Direta, objetiva e focada no que precisa ser feito",
      b: "Amigável, aberta e incentivando a participação de todos",
      c: "Formal, técnica e baseada em informações precisas",
      d: "Respeitosa, discreta e evitando conflitos",
    },
  },
  {
    id: 8, block: 2,
    question: "Quando um colega novo chega ao setor, eu:",
    options: {
      a: "Apresento as rotinas essenciais rapidamente para que ele se integre logo",
      b: "Faço questão de recebê-lo bem, apresentar a equipe e criar um clima acolhedor",
      c: "Explico detalhadamente os protocolos e procedimentos do setor",
      d: "Fico disponível para ajudá-lo quando ele precisar, sem pressionar",
    },
  },
  {
    id: 9, block: 2,
    question: "Em reuniões de equipe, meu comportamento costuma ser:",
    options: {
      a: "Proponho soluções práticas e defendo minhas ideias com convicção",
      b: "Busco engajar todos na discussão e valorizo as contribuições",
      c: "Apresento dados, análises e fundamento técnico para as decisões",
      d: "Ouço atentamente e participo quando solicitado ou necessário",
    },
  },
  {
    id: 10, block: 2,
    question: "Quando percebo que um colega está desmotivado ou triste, eu:",
    options: {
      a: "Pergunto diretamente se há algo errado e ofereço ajuda prática",
      b: "Aproximo-me com empatia, ofereço apoio emocional e ouço sem julgar",
      c: "Observo a situação e, se impactar o trabalho, sugiro buscar suporte adequado",
      d: "Respeito o espaço dele, mas fico atento caso precise de algo",
    },
  },
  {
    id: 11, block: 2,
    question: "Ao trabalhar em equipe, minha preferência é:",
    options: {
      a: "Liderar ou coordenar as atividades para garantir resultado",
      b: "Criar um ambiente colaborativo e harmonioso",
      c: "Organizar as tarefas com clareza e seguir o planejado",
      d: "Ser um membro confiável que executa bem sua parte",
    },
  },
  {
    id: 12, block: 2,
    question: "Quando preciso dar um feedback negativo a um colega, eu:",
    options: {
      a: "Falo de forma clara e direta sobre o que precisa melhorar",
      b: "Procuro uma forma gentil de abordar, valorizando também os pontos positivos",
      c: "Baseio o feedback em fatos observáveis e sugiro melhorias específicas",
      d: "Sinto desconforto e prefiro que a liderança formal faça isso",
    },
  },
  // BLOCO 3 – ORGANIZAÇÃO E PROCESSOS
  {
    id: 13, block: 3,
    question: "Minha forma de organizar o trabalho durante o plantão é:",
    options: {
      a: "Priorizo o mais urgente e vou resolvendo conforme as demandas surgem",
      b: "Distribuo as tarefas de forma que todos participem e se sintam valorizados",
      c: "Sigo uma lista de prioridades organizada metodicamente",
      d: "Mantenho uma rotina consistente e previsível",
    },
  },
  {
    id: 14, block: 3,
    question: "Quando surge uma tarefa nova ou diferente da rotina, eu:",
    options: {
      a: "Encaro como oportunidade e parto para a ação rapidamente",
      b: "Vejo como algo interessante e busco envolver outros para fazer junto",
      c: "Pesquiso informações e protocolos antes de executar",
      d: "Prefiro que seja explicada claramente antes de começar",
    },
  },
  {
    id: 15, block: 3,
    question: "Em relação ao cumprimento de prazos e procedimentos, eu:",
    options: {
      a: "Priorizo resultados, mesmo que precise flexibilizar alguma norma",
      b: "Cumpro os prazos, mas valorizo também a qualidade do relacionamento",
      c: "Sigo rigorosamente os prazos e procedimentos estabelecidos",
      d: "Cumpro com consistência, evitando imprevistos",
    },
  },
  {
    id: 16, block: 3,
    question: "Minha abordagem ao preencher registros, prontuários e relatórios é:",
    options: {
      a: "Registro o essencial de forma rápida para não perder tempo",
      b: "Registro com atenção, mas às vezes deixo para completar depois",
      c: "Preencho de forma completa, detalhada e dentro dos padrões técnicos",
      d: "Preencho com cuidado e confiro antes de finalizar",
    },
  },
  {
    id: 17, block: 3,
    question: "Quando um protocolo assistencial é muito rígido e impede agilidade, eu:",
    options: {
      a: "Questiono e proponho mudanças para torná-lo mais prático",
      b: "Adapto informalmente quando necessário, priorizando o paciente",
      c: "Sigo o protocolo, mesmo que ele torne o processo mais lento",
      d: "Aceito o protocolo, mas sinto incômodo quando ele atrapalha",
    },
  },
  {
    id: 18, block: 3,
    question: "Ao planejar minhas atividades diárias, eu:",
    options: {
      a: "Foco no que precisa ser feito e ajusto conforme necessário",
      b: "Prefiro flexibilidade para me adaptar às necessidades da equipe",
      c: "Planejo detalhadamente e sigo o cronograma estabelecido",
      d: "Mantenho uma rotina estável e previsível",
    },
  },
  // BLOCO 4 – PRESSÃO E GESTÃO DE ESTRESSE
  {
    id: 19, block: 4,
    question: "Em momentos de alta demanda e sobrecarga da UPA, eu:",
    options: {
      a: "Mantenho o foco, acelero o ritmo e tomo decisões rápidas",
      b: "Busco manter o ânimo da equipe e incentivo a colaboração mútua",
      c: "Organizo prioridades com base em critérios técnicos e sigo o planejado",
      d: "Sinto a pressão, mas mantenho a calma e faço minha parte com dedicação",
    },
  },
  {
    id: 20, block: 4,
    question: "Quando cometo um erro técnico ou assistencial, minha reação é:",
    options: {
      a: "Assumo rapidamente e foco em corrigir o problema imediatamente",
      b: "Comunico à equipe, peço ajuda se necessário e busco aprender",
      c: "Analiso o que causou o erro e registro para evitar recorrência",
      d: "Fico abalado emocionalmente, mas busco corrigir com cuidado",
    },
  },
  {
    id: 21, block: 4,
    question: "Quando sou cobrado por um resultado que depende de outros, eu:",
    options: {
      a: "Assumo a responsabilidade e busco resolver diretamente",
      b: "Explico a situação e busco apoio da equipe para solucionar",
      c: "Apresento os fatos e justifico tecnicamente os obstáculos",
      d: "Sinto-me pressionado e desconfortável com a cobrança",
    },
  },
  {
    id: 22, block: 4,
    question: "Diante de imprevistos que alteram completamente meu planejamento, eu:",
    options: {
      a: "Adapto-me rapidamente e mudo de estratégia sem hesitar",
      b: "Mantenho uma atitude positiva e busco soluções criativas",
      c: "Sinto desconforto com a mudança, mas reorganizo metodicamente",
      d: "Prefiro estabilidade, mas me adapto quando necessário",
    },
  },
  {
    id: 23, block: 4,
    question: "Quando há conflito entre seguir um protocolo e atender uma necessidade urgente do paciente, eu:",
    options: {
      a: "Priorizo o resultado prático e faço o que é melhor para o paciente",
      b: "Busco equilibrar as duas coisas com bom senso e empatia",
      c: "Sigo o protocolo, mas documento a situação e busco orientação",
      d: "Sinto-me dividido e prefiro consultar a liderança antes de agir",
    },
  },
  {
    id: 24, block: 4,
    question: "Em situações de crise (múltiplas emergências simultâneas), eu:",
    options: {
      a: "Assumo o comando e distribuo tarefas com autoridade",
      b: "Mobilizo a equipe com energia e mantenho todos comunicados",
      c: "Organizo prioridades tecnicamente e sigo protocolos estabelecidos",
      d: "Executo minha parte com calma e apoio quem está coordenando",
    },
  },
];

export const LEADERSHIP_QUESTIONS = [
  "Sinto-me confortável liderando equipes em situações de pressão",
  "Consigo mediar conflitos de forma justa e eficaz",
  "Comunico-me de forma clara e assertiva com diferentes perfis profissionais",
  "Mantenho organização e controle sobre processos e rotinas",
  "Tomo decisões difíceis rapidamente quando necessário",
  "As pessoas costumam me procurar para pedir orientação ou ajuda",
  "Consigo delegar tarefas e confiar na execução da equipe",
  "Mantenho a calma e a objetividade mesmo sob grande estresse",
  "Sigo protocolos institucionais mesmo quando não concordo plenamente",
  "Tenho interesse em assumir cargos de liderança na UPA",
];

export const BLOCK_TITLES = [
  "Tomada de Decisão e Ação",
  "Relacionamento e Comunicação",
  "Organização e Processos",
  "Pressão e Gestão de Estresse",
];

export const DISC_PROFILES: DISCProfileInfo[] = [
  {
    letter: "D",
    name: "Dominância",
    subtitle: "Perfil Executor/Decisor",
    characteristics: ["Orientado a resultados", "Decisivo", "Direto", "Assume riscos", "Age sob pressão"],
    potentialUPA: "Coordenação de emergências, gestão de crises, liderança operacional",
    cargosCompativeis: ["Coordenador médico", "Coordenador de enfermagem", "Supervisor de plantão"],
    color: "disc-d",
  },
  {
    letter: "I",
    name: "Influência",
    subtitle: "Perfil Comunicador/Mobilizador",
    characteristics: ["Comunicativo", "Entusiasta", "Persuasivo", "Trabalha bem em equipe", "Motiva pessoas"],
    potentialUPA: "Gestão de equipes, acolhimento, educação continuada, mediação de conflitos",
    cargosCompativeis: ["Coordenador de acolhimento", "Supervisor de equipe", "Facilitador de treinamentos"],
    color: "disc-i",
  },
  {
    letter: "S",
    name: "Estabilidade",
    subtitle: "Perfil Apoiador/Mantenedor",
    characteristics: ["Paciente", "Leal", "Colaborativo", "Evita conflitos", "Busca estabilidade"],
    potentialUPA: "Suporte técnico, execução consistente, apoio em procedimentos de rotina",
    cargosCompativeis: ["Referência técnica", "Preceptor", "Executor sênior (sem gestão direta)"],
    color: "disc-s",
  },
  {
    letter: "C",
    name: "Conformidade",
    subtitle: "Perfil Analista/Especialista",
    characteristics: ["Detalhista", "Metódico", "Segue normas", "Valoriza qualidade", "Precisão"],
    potentialUPA: "Gestão de protocolos, qualidade assistencial, auditoria, controles",
    cargosCompativeis: ["Coordenador de qualidade", "Responsável técnico", "Gestor de protocolos"],
    color: "disc-c",
  },
];
