import { AgentUser, OrderItem } from '../types';

/**
 * Checks whether an order is assigned to or belongs to a given agent.
 * Handles exact matches, case-insensitivity, leading '@',
 * and flexible numeric/prefix variations:
 * e.g. agent_id "2" matches "2", "02", "agent2", "agent02", "Agent 2", etc.
 */
export function isOrderAssignedToAgent(
  order?: OrderItem | null,
  agent?: AgentUser | null
): boolean {
  if (!order || !agent) return false;

  const agentUser = String(agent.user || '').trim().toLowerCase();
  const agentName = String(agent.name || '').trim().toLowerCase();

  const oAgentId = String(order.agent_id || (order as any).agentId || '').trim().toLowerCase();
  const oAgentName = String(order.agent_name || (order as any).agentName || '').trim().toLowerCase();

  if (!oAgentId && !oAgentName) return false;

  // 1. Exact matches
  if (oAgentId === agentUser || oAgentName === agentUser) return true;
  if (agentName && (oAgentId === agentName || oAgentName === agentName)) return true;

  // 2. Normalized exact matches (ignoring spaces, underscores, hyphens)
  const normUser = agentUser.replace(/[\s_-]+/g, '');
  const normId = oAgentId.replace(/[\s_-]+/g, '');
  const normName = agentName.replace(/[\s_-]+/g, '');
  const normOName = oAgentName.replace(/[\s_-]+/g, '');

  if (normId && (normId === normUser || normId === normName)) return true;
  if (normOName && (normOName === normName || normOName === normUser)) return true;

  // 3. Special known mapping for Agent 1 / aqn01 / agent01
  const isAgent1Equiv = (u: string, n: string) => {
    return u === '1' || u === '01' || u === 'agent1' || u === 'agent01' || n.includes('aqn01') || n.includes('agent 1');
  };

  const isOrder1Equiv = (id: string, nm: string) => {
    return id === '1' || id === '01' || id === 'agent1' || id === 'agent01' || id.includes('aqn01') ||
           nm === '1' || nm === '01' || nm === 'agent1' || nm === 'agent01' || nm.includes('aqn01');
  };

  if (isAgent1Equiv(agentUser, agentName) && isOrder1Equiv(oAgentId, oAgentName)) {
    return true;
  }

  // 4. Extract digits (e.g. '1' matches '01', 'agent1', 'agent01')
  const extractDigits = (s: string) => {
    const m = s.match(/\d+/);
    return m ? String(parseInt(m[0], 10)) : '';
  };

  const agentDigits = extractDigits(agentUser) || extractDigits(agentName);
  const orderDigits = extractDigits(oAgentId) || extractDigits(oAgentName);

  if (agentDigits && orderDigits && agentDigits === orderDigits) {
    return true;
  }

  // 5. Partial inclusion if names overlap significantly
  if (agentName && (oAgentId.includes(agentName) || oAgentName.includes(agentName))) return true;
  if (agentUser && (oAgentId.includes(agentUser) || oAgentName.includes(agentUser))) return true;

  return false;
}
