"use strict";
/**
 * Who receives a fanned-out notification, as the Functions build sees it.
 *
 * This is a deliberate, self-contained copy of `src/lib/notificationRecipients.ts`
 * -- see the header there for the verdict this decides, and the header on
 * `functions/src/sla.ts` for why this package keeps its own copy rather than
 * importing across the repo root: sharing the browser module directly would mean
 * pointing this package's `rootDir` at the repo root, which moves every emitted
 * path and changes the deploy entrypoint from `lib/index.js` to
 * `lib/functions/src/index.js` -- a restructure of a working build, for one
 * small module.
 *
 * The duplication is guarded instead: `src/lib/notificationRecipients.test.ts`
 * imports both copies and fails if a verdict ever diverges. Two notification
 * paths silently disagreeing about who is a legitimate recipient is exactly the
 * failure this protects against, so if you change one file, change the other
 * and let that test confirm it.
 *
 * Kept free of imports on purpose, so it type-checks identically under this
 * package's tsconfig and the root one.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNotificationRecipient = exports.DELEGATABLE_ON_CALL_ROLES = void 0;
exports.DELEGATABLE_ON_CALL_ROLES = ['consultant', 'specialist', 'resident'];
function isNotificationRecipient(user, userFacilityShiftAssignments, params) {
    var _a, _b;
    if ((_a = params.targetUserIds) === null || _a === void 0 ? void 0 : _a.includes(user.id))
        return true;
    if (user.role === 'owner' || user.role === 'system_admin')
        return true;
    if (!user.facilityId || !params.facilityIds.includes(user.facilityId))
        return false;
    let isDelegatedTarget = false;
    if (((_b = params.targetRoles) === null || _b === void 0 ? void 0 : _b.includes('head_of_department')) && exports.DELEGATABLE_ON_CALL_ROLES.includes(user.role)) {
        const assignment = userFacilityShiftAssignments.find(s => s.assignedUserId === user.id &&
            (!params.departments || params.departments.includes(s.department)));
        if (assignment) {
            isDelegatedTarget = true;
        }
    }
    if (params.targetRoles && !params.targetRoles.includes(user.role) && !isDelegatedTarget)
        return false;
    if (!isDelegatedTarget && params.departments && user.department && !params.departments.includes(user.department))
        return false;
    return true;
}
exports.isNotificationRecipient = isNotificationRecipient;
//# sourceMappingURL=notificationRecipients.js.map