# SupportOps Console

<!-- case:start -->
## O case

- **Problema.** Um fluxo de reembolso com controle duplo precisa de um console que mostre quem pode o quê e aguente um backend frio.
- **Decisão.** React sobre o design system `colagem-ui`, cliente tipado gerado do contrato do P05 e aviso de espera para máquinas paradas. As origens da API e do provedor de identidade vêm de `config.json`, não do build.
- **Medido.** 33 testes, bundle de 92,0 KB gzip contra orçamento de 120 KB no último gate completo (`docs/harness/frontend-platform` no lab) e um teste ponta a ponta offline no navegador. O teste ponta a ponta na stack real não foi repetido.
- **Como rodar.** `npm ci && python scripts/check_fast.py`
- **Limites.** Ainda sem deploy. A checagem de contrato compara com o P05 só quando há um checkout irmão.
- **Docs.** [Arquitetura](docs/architecture.md).
<!-- case:end -->

Console web da plataforma de suporte P05. Agentes criam tickets, rodam a análise e pedem reembolso. Aprovadores veem cada reembolso pendente com valor e solicitante e decidem. O login usa Keycloak com Authorization Code e PKCE.

## Como rodar

O console é o serviço `web` do stack raiz:

```powershell
python scripts/stack.py up      # na raiz do lab
```

Abra http://localhost:48080. `python scripts/stack.py credentials` mostra as senhas locais. O Keycloak usa uma CA local: aceite o aviso de certificado no primeiro login ou confie na CA de `python scripts/stack.py ca`.

| Conta | Papel |
| --- | --- |
| `agent-a`, `agent-b` | Agente em `tenant-a`, `tenant-b` |
| `approver-a` | Aprovador de reembolso em `tenant-a` |

Um ticket que menciona "refund" faz a análise propor um reembolso e esperar um aprovador. O P05 recusa que o solicitante aprove o próprio pedido.

## Desenvolvimento

```powershell
npm ci
python scripts/check_fast.py    # lint, tipos, contrato, testes e axe
python scripts/check_full.py    # mais build, orçamento de bundle e imagem
python scripts/e2e.py           # Playwright e axe no stack em execução
```

## Contrato da API

`contract/p05-openapi.json` é uma cópia fixada de `projects/p05/openapi.yaml`, e `src/api/schema.d.ts` é gerado dela. `npm run contract:check` falha quando o P05 muda ou o cliente fica velho. Para adotar a mudança, copie o arquivo, rode `npm run contract:gen` e deixe o compilador apontar quem precisa mudar.

## Resposta de entrevista

**PT:** Criei o console como projeto independente, gerando o cliente TypeScript do OpenAPI do backend e falhando o gate quando o contrato diverge. O navegador fala com a API pelo mesmo domínio, por um proxy nginx com CSP estrita, e autentica com PKCE. O teste de ponta a ponta percorre agente, aprovador e isolamento de tenant no stack real, com axe em cada tela.

**EN:** I built the console as an independent project, generating the TypeScript client from the backend OpenAPI and failing the gate on contract drift. The browser reaches the API same-origin through an nginx proxy with a strict CSP and signs in with PKCE. The end-to-end test walks agent, approver and tenant isolation on the real stack, with axe on every screen.
