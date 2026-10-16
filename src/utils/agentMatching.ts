import { AgentUser, OrderItem } from '../types';

/**
 * Checks whether an order is assigned to or belongs to a given agent.
 *
 * Rules:
 * 1. If agent has orderScope === 'all_orders', all orders are visible.
 * 2. Otherwise, performs a STRICT EXACT MATCH against the agent's user_id:
 *    - Strict exact string match (case-insensitive, trimmed)
 *    - Strict numeric equality (e.g. "02" matches "2", but strictly NOT "21", "12", "20", etc.)
 *    - Order with agent_id = 1 will NEVER match logged in user 2, even if they have similar names.
 *    - Substring matching (.includes) is completely disallowed.
 *    - Only if order has no agent_id at all: check if agent_name strictly equals agent.user.
 */
export function isOrderAssignedToAgent(
  order?: OrderItem | null,
  agent?: AgentUser | null
): boolean {
  if (!order || !agent) return false;

  // 1. If agent's permission explicitly grants visibility to all orders
  if (agent.permissions?.orderScope === 'all_orders') {
    return true;
  }

  const rawAgentUser = String(agent.user || '').trim().toLowerCase();
  if (!rawAgentUser) return false;

  const rawOrderId = String(order.agent_id ?? (order as any).agentId ?? '').trim().toLowerCase();

  // 2. If the order has an agent_id, it MUST strictly match the logged-in agent's user ID
  if (rawOrderId) {
    // Strict exact string match on user ID
    if (rawOrderId === rawAgentUser) return true;

    // Strict numeric equality (e.g. '02' === '2', but strictly NOT '21' === '2' or '22' === '2')
    const isAgentInt = /^\d+$/.test(rawAgentUser);
    const isOrderInt = /^\d+$/.test(rawOrderId);
    if (isAgentInt && isOrderInt) {
      return parseInt(rawOrderId, 10) === parseInt(rawAgentUser, 10);
    }

    // If order has an agent_id and it did not match, it belongs to another agent!
    return false;
  }

  // 3. Fallback ONLY if order has NO agent_id: match on exact agent_name equalling agent's user ID or exact agent.name
  const rawOrderName = String(order.agent_name ?? (order as any).agentName ?? '').trim().toLowerCase();
  const rawAgentName = String(agent.name || '').trim().toLowerCase();
  if (rawOrderName) {
    if (rawOrderName === rawAgentUser) return true;
    if (rawAgentName && rawOrderName === rawAgentName) return true;
  }

  return false;
}


