# Coreografia vs. Orquestracao (PlantUML)

Diagramas de apoio para a aula, comparando como nossos **microservicos se organizam** para dar conta do mesmo fluxo de pedido nos dois modelos de coordenacao.

> Hoje o sistema usa **coreografia**. A versao orquestrada e hipotetica, para efeito de comparacao (nesse modelo o proprio ecommerce viraria o maestro).
>
> Foco da aula: **como microservicos independentes coordenam um fluxo que passa por varios deles**. A parte de "desfazer quando um passo falha" (saga) so aparece como gancho no fim, e fica para as proximas aulas.

## Os microservicos

- **ecommerce:** recebe o pedido e acompanha o resultado.
- **payment:** cobra e estorna pagamentos.
- **inventory:** reserva e libera estoque.

Cada um e dono do seu banco e conversa por mensagens no RabbitMQ. O que muda entre os modelos e **quem coordena** o trabalho de varios passos.

## Arquivos

- [coreografia.puml](coreografia.puml) - modelo atual. Contem 3 diagramas:
  - Visao macro (quem fala com quem)
  - Caminho feliz (pedido aprovado)
  - Quando um passo falha (estoque OK, pagamento recusado)
- [orquestracao.puml](orquestracao.puml) - modelo hipotetico, com o **ecommerce como maestro**. Mesmos 3 diagramas.

Cada `.puml` tem varios blocos `@startuml ... @enduml`: cada bloco e um diagrama separado.

## A diferenca em uma frase

- **Coreografia:** cada servico reage a **fatos** e decide sozinho. O ecommerce so observa os fatos e junta o resultado.
- **Orquestracao:** o **ecommerce vira o maestro**, envia **comandos** e decide o proximo passo. A logica fica centralizada nele.
