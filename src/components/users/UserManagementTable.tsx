import React from 'react';
import { User, Role, Facility } from '../../types';

interface UserManagementTableProps {
  verifiedUsers: User[];
  facilities: Facility[];
  currentUser: User;
  isGlobalAdmin: boolean;
  updateUserRole: (id: string, role: Role, department?: string, facilityId?: string) => void;
}

export const UserManagementTable: React.FC<UserManagementTableProps> = ({
  verifiedUsers,
  facilities,
  currentUser,
  isGlobalAdmin,
  updateUserRole
}) => {

  const handleRoleChange = (u: User, newRole: Role) => {
    let newFacilityId = u.facilityId;
    let newDepartment = u.department;

    if (newRole === 'owner') {
      newFacilityId = undefined;
      newDepartment = undefined;
    } else if (newRole === 'system_admin') {
      newFacilityId = 'branch';
      newDepartment = undefined;
    } else if (newRole === 'hospital_manager' || newRole === 'deputy_manager' || newRole === 'medical_director') {
      newDepartment = undefined;
    }

    updateUserRole(u.id, newRole, newDepartment, newFacilityId);
  };

  const handleFacilityChange = (u: User, newFacilityId: string) => {
    // If facility changes, the old department might not exist in the new facility.
    updateUserRole(u.id, u.role, undefined, newFacilityId);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="px-4 py-3">Name / Email</th>
            <th className="px-4 py-3">Facility</th>
            <th className="px-4 py-3">Current Role</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {verifiedUsers.map(u => (
            <tr key={u.id} className="hover:bg-slate-50 dark:bg-slate-950">
              <td className="px-4 py-3">
                <p className="font-bold text-slate-900 dark:text-slate-100">{u.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
              </td>
              <td className="px-4 py-3">
                {u.role === 'owner' ? (
                  <span className="text-slate-400 text-xs italic">N/A</span>
                ) : u.role === 'system_admin' ? (
                  <span className="text-slate-700 dark:text-slate-300 text-xs font-medium">Branch</span>
                ) : (
                  <select 
                    className="text-xs border border-slate-300 rounded p-1 bg-white dark:bg-slate-900 outline-none max-w-[150px] truncate"
                    value={u.facilityId || ''}
                    disabled={!isGlobalAdmin && currentUser.role !== 'hospital_manager'}
                    onChange={(e) => handleFacilityChange(u, e.target.value)}
                  >
                    <option value="" disabled>Select Facility...</option>
                    {facilities.filter(f => f.id !== 'branch').map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                )}
              </td>
              <td className="px-4 py-3">
                  <select 
                    className="text-xs border border-slate-300 rounded p-1 bg-white dark:bg-slate-900 outline-none"
                    value={u.role}
                    disabled={currentUser.role !== 'owner' && u.role === 'owner'}
                    onChange={(e) => handleRoleChange(u, e.target.value as Role)}
                  >
                    <option value="consultant">Consultant</option>
                    <option value="specialist">Specialist</option>
                    <option value="resident">Resident</option>
                    <option value="nurse">Nurse</option>
                    <option value="nursing_supervisor">Nursing Supervisor</option>
                    <option value="er_official">ER Room Official</option>
                    {!['head_of_department'].includes(currentUser.role) && (
                      <>
                        <option value="head_of_department">Head of Department</option>
                        <option value="hospital_manager">Hospital Manager</option>
                        <option value="deputy_manager">Deputy Manager</option>
                        <option value="medical_director">Medical Director</option>
                      </>
                    )}
                    {(currentUser.role === 'owner' || currentUser.role === 'system_admin') && (
                      <option value="system_admin">System Admin</option>
                    )}
                    {u.role === 'owner' && (
                      <option value="owner">Owner</option>
                    )}
                  </select>
              </td>
              <td className="px-4 py-3">
                  {['consultant', 'specialist', 'resident', 'head_of_department', 'nurse', 'nursing_supervisor'].includes(u.role) ? (
                    <select 
                      className="text-xs border border-slate-300 rounded p-1 bg-white dark:bg-slate-900 outline-none"
                      value={u.department || ''}
                      onChange={(e) => updateUserRole(u.id, u.role, e.target.value, u.facilityId)}
                    >
                      <option value="" disabled>Select Department...</option>
                      {(facilities.find(f => f.id === u.facilityId)?.departments || []).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-slate-400 text-xs italic">N/A</span>
                  )}
              </td>
              <td className="px-4 py-3 text-right">
                  <span className="text-[10px] text-slate-400">Auto-saved</span>
              </td>
            </tr>
          ))}
          {verifiedUsers.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No other staff members found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
