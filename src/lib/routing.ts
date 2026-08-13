import { BedType, Facility, Referral } from '../types';

/**
 * Which facilities can take a referral, and what to do when none can.
 *
 * The second escalation trigger lives here. Where the SLA covers "nobody
 * answered", this covers "there was nobody to answer": no facility in the
 * network offers the departments and bed type the patient needs, or every
 * facility that does is full. Both are top-level escalations -- no amount of
 * chasing the receiving facilities helps, because the capacity does not exist.
 * Only a system administrator can source a bed outside the normal flow.
 *
 * Kept pure and separate from the components so the referral form, the creation
 * path and the periodic sweep all answer the question identically.
 */

export type CapacityEscalationReason = 'no_matching_facility' | 'no_beds_available';

/** Free beds of a given type, floored at zero so bad data cannot read as capacity. */
export function availableBeds(facility: Facility, bedType: BedType): number {
  const bed = facility.capacity?.[bedType];
  if (!bed) return 0;
  const free = (bed.total ?? 0) - (bed.occupied ?? 0);
  return free > 0 ? free : 0;
}

/**
 * A facility matches if it runs every department requested *and* is configured
 * for the bed type at all.
 *
 * The bed-type condition is the part that was missing: a hospital with a
 * Cardiology department but zero ICU beds configured was previously offered as a
 * candidate for an ICU transfer, so the referral sat pending at a facility that
 * could never accept it until the 30-minute timer ran out.
 */
export function facilityMatches(
  facility: Facility,
  departments: string[],
  bedType: BedType
): boolean {
  const hasDepartments = departments.every(d => facility.departments?.includes(d));
  const hasBedType = (facility.capacity?.[bedType]?.total ?? 0) > 0;
  return hasDepartments && hasBedType;
}

export interface CandidateQuery {
  departments: string[];
  bedType: BedType;
  /** The referring facility never routes to itself. */
  excludeFacilityId?: string;
  /** Facilities the patient has already declined (see recordPatientDecline). */
  excludeFacilityIds?: string[];
}

/**
 * Splits the network into facilities that *could* take the patient and those
 * that could take them *right now*.
 *
 * Candidates are the `matching` set, not `withBeds`: a facility that is full at
 * this instant may discharge someone in ten minutes, and removing it from the
 * candidate list would hide the referral from the people best placed to make
 * room. The empty-`withBeds` case drives escalation instead.
 */
export function findCandidateFacilities(
  facilities: Facility[],
  query: CandidateQuery
): { matching: Facility[]; withBeds: Facility[] } {
  const excluded = new Set([
    ...(query.excludeFacilityId ? [query.excludeFacilityId] : []),
    ...(query.excludeFacilityIds ?? []),
  ]);

  const matching = facilities.filter(
    f => !excluded.has(f.id) && facilityMatches(f, query.departments, query.bedType)
  );
  return { matching, withBeds: matching.filter(f => availableBeds(f, query.bedType) > 0) };
}

type CapacityCandidate = Pick<
  Referral,
  'receivingFacilityId' | 'candidateFacilityIds' | 'requiredBedType' | 'patientDeclinedFacilityIds'
>;

/**
 * Why this referral has nowhere to go, or null if it does.
 *
 * Evaluated against the facilities actually attached to the referral rather than
 * the whole network, so a directed referral is judged on its one destination and
 * an auto-routed one on its candidate list.
 *
 * Returns null when the facility documents cannot be resolved at all: that means
 * the caller's facility list has not loaded yet, not that the network is out of
 * beds, and escalating on it would fire a top-level alert on every cold start.
 */
export function capacityEscalationReason(
  referral: CapacityCandidate,
  facilitiesById: Map<string, Facility>,
  { facilitiesLoaded = true }: { facilitiesLoaded?: boolean } = {}
): CapacityEscalationReason | null {
  if (!facilitiesLoaded || facilitiesById.size === 0) return null;

  const declined = new Set(referral.patientDeclinedFacilityIds ?? []);
  const targetIds = (
    referral.receivingFacilityId === 'auto'
      ? referral.candidateFacilityIds ?? []
      : [referral.receivingFacilityId]
  ).filter(id => id && !declined.has(id));

  // No candidate ids at all is the "nothing in the network fits" case: the
  // referral form only produces an empty list when the search found nothing.
  if (targetIds.length === 0) return 'no_matching_facility';

  const targets = targetIds
    .map(id => facilitiesById.get(id))
    .filter((f): f is Facility => Boolean(f));

  // Ids that resolve to nothing mean a stale or deleted facility, which is a
  // routing dead end for this patient just as surely as no match at all.
  if (targets.length === 0) return 'no_matching_facility';

  const anyFree = targets.some(f => availableBeds(f, referral.requiredBedType) > 0);
  return anyFree ? null : 'no_beds_available';
}

/** Human-readable, for notification bodies and the escalation banner. */
export function describeCapacityEscalation(reason: CapacityEscalationReason): string {
  return reason === 'no_matching_facility'
    ? 'No facility in the network provides the required departments and bed type.'
    : 'Every matching facility is at full capacity for the required bed type.';
}
