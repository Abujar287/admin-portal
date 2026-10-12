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

  // If order has no agent identifier at all, it cannot match
  if (!oAgentId && !oAgentName) return false;

  // 1. Exact string match (case-insensitive)
  if (oAgentId && (oAgentId === agentUser || (agentName && oAgentId === agentName))) return true;
  if (oAgentName && (oAgentName === agentUser || (agentName && oAgentName === agentName))) return true;

  // 2. Normalized alphanumeric match (removes spaces, dashes, underscores, leading '@')
  const normUser = agentUser.replace(/^@/, '').replace(/[\s_-]+/g, '');
  const normName = agentName.replace(/[\s_-]+/g, '');
  const normId = oAgentId.replace(/^@/, '').replace(/[\s_-]+/g, '');
  const normOName = oAgentName.replace(/[\s_-]+/g, '');

  if (normId && (normId === normUser || (normName && normId === normName))) return true;
  if (normOName && (normOName === normUser || (normName && normOName === normName))) return true;

  // 3. Number-based flexible matching (e.g., '2' <-> 'agent02', 'agent2', '02', 'Agent 2')
  const extractNum = (str: string): number | null => {
    if (!str) return null;
    const m = str.match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  };

  const userNum = extractNum(normUser) ?? (normName ? extractNum(normName) : null);
  const orderIdNum = extractNum(normId);
  const orderNameNum = extractNum(normOName);

  if (userNum !== null) {
    // Both user and order ID contain a number
    if (orderIdNum !== null && userNum === orderIdNum) {
      // Check if both look like agent identifiers (e.g. 'agent02', 'agent2', '2', '02')
      const isAgentOrPureNumber = (s: string) => /^(agent)?0*\d+$/i.test(s);
      if (isAgentOrPureNumber(normUser) || isAgentOrPureNumber(normId)) {
        return true;
      }
      if (normUser === String(userNum) || normId === String(orderIdNum)) {
        return true;
      }
    }

    // Check with order agent name number (e.g. "Agent 2" -> 2)
    if (orderNameNum !== null && userNum === orderNameNum) {
      const isAgentOrPureNumber = (s: string) => /^(agent)?0*\d+$/i.test(s);
      if (isAgentOrPureNumber(normUser) || isAgentOrPureNumber(normOName)) {
        return true;
      }
    }
  }

  // 4. Prefix/suffix variations (e.g. user is '2', order is 'agent2' or 'agent02')
  if (normUser) {
    const candidates = [
      `agent${normUser}`,
      `agent0${normUser}`,
      `agent00${normUser}`,
      `ag${normUser}`,
      `ag0${normUser}`
    ];
    if (candidates.includes(normId) || candidates.includes(normOName)) return true;
  }

  if (normId) {
    const candidates = [
      `agent${normId}`,
      `agent0${normId}`,
      `agent00${normId}`,
      `ag${normId}`,
      `ag0${normId}`
    ];
    if (candidates.includes(normUser) || candidates.includes(normName)) return true;
  }

  return false;
}
