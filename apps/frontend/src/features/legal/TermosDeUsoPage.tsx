import { LegalPageLayout, LegalSection } from "./LegalPageLayout";

export function TermosDeUsoPage() {
  return (
    <LegalPageLayout title="Termos de Uso">
      <LegalSection title="1. Aceitação">
        <p>
          Ao criar uma conta ou utilizar o Athlon, você declara ter lido, compreendido e concordado
          com estes Termos de Uso. Se não concordar com qualquer disposição, não utilize a
          plataforma.
        </p>
      </LegalSection>

      <LegalSection title="2. Sobre o Athlon">
        <p>
          O Athlon é uma plataforma de gestão esportiva que conecta treinadores e alunos para
          organização de turmas, acompanhamento de mensalidades, envio de comprovantes de
          pagamento e comunicação relacionada às atividades esportivas.
        </p>
      </LegalSection>

      <LegalSection title="3. Cadastro e contas">
        <p>
          Para utilizar o serviço, é necessário fornecer informações verdadeiras e atualizadas no
          cadastro. Treinadores são responsáveis pelas turmas, valores e dados que cadastram.
          Alunos devem utilizar códigos de convite válidos fornecidos pelo treinador.
        </p>
        <p>
          Você é responsável por manter a confidencialidade da sua senha e por todas as atividades
          realizadas na sua conta.
        </p>
      </LegalSection>

      <LegalSection title="4. Uso permitido">
        <p>
          O Athlon deve ser utilizado apenas para fins legítimos de gestão esportiva. É proibido
          usar a plataforma para atividades ilícitas, envio de conteúdo ofensivo, tentativas de
          acesso não autorizado ou qualquer uso que prejudique outros usuários ou o funcionamento
          do sistema.
        </p>
      </LegalSection>

      <LegalSection title="5. Pagamentos e comprovantes">
        <p>
          O Athlon facilita o registro e acompanhamento de mensalidades e comprovantes, mas não
          processa pagamentos diretamente. Transações financeiras via PIX ou outros meios ocorrem
          fora da plataforma, entre aluno e treinador.
        </p>
        <p>
          Treinadores são responsáveis pela conferência dos comprovantes enviados. Alunos devem
          enviar documentos legítimos e relacionados aos pagamentos devidos.
        </p>
      </LegalSection>

      <LegalSection title="6. Responsabilidades">
        <p>
          O Athlon é uma ferramenta de apoio à gestão. Não nos responsabilizamos por disputas
          financeiras, cancelamentos de aulas, lesões ou acordos firmados fora da plataforma entre
          treinadores e alunos.
        </p>
      </LegalSection>

      <LegalSection title="7. Propriedade intelectual">
        <p>
          A marca, identidade visual, software e conteúdos do Athlon são protegidos por direitos de
          propriedade intelectual. É vedada a cópia, modificação ou distribuição não autorizada da
          plataforma.
        </p>
      </LegalSection>

      <LegalSection title="8. Disponibilidade e alterações">
        <p>
          Podemos atualizar, suspender ou descontinuar funcionalidades do serviço a qualquer
          momento, com ou sem aviso prévio, especialmente durante o período de evolução do produto.
        </p>
        <p>
          Estes termos podem ser alterados periodicamente. O uso continuado da plataforma após
          mudanças constitui aceitação da versão vigente.
        </p>
      </LegalSection>

      <LegalSection title="9. Contato">
        <p>
          Dúvidas sobre estes Termos de Uso podem ser encaminhadas pelo canal de suporte indicado
          na plataforma ou ao responsável legal do Athlon.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
