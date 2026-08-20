import { errors } from '@strapi/utils';

const MAX_DISCIPLINES = 12;

// Guard rail, not a security boundary: cap a project at 12 disciplines.
// Strapi 5 sends the relation payload in several shapes — an array of
// ids/documentIds, or an object with connect/disconnect/set lists. Anything
// we do not recognize is allowed through (fail open).

const listLength = (value: unknown): number | null =>
  Array.isArray(value) ? value.length : null;

async function currentCount(where: Record<string, unknown>): Promise<number | null> {
  const entry = await strapi.db.query('api::project.project').findOne({
    where,
    populate: { disciplines: true },
  });
  const related = (entry as { disciplines?: unknown } | null)?.disciplines;
  return Array.isArray(related) ? related.length : null;
}

async function resultingCount(event: any): Promise<number | null> {
  const disciplines = event.params?.data?.disciplines;
  if (disciplines === undefined || disciplines === null) return null; // no change

  // Plain array of ids/documentIds replaces the relation outright.
  const asArray = listLength(disciplines);
  if (asArray !== null) return asArray;

  if (typeof disciplines !== 'object') return null; // unrecognized — allow

  // { set: [...] } also replaces the relation outright.
  const asSet = listLength((disciplines as { set?: unknown }).set);
  if (asSet !== null) return asSet;

  const connect = listLength((disciplines as { connect?: unknown }).connect);
  const disconnect = listLength((disciplines as { disconnect?: unknown }).disconnect) ?? 0;
  if (connect === null) return null; // nothing being added — allow

  // connect/disconnect are deltas: start from what the entry already has.
  let current = 0;
  if (event.params?.where) {
    const counted = await currentCount(event.params.where);
    if (counted !== null) current = counted;
  }
  return current + connect - disconnect;
}

async function enforceDisciplineCap(event: any): Promise<void> {
  const count = await resultingCount(event);
  if (count !== null && count > MAX_DISCIPLINES) {
    throw new errors.ApplicationError('A project can have at most 12 disciplines.');
  }
}

export default {
  beforeCreate: enforceDisciplineCap,
  beforeUpdate: enforceDisciplineCap,
};
