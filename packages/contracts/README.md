# packages/contracts

Pacote tipado que materializa o contrato público entre backend e futuras camadas consumidoras.

## Regra

- O pacote descreve tipos, payloads, responses e read models.
- O pacote não implementa regra de negócio.
- O banco, as views e as RPCs continuam sendo a fonte da verdade.

## Estado atual

Fase 2.1 entregue:
- contratos de ticketing materializados em TypeScript;
- validação local por `tsc`;
- workflow CI validando `contracts:typecheck` antes da suíte de banco.

## Estrutura atual

- [package.json](/C:/Trabalho/packages/contracts/package.json)
- [tsconfig.json](/C:/Trabalho/packages/contracts/tsconfig.json)
- [src/index.ts](/C:/Trabalho/packages/contracts/src/index.ts)
- [src/ticketing.ts](/C:/Trabalho/packages/contracts/src/ticketing.ts)

## Exportações de ticketing

Enums/literals:
- `TicketStatus`
- `TicketPriority`
- `TicketSeverity`
- `TicketSource`
- `TicketMessageVisibility`
- `TicketEventType`

Views:
- `TicketListItem`
- `TicketDetail`
- `TicketTimelineItem`

RPC payloads e responses:
- `RpcCreateTicketPayload`
- `RpcCreateTicketResponse`
- `RpcUpdateTicketStatusPayload`
- `RpcUpdateTicketStatusResponse`
- `RpcAssignTicketPayload`
- `RpcAssignTicketResponse`
- `RpcAddTicketMessagePayload`
- `RpcAddTicketMessageResponse`
- `RpcAddInternalTicketNotePayload`
- `RpcAddInternalTicketNoteResponse`
- `RpcCloseTicketPayload`
- `RpcCloseTicketResponse`
- `RpcReopenTicketPayload`
- `RpcReopenTicketResponse`

## Validação

```bash
npm run contracts:typecheck
```

## Limites deliberados

- Ainda não existe geração automática a partir do schema do Supabase.
- Ainda não existe pacote compilado para distribuição externa.
- Ainda não existe contrato de knowledge base, engenharia ou storage.
- Qualquer mudança em view ou RPC deve vir acompanhada de atualização deste pacote e de teste.
