import { LegalPageLayout, LegalSection } from "./LegalPageLayout";

export function PoliticaPrivacidadePage() {
  return (
    <LegalPageLayout title="Política de Privacidade">
      <LegalSection title="1. Introdução">
        <p>
          Esta Política de Privacidade descreve como o Athlon coleta, utiliza, armazena e protege
          os dados pessoais dos usuários, em conformidade com a Lei Geral de Proteção de Dados
          (LGPD — Lei nº 13.709/2018).
        </p>
      </LegalSection>

      <LegalSection title="2. Dados que coletamos">
        <p>Podemos coletar, entre outros:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Nome, e-mail e senha (cadastro e autenticação);</li>
          <li>Perfil de acesso (treinador ou aluno);</li>
          <li>Dados de turmas, mensalidades e pagamentos registrados na plataforma;</li>
          <li>Comprovantes de pagamento enviados pelos alunos;</li>
          <li>Informações técnicas de uso, como tokens de sessão e preferências salvas no dispositivo.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalidade do tratamento">
        <p>Utilizamos seus dados para:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Criar e gerenciar sua conta;</li>
          <li>Permitir o funcionamento das funcionalidades do Athlon;</li>
          <li>Facilitar a gestão financeira entre treinadores e alunos;</li>
          <li>Garantir segurança, prevenção a fraudes e melhoria do serviço;</li>
          <li>Cumprir obrigações legais e regulatórias.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Compartilhamento">
        <p>
          Dados entre treinador e aluno são compartilhados na medida necessária para o
          funcionamento das turmas e mensalidades vinculadas. Não vendemos dados pessoais.
        </p>
        <p>
          Podemos utilizar provedores de infraestrutura (como hospedagem e banco de dados) que
          tratam dados em nosso nome, sob obrigações de confidencialidade e segurança.
        </p>
      </LegalSection>

      <LegalSection title="5. Armazenamento e retenção">
        <p>
          Os dados são armazenados em ambiente seguro enquanto sua conta estiver ativa ou pelo
          tempo necessário para cumprir as finalidades descritas nesta política e obrigações
          legais.
        </p>
      </LegalSection>

      <LegalSection title="6. Seus direitos">
        <p>
          Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção,
          anonimização, portabilidade, eliminação de dados desnecessários ou revogação de
          consentimento, quando aplicável.
        </p>
        <p>
          Para exercer seus direitos, entre em contato pelo canal de suporte da plataforma.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies e armazenamento local">
        <p>
          Utilizamos armazenamento local do navegador (como tokens de autenticação) para manter
          sua sessão e melhorar a experiência de uso. Você pode limpar esses dados nas
          configurações do navegador, o que pode exigir novo login.
        </p>
      </LegalSection>

      <LegalSection title="8. Segurança">
        <p>
          Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo
          comunicação criptografada e controle de acesso. Nenhum sistema é totalmente imune a
          incidentes, mas trabalhamos para reduzir riscos.
        </p>
      </LegalSection>

      <LegalSection title="9. Alterações">
        <p>
          Esta política pode ser atualizada periodicamente. Recomendamos revisá-la com frequência.
          Alterações relevantes serão comunicadas por meios adequados quando necessário.
        </p>
      </LegalSection>

      <LegalSection title="10. Contato">
        <p>
          Para questões sobre privacidade e proteção de dados, utilize o canal de suporte
          disponível na plataforma ou contate o encarregado/responsável pelo tratamento de dados
          do Athlon.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
