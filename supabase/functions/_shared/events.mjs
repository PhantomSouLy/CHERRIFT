// Repository data is treated as untrusted content. Never execute paths or HTML.
export function validateCatalog(input) {
  if (!input || !Array.isArray(input.events) || input.events.length > 200) throw Error('invalid_event_catalog');
  const seen = new Set();
  const text = (v, max) => { if (typeof v !== 'string' || v.length > max) throw Error('invalid_event_text'); return v.trim(); };
  const events = input.events.map(item => {
    if (!item || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) || item.id.length > 80 || seen.has(item.id)) throw Error('invalid_event_id');
    seen.add(item.id);
    if (!['limited','permanent'].includes(item.category)) throw Error('invalid_event_category');
    if (!['content','closed-beta'].includes(item.renderer)) throw Error('unknown_event_renderer');
    const name = text(item.name, 80); if (!name) throw Error('event_name_required');
    if (!Array.isArray(item.sections) || item.sections.length > 20) throw Error('invalid_event_sections');
    return { id:item.id, name, category:item.category, renderer:item.renderer,
      description:text(item.description,1000), sections:item.sections.map(s=>({title:text(s.title,100),body:text(s.body,5000)})) };
  });
  return { version:1, events };
}
export function activeEvents(rows, now=Date.now()) {
  return rows.filter(r=>r.repo_present && r.enabled && (!r.starts_at || Date.parse(r.starts_at)<=now) && (!r.ends_at || Date.parse(r.ends_at)>now))
    .sort((a,b)=>a.position-b.position || a.id.localeCompare(b.id));
}
