import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { User, Role } from '../types';
import { Badge } from '../components/ui/Badge';
import { CheckCircle, XCircle, Plus, Trash2, UserPlus } from 'lucide-react';
import { UserManagementTable } from '../components/users/UserManagementTable';

export const FacilitySettingsPage: React.FC = () => {
  const { user, activeFacilityId } = useAuth();
  const { facilities, users, updateUserVerified, updateUserRole, addFacilityDepartment, removeFacilityDepartment } = useData();
  
  const [newDepartment, setNewDepartment] = useState('');

  const hasAccess = user && ['hospital_manager', 'deputy_manager', 'medical_director', 'owner', 'system_admin', 'head_of_department'].includes(user.role);
  if (!hasAccess) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Access Denied. Leadership privileges required.</div>;
  }

  const isGlobalAdmin = user.role === 'owner' || user.role === 'system_admin';
  const currentFacilityId = isGlobalAdmin ? activeFacilityId : user.facilityId;
  const facility = facilities.find(f => f.id === currentFacilityId);
  
  if (!facility && !isGlobalAdmin) return null;

  let facilityUsers = isGlobalAdmin ? users : users.filter(u => u.facilityId === facility?.id);
  if (user.role === 'head_of_department') {
    facilityUsers = facilityUsers.filter(u => u.department === user.department);
  }
  
  const unverifiedUsers = facilityUsers.filter(u => u.verified === false);
  const verifiedUsers = facilityUsers.filter(u => u.verified !== false && u.id !== user.id);

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (facility && newDepartment.trim() && !facility.departments.includes(newDepartment.trim())) {
      addFacilityDepartment(facility.id, newDepartment.trim());
      setNewDepartment('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{isGlobalAdmin ? 'Global User Management' : 'Facility Settings'}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {isGlobalAdmin ? 'Manage staff roles and verify all users across the network.' : `Manage departments, staff roles, and verify new users for ${facility?.name}.`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Departments Management */}
        {facility && !['head_of_department'].includes(user.role) && (
        <Card className="border border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Medical Departments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAddDepartment} className="flex gap-2">
              <input
                type="text"
                placeholder="New Department Name"
                value={newDepartment}
                onChange={e => setNewDepartment(e.target.value)}
                className="flex-1 rounded border border-slate-300 p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <Button type="submit" disabled={!newDepartment.trim()}>
                <Plus className="w-4 h-4 mr-2" /> Add
              </Button>
            </form>
            <div className="space-y-2">
              {facility.departments.map(dept => (
                <div key={dept} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{dept}</span>
                  <Button 
                    variant="ghost" 
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    onClick={() => removeFacilityDepartment(facility.id, dept)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {facility.departments.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No departments configured.</p>
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {/* User Verification */}
        <Card className="border border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Pending Verifications
              {unverifiedUsers.length > 0 && (
                <Badge variant="danger">{unverifiedUsers.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unverifiedUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                All facility users are verified.
              </div>
            ) : (
              <div className="space-y-3">
                {unverifiedUsers.map(u => (
                  <div key={u.id} className="p-3 bg-amber-50 rounded border border-amber-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{u.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                      <div className="mt-1 flex gap-2">
                         <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded uppercase font-bold text-slate-600">{u.role.replace('_', ' ')}</span>
                         {u.department && <span className="text-[10px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-700">{u.department}</span>}
                      </div>
                    </div>
                    <Button onClick={() => updateUserVerified(u.id, true)} className="bg-green-600 hover:bg-green-700 text-xs py-1 h-8">
                       Verify
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Staff Role Management */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Staff Role Management</CardTitle>
        </CardHeader>
        <CardContent>
          <UserManagementTable 
            verifiedUsers={verifiedUsers} 
            facilities={facilities} 
            currentUser={user} 
            isGlobalAdmin={isGlobalAdmin} 
            updateUserRole={updateUserRole} 
          />
        </CardContent>
      </Card>
    </div>
  );
};
