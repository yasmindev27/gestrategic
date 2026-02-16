import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PoliticaPrivacidade = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Política de Privacidade e Proteção de Dados</h1>
            <p className="text-muted-foreground">Gestrategic — Última atualização: 16/02/2026</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <p>
            A Gestrategic está comprometida com a transparência, segurança e privacidade dos dados de seus usuários. Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos e protegemos suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD) e demais legislações aplicáveis.
          </p>

          <h2 className="text-xl font-semibold mt-8">1. Definições Importantes</h2>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong className="text-foreground">Titular:</strong> Pessoa natural a quem se referem os dados pessoais.</li>
            <li><strong className="text-foreground">Dados Pessoais:</strong> Informações relacionadas a pessoa natural identificada ou identificável.</li>
            <li><strong className="text-foreground">Dados Sensíveis:</strong> Dados sobre saúde, origem racial ou étnica, convicção religiosa, opinião política, entre outros.</li>
            <li><strong className="text-foreground">Tratamento:</strong> Toda operação realizada com dados pessoais (coleta, armazenamento, uso, compartilhamento, eliminação).</li>
            <li><strong className="text-foreground">Controlador:</strong> Gestrategic, responsável pelas decisões sobre o tratamento de dados.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">2. Dados Coletados e Finalidades</h2>
          <p className="text-muted-foreground">Coletamos apenas os dados estritamente necessários para a prestação adequada de nossos serviços:</p>

          <h3 className="text-lg font-medium mt-4">2.1. Dados Cadastrais</h3>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong className="text-foreground">Informações coletadas:</strong> Nome completo, e-mail corporativo, cargo/função e instituição.</li>
            <li><strong className="text-foreground">Finalidade:</strong> Autenticação de usuários, controle de acesso à plataforma e personalização da experiência.</li>
            <li><strong className="text-foreground">Base legal:</strong> Execução de contrato (art. 7º, V, LGPD).</li>
          </ul>

          <h3 className="text-lg font-medium mt-4">2.2. Registros de Reunião</h3>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong className="text-foreground">Informações coletadas:</strong> Áudios, vídeos e transcrições de reuniões realizadas nas salas virtuais.</li>
            <li><strong className="text-foreground">Finalidade:</strong> Geração automática de atas assistidas por inteligência artificial, registro institucional e documentação de decisões.</li>
            <li><strong className="text-foreground">Base legal:</strong> Execução de contrato e legítimo interesse (art. 7º, V e IX, LGPD).</li>
            <li><strong className="text-foreground">Retenção:</strong> Os registros são mantidos pelo período definido pela instituição contratante ou conforme obrigações legais.</li>
          </ul>

          <h3 className="text-lg font-medium mt-4">2.3. Dados de Saúde e Operacionais</h3>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong className="text-foreground">Informações coletadas:</strong> Dados inseridos em prontuários eletrônicos, escalas médicas e registros assistenciais.</li>
            <li><strong className="text-foreground">Finalidade:</strong> Gestão assistencial, administrativa e apoio à tomada de decisões clínicas.</li>
            <li><strong className="text-foreground">Base legal:</strong> Tutela da saúde (art. 7º, VIII e art. 11, II, f, LGPD).</li>
            <li><strong className="text-foreground">Tratamento especial:</strong> Dados de saúde recebem camadas adicionais de segurança e controle de acesso restrito.</li>
          </ul>

          <h3 className="text-lg font-medium mt-4">2.4. Logs de Sistema e Metadados</h3>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong className="text-foreground">Informações coletadas:</strong> Endereço IP, data e hora de acesso, ações realizadas na plataforma, tipo de dispositivo e navegador.</li>
            <li><strong className="text-foreground">Finalidade:</strong> Auditoria, detecção de incidentes de segurança, prevenção de fraudes e melhoria contínua da plataforma.</li>
            <li><strong className="text-foreground">Base legal:</strong> Legítimo interesse e cumprimento de obrigação legal (art. 7º, VI e IX, LGPD).</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">3. Uso de Inteligência Artificial</h2>
          <p className="text-muted-foreground">A Gestrategic utiliza modelos de inteligência artificial para processamento de transcrições, geração de resumos e análise de dados operacionais.</p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>Os dados de áudio e texto são processados por meio de APIs seguras de provedores especializados.</li>
            <li><strong className="text-foreground">Garantia de privacidade:</strong> Seus dados não são utilizados para treinamento de modelos públicos ou compartilhados com terceiros para fins comerciais.</li>
            <li><strong className="text-foreground">Responsabilidade:</strong> A revisão e validação final das atas geradas por IA é de responsabilidade do usuário organizador da reunião.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">4. Cookies e Tecnologias de Rastreamento</h2>
          <p className="text-muted-foreground">Utilizamos cookies e tecnologias similares para melhorar sua experiência na plataforma:</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-2 text-left">Tipo de Cookie</th>
                  <th className="border border-border p-2 text-left">Finalidade</th>
                  <th className="border border-border p-2 text-left">Duração</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr><td className="border border-border p-2">Essenciais</td><td className="border border-border p-2">Autenticação e manutenção de sessão ativa</td><td className="border border-border p-2">Sessão</td></tr>
                <tr><td className="border border-border p-2">Funcionais</td><td className="border border-border p-2">Armazenar preferências de pautas e configurações do dashboard</td><td className="border border-border p-2">Persistente</td></tr>
                <tr><td className="border border-border p-2">Segurança</td><td className="border border-border p-2">Prevenir acessos não autorizados e detectar atividades suspeitas</td><td className="border border-border p-2">Persistente</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground">Você pode configurar seu navegador para recusar cookies, mas isso pode afetar a funcionalidade da plataforma.</p>

          <h2 className="text-xl font-semibold mt-8">5. Compartilhamento de Dados</h2>
          <p className="text-muted-foreground">A Gestrategic não vende, aluga ou compartilha seus dados pessoais com terceiros para fins comerciais.</p>

          <h3 className="text-lg font-medium mt-4">5.1. Integrações com Parceiros</h3>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>Ao clicar em links para sistemas parceiros (Salus, Interact, Pega Plantão e GLPI), você será redirecionado para ambientes externos.</li>
            <li>A Gestrategic não compartilha automaticamente suas credenciais sem consentimento prévio (via SSO - Single Sign-On).</li>
            <li>Cada parceiro possui sua própria política de privacidade, que recomendamos que você leia.</li>
          </ul>

          <h3 className="text-lg font-medium mt-4">5.2. Compartilhamento Legal</h3>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>Cumprir obrigações legais ou ordem judicial.</li>
            <li>Proteger direitos, propriedade ou segurança da Gestrategic, usuários ou terceiros.</li>
            <li>Prevenir fraudes ou atividades ilegais.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">6. Direitos dos Titulares (Art. 18 da LGPD)</h2>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>✓ <strong className="text-foreground">Confirmação e acesso:</strong> Saber se tratamos seus dados e acessá-los.</li>
            <li>✓ <strong className="text-foreground">Correção:</strong> Solicitar a correção de dados incompletos ou desatualizados.</li>
            <li>✓ <strong className="text-foreground">Anonimização, bloqueio ou eliminação:</strong> Quando desnecessários, excessivos ou tratados em desconformidade.</li>
            <li>✓ <strong className="text-foreground">Portabilidade:</strong> Receber seus dados em formato estruturado e interoperável.</li>
            <li>✓ <strong className="text-foreground">Informação sobre compartilhamento:</strong> Saber com quem compartilhamos seus dados.</li>
            <li>✓ <strong className="text-foreground">Revogação de consentimento:</strong> Quando aplicável, retirar seu consentimento a qualquer momento.</li>
            <li>✓ <strong className="text-foreground">Oposição ao tratamento:</strong> Opor-se ao tratamento realizado com base em legítimo interesse.</li>
          </ul>
          <p className="text-muted-foreground">
            Para exercer seus direitos, entre em contato: <strong className="text-foreground">yasminsilva18908@outlook.com</strong> — Prazo de resposta: Até 15 dias corridos.
          </p>

          <h2 className="text-xl font-semibold mt-8">7. Segurança da Informação</h2>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>🔒 Criptografia de ponta a ponta em reuniões e transmissões de dados sensíveis.</li>
            <li>🔒 Armazenamento em nuvem segura com controle de acesso baseado em funções (RBAC).</li>
            <li>🔒 Backup automático em tempo real, garantindo integridade e disponibilidade contínua dos dados.</li>
            <li>🔒 Autenticação multifator (MFA) disponível para usuários.</li>
            <li>🔒 Monitoramento contínuo de ameaças e vulnerabilidades.</li>
            <li>🔒 Plano de continuidade de negócios com recuperação de desastres.</li>
            <li>🔒 Treinamento periódico de colaboradores sobre boas práticas de segurança.</li>
          </ul>

          <h3 className="text-lg font-medium mt-4">7.1. Infraestrutura de Backup</h3>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong className="text-foreground">Redundância de dados:</strong> Cópias automáticas distribuídas geograficamente.</li>
            <li><strong className="text-foreground">Recuperação rápida:</strong> Restauração de dados em caso de incidentes.</li>
            <li><strong className="text-foreground">Alta disponibilidade:</strong> Minimização de tempo de inatividade.</li>
            <li><strong className="text-foreground">Integridade:</strong> Proteção contra perda ou corrupção de dados.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">8. Retenção e Eliminação de Dados</h2>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong className="text-foreground">Dados cadastrais:</strong> Mantidos enquanto a conta estiver ativa ou conforme obrigações legais.</li>
            <li><strong className="text-foreground">Registros de reunião:</strong> Conforme política da instituição contratante (geralmente 5 anos).</li>
            <li><strong className="text-foreground">Dados de saúde:</strong> Conforme determinações do CFM e legislação específica (mínimo 20 anos para prontuários).</li>
            <li><strong className="text-foreground">Logs de sistema:</strong> Mantidos por até 6 meses para fins de auditoria.</li>
          </ul>
          <p className="text-muted-foreground">Após o término do período de retenção, os dados são eliminados de forma segura e irreversível.</p>

          <h2 className="text-xl font-semibold mt-8">9. Transferência Internacional de Dados</h2>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>O país de destino oferece nível adequado de proteção de dados, ou</li>
            <li>Adotamos cláusulas contratuais padrão aprovadas pela ANPD, ou</li>
            <li>Obtemos seu consentimento específico.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">10. Encarregado de Dados (DPO)</h2>
          <ul className="list-none pl-0 space-y-1 text-muted-foreground">
            <li><strong className="text-foreground">Nome:</strong> Yasmin Silva Fernandes</li>
            <li><strong className="text-foreground">E-mail:</strong> yasminsilva18908@outlook.com</li>
            <li><strong className="text-foreground">Endereço:</strong> Plataforma digital Gestrategic</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">11. Alterações nesta Política</h2>
          <p className="text-muted-foreground">Esta Política pode ser atualizada periodicamente para refletir melhorias em nossos serviços ou mudanças na legislação. Alterações significativas serão comunicadas por e-mail ou notificação na plataforma.</p>

          <h2 className="text-xl font-semibold mt-8">12. Legislação e Foro</h2>
          <p className="text-muted-foreground">Esta Política é regida pelas leis brasileiras. Fica eleito o foro da comarca de Nova Serrana, Minas Gerais, para dirimir quaisquer controvérsias decorrentes desta Política de Privacidade.</p>

          <div className="mt-8 p-4 bg-muted rounded-lg border">
            <p className="text-sm text-muted-foreground text-center">
              Ao utilizar a plataforma Gestrategic, você concorda com os termos desta Política de Privacidade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoliticaPrivacidade;
