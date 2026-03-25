import { supabase } from '../lib/supabase';

// ── Base Data ──

export const STAGES = [
  'Not Contacted',
  'Contacted',
  'Intro Call',
  'NDA Shared',
  'Deck Shared',
  'Term Sheet',
  'Closed / Dropped'
];

export const NDA_STATUSES = ['Executed', 'Sent', 'Under Review', 'Not Sent'];

export const FOLLOW_UP_STATUSES = ['Follow Up', 'Pending'];

export const INFO_SHARED_STATUSES = ['Yes', 'No'];

export const ENTITIES = ['Apex', 'FluidCore', 'Both'];

export const INVESTOR_TYPES = ['VC', 'PE', 'Family Office', 'Angel', 'Corporate', 'Other'];

// ── Investors ──

export async function getInvestors() {
  const { data, error } = await supabase
    .from('investors')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching investors:', error);
    return [];
  }
  return data;
}

export async function getInvestor(id) {
  const { data, error } = await supabase
    .from('investors')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('Error fetching investor:', error);
    return null;
  }
  return data;
}

export async function addInvestor(data) {
  const investor = {
    name: data.name || '',
    fund: data.fund || '',
    entity: data.entity || 'Apex',
    stage: data.stage || 'Lead',
    primary_contact: data.primaryContact || '',
    contact_designation: data.contactDesignation || '',
    first_outreach_date: data.firstOutreachDate || null,
    nda_status: data.ndaStatus || '',
    info_shared: data.infoShared || '',
    last_interaction_date: data.lastInteractionDate || null,
    key_discussion_point: data.keyDiscussionPoint || '',
    pending_to_dos: data.pendingToDos || '',
    action_owner: data.actionOwner || '',
    next_follow_up_date: data.nextFollowUpDate || null,
    follow_up_status: data.followUpStatus || '',
    remarks: data.remarks || '',
    tags: data.tags || [],
    investor_type: data.investorType || '',
  };

  const { data: inserted, error } = await supabase
    .from('investors')
    .insert([investor])
    .select()
    .single();

  if (error) {
    console.error('Error adding investor:', error);
    throw error;
  }
  return inserted;
}

export async function updateInvestor(id, updates) {
  // Map camelCase to snake_case for Supabase if necessary
  const mappedUpdates = { ...updates };
  if (updates.primaryContact !== undefined) { mappedUpdates.primary_contact = updates.primaryContact; delete mappedUpdates.primaryContact; }
  if (updates.contactDesignation !== undefined) { mappedUpdates.contact_designation = updates.contactDesignation; delete mappedUpdates.contactDesignation; }
  if (updates.firstOutreachDate !== undefined) { mappedUpdates.first_outreach_date = updates.firstOutreachDate; delete mappedUpdates.firstOutreachDate; }
  if (updates.ndaStatus !== undefined) { mappedUpdates.nda_status = updates.ndaStatus; delete mappedUpdates.ndaStatus; }
  if (updates.infoShared !== undefined) { mappedUpdates.info_shared = updates.infoShared; delete mappedUpdates.infoShared; }
  if (updates.lastInteractionDate !== undefined) { mappedUpdates.last_interaction_date = updates.lastInteractionDate; delete mappedUpdates.lastInteractionDate; }
  if (updates.keyDiscussionPoint !== undefined) { mappedUpdates.key_discussion_point = updates.keyDiscussionPoint; delete mappedUpdates.keyDiscussionPoint; }
  if (updates.pendingToDos !== undefined) { mappedUpdates.pending_to_dos = updates.pendingToDos; delete mappedUpdates.pendingToDos; }
  if (updates.actionOwner !== undefined) { mappedUpdates.action_owner = updates.actionOwner; delete mappedUpdates.actionOwner; }
  if (updates.nextFollowUpDate !== undefined) { mappedUpdates.next_follow_up_date = updates.nextFollowUpDate; delete mappedUpdates.nextFollowUpDate; }
  if (updates.followUpStatus !== undefined) { mappedUpdates.follow_up_status = updates.followUpStatus; delete mappedUpdates.followUpStatus; }
  if (updates.investorType !== undefined) { mappedUpdates.investor_type = updates.investorType; delete mappedUpdates.investorType; }

  mappedUpdates.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from('investors')
    .update(mappedUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating investor:', error);
    throw error;
  }
  return updated;
}

