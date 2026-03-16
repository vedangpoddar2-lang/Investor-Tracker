// LocalStorage-backed data store for investors, interactions, and to-dos.

const KEYS = {
  investors: 'ir_investors',
  interactions: 'ir_interactions',
  todos: 'ir_todos',
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function write(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Investors ──

export const STAGES = [
  'First Reach',
  'Follow-up',
  'NDA',
  'Diligence',
  'Passed',
  'Committed',
];

export const ENTITIES = ['Apex', 'FluidCore', 'Both'];

export const INVESTOR_TYPES = ['VC', 'PE', 'Family Office', 'Angel', 'Corporate', 'Other'];

export function getInvestors() {
  return read(KEYS.investors);
}

export function getInvestor(id) {
  return read(KEYS.investors).find((i) => i.id === id) || null;
}

export function addInvestor(data) {
  const investors = read(KEYS.investors);
  const investor = {
    id: generateId(),
    name: data.name || '',
    fund: data.fund || '',
    entity: data.entity || 'Apex',
    stage: data.stage || 'First Reach',
    ndaSigned: data.ndaSigned || false,
    infoShared: data.infoShared || false,
    tags: data.tags || [],
    investorType: data.investorType || '',
    checkSize: data.checkSize || '',
    introSource: data.introSource || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  investors.push(investor);
  write(KEYS.investors, investors);
  return investor;
}

export function updateInvestor(id, updates) {
  const investors = read(KEYS.investors);
  const idx = investors.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  investors[idx] = { ...investors[idx], ...updates, updatedAt: new Date().toISOString() };
  write(KEYS.investors, investors);
  return investors[idx];
}

export function deleteInvestor(id) {
  const investors = read(KEYS.investors).filter((i) => i.id !== id);
  write(KEYS.investors, investors);
  // Also delete related interactions and todos
  const interactions = read(KEYS.interactions).filter((i) => i.investorId !== id);
  write(KEYS.interactions, interactions);
  const todos = read(KEYS.todos).filter((t) => t.investorId !== id);
  write(KEYS.todos, todos);
}

// ── Interactions (meetings, calls, emails) ──

export function getInteractions(investorId) {
  return read(KEYS.interactions)
    .filter((i) => i.investorId === investorId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getAllInteractions() {
  return read(KEYS.interactions);
}

export function addInteraction(investorId, data) {
  const interactions = read(KEYS.interactions);
  const interaction = {
    id: generateId(),
    investorId,
    date: data.date || new Date().toISOString().split('T')[0],
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
  };
  interactions.push(interaction);
  write(KEYS.interactions, interactions);
  // Update investor's updatedAt
  updateInvestor(investorId, {});
  return interaction;
}

export function deleteInteraction(id) {
  const interactions = read(KEYS.interactions).filter((i) => i.id !== id);
  write(KEYS.interactions, interactions);
}

// ── To-dos ──

export function getTodos(investorId) {
  return read(KEYS.todos)
    .filter((t) => t.investorId === investorId)
    .sort((a, b) => new Date(a.dueDate || '9999') - new Date(b.dueDate || '9999'));
}

export function getAllTodos() {
  return read(KEYS.todos).sort(
    (a, b) => new Date(a.dueDate || '9999') - new Date(b.dueDate || '9999')
  );
}

export function addTodo(investorId, data) {
  const todos = read(KEYS.todos);
  const todo = {
    id: generateId(),
    investorId,
    text: data.text || '',
    done: false,
    dueDate: data.dueDate || '',
    createdAt: new Date().toISOString(),
  };
  todos.push(todo);
  write(KEYS.todos, todos);
  return todo;
}

export function updateTodo(id, updates) {
  const todos = read(KEYS.todos);
  const idx = todos.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  todos[idx] = { ...todos[idx], ...updates };
  write(KEYS.todos, todos);
  return todos[idx];
}

export function deleteTodo(id) {
  const todos = read(KEYS.todos).filter((t) => t.id !== id);
  write(KEYS.todos, todos);
}

// ── Tags ──

export function getAllTags() {
  const investors = read(KEYS.investors);
  const tagSet = new Set();
  investors.forEach((inv) => (inv.tags || []).forEach((t) => tagSet.add(t)));
  return [...tagSet].sort();
}

// ── Staleness helper ──

export function getDaysSinceContact(investorId) {
  const interactions = getInteractions(investorId);
  if (interactions.length === 0) {
    const investor = getInvestor(investorId);
    if (!investor) return 999;
    return Math.floor((Date.now() - new Date(investor.createdAt)) / 86400000);
  }
  const latest = interactions[0].date;
  return Math.floor((Date.now() - new Date(latest)) / 86400000);
}

// ── Stats ──

export function getStats() {
  const investors = getInvestors();
  const todos = getAllTodos();
  const today = new Date().toISOString().split('T')[0];

  return {
    total: investors.length,
    active: investors.filter((i) => !['Passed', 'Committed'].includes(i.stage)).length,
    ndaSigned: investors.filter((i) => i.ndaSigned).length,
    infoShared: investors.filter((i) => i.infoShared).length,
    overdueTodos: todos.filter((t) => !t.done && t.dueDate && t.dueDate < today).length,
    funnel: STAGES.reduce((acc, stage) => {
      acc[stage] = investors.filter((i) => i.stage === stage).length;
      return acc;
    }, {}),
  };
}