export async function upsertInvestors(investorsArray) {
  const toInsert = investorsArray.filter(d => !d._existingId);
  const toUpdate = investorsArray.filter(d => !!d._existingId);

  const buildPayload = (data, includeId = false) => ({
    ...(includeId ? { id: data._existingId } : {}),
    name: data.name || '',
    fund: data.fund || '',
    entity: data.entity || 'Apex',
    stage: data.stage || 'Not Contacted',
    primary_contact: data.primary_contact || '',
    contact_designation: data.contact_designation || '',
    first_outreach_date: data.first_outreach_date || null,
    nda_status: data.nda_status || '',
    info_shared: data.info_shared || '',
    last_interaction_date: data.last_interaction_date || null,
    key_discussion_point: data.key_discussion_point || '',
    pending_to_dos: data.pending_to_dos || '',
    action_owner: data.action_owner || '',
    next_follow_up_date: data.next_follow_up_date || null,
    follow_up_status: data.follow_up_status || '',
    remarks: data.remarks || '',
    tags: data.tags || [],
    investor_type: data.investor_type || '',
    updated_at: new Date().toISOString(),
  });

  // INSERT new investors (no id sent — Postgres auto-generates UUID)
  if (toInsert.length > 0) {
    const { error } = await supabase
      .from('investors')
      .insert(toInsert.map(d => buildPayload(d, false)));
    if (error) {
      console.error('Error inserting investors:', error);
      return { data: null, error };
    }
  }

  // UPDATE existing investors one by one using their known UUID
  for (const d of toUpdate) {
    const { error } = await supabase
      .from('investors')
      .update(buildPayload(d, false))
      .eq('id', d._existingId);
    if (error) {
      console.error('Error updating investor:', error);
      return { data: null, error };
    }
  }

  return { data: true, error: null };
}

export async function deleteInvestors(ids) {
  if (!ids || ids.length === 0) return;
  const { error } = await supabase
    .from('investors')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Error deleting multiple investors:', error);
    throw error;
  }
}


export async function deleteInvestor(id) {
  const { error } = await supabase
    .from('investors')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting investor:', error);
    throw error;
  }
}

// ── Interactions ──

export async function getInteractions(investorId) {
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('investor_id', investorId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching interactions:', error);
    return [];
  }
  return data;
}

export async function getAllInteractions() {
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching all interactions:', error);
    return [];
  }
  return data;
}

export async function addInteraction(investorId, data) {
  const interaction = {
    investor_id: investorId,
    date: data.date || new Date().toISOString().split('T')[0],
    notes: data.notes || '',
  };

  const { data: inserted, error } = await supabase
    .from('interactions')
    .insert([interaction])
    .select()
    .single();

  if (error) {
    console.error('Error adding interaction:', error);
    throw error;
  }

  // Update investor's updatedAt
  await updateInvestor(investorId, {});

  return inserted;
}

export async function deleteInteraction(id) {
  const { error } = await supabase
    .from('interactions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting interaction:', error);
    throw error;
  }
}

// ── To-dos ──

export async function getTodos(investorId) {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('investor_id', investorId)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching todos:', error);
    return [];
  }
  return data;
}

export async function getAllTodos() {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching all todos:', error);
    return [];
  }
  return data;
}

export async function addTodo(investorId, data) {
  const todo = {
    investor_id: investorId,
    text: data.text || '',
    action_owner: data.actionOwner || '',
    done: false,
    due_date: data.dueDate || null,
  };

  const { data: inserted, error } = await supabase
    .from('todos')
    .insert([todo])
    .select()
    .single();

  if (error) {
    console.error('Error adding todo:', error);
    throw error;
  }
  return inserted;
}

export async function updateTodo(id, updates) {
  const mappedUpdates = { ...updates };
  if (updates.actionOwner !== undefined) { mappedUpdates.action_owner = updates.actionOwner; delete mappedUpdates.actionOwner; }
  if (updates.dueDate !== undefined) { mappedUpdates.due_date = updates.dueDate; delete mappedUpdates.dueDate; }

  const { data: updated, error } = await supabase
    .from('todos')
    .update(mappedUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating todo:', error);
    throw error;
  }
  return updated;
}

export async function deleteTodo(id) {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting todo:', error);
    throw error;
  }
}

// ── Tags ──

export async function getAllTags() {
  const investors = await getInvestors();
  const tagSet = new Set();
  investors.forEach((inv) => (inv.tags || []).forEach((t) => tagSet.add(t)));
  return [...tagSet].sort();
}

// ── Staleness helper ──

export function getDaysSinceContact(investor) {
  if (!investor) return 999;

  // Helper: parse a date string in LOCAL time (not UTC) to avoid timezone offset
  const parseLocalDate = (str) => {
    const s = str.includes('T') ? str : str + 'T00:00:00';
    return new Date(s);
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 1. Prefer explicit field from table inline tracking
  if (investor.last_interaction_date) {
    return Math.round((todayStart - parseLocalDate(investor.last_interaction_date)) / 86400000);
  }

  // 2. Fallback to first_outreach_date tracking
  if (investor.first_outreach_date) {
    return Math.round((todayStart - parseLocalDate(investor.first_outreach_date)) / 86400000);
  }

  // 3. Default baseline fallback
  return Math.round((todayStart - parseLocalDate(investor.created_at)) / 86400000);
}

// ── Stats ──

export async function getStats() {
  const investors = await getInvestors();
  const todos = await getAllTodos();
  const today = new Date().toISOString().split('T')[0];

  return {
    total: investors.length,
    active: investors.filter((i) => !['Passed', 'Hold'].includes(i.stage)).length,
    ndaSigned: investors.filter((i) => i.nda_status === 'Executed').length,
    infoShared: investors.filter((i) => i.info_shared === 'Yes').length,
    overdueTodos: todos.filter((t) => !t.done && t.due_date && t.due_date < today).length,
    funnel: STAGES.reduce((acc, stage) => {
      acc[stage] = investors.filter((i) => i.stage === stage).length;
      return acc;
    }, {}),
  };
}

