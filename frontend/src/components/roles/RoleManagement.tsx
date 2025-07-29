import React, { useState, useEffect } from 'react';
import { Designation, Role } from '../../types';
import { designationAPI, roleAPI } from '../../services/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';

interface DesignationFormData {
  title: string;
  role_id: number;
}

export const RoleManagement: React.FC = () => {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [editingDesignation, setEditingDesignation] = useState<any>(null);
  const [roleFormData, setRoleFormData] = useState({ name: '' });
  const [designationFormData, setDesignationFormData] = useState<DesignationFormData>({ title: '', role_id: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [desigs, rols] = await Promise.all([
        designationAPI.getAll(),
        roleAPI.getAll()
      ]);

      setDesignations(desigs);
      setRoles(rols);
    } catch (error: any) {
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Role handlers
  const handleAddRole = () => {
    setEditingRole(null);
    setRoleFormData({ name: '' });
    setShowRoleModal(true);
  };

  const handleEditRole = (role: any) => {
    setEditingRole(role);
    setRoleFormData({ name: role.name });
    setShowRoleModal(true);
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!window.confirm('Are you sure you want to delete this role?')) {
      return;
    }

    try {
      await roleAPI.delete(roleId);
      await loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to delete role');
    }
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editingRole) {
        await roleAPI.update(editingRole.role_id, { name: roleFormData.name });
      } else {
        await roleAPI.create({ name: roleFormData.name });
      }
      
      await loadData();
      setShowRoleModal(false);
      setEditingRole(null);
      setRoleFormData({ name: '' });
    } catch (error: any) {
      setError(error.message || 'Failed to save role');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRoleFormData(prev => ({ ...prev, [name]: value }));
  };

  // Designation handlers
  const handleAddDesignation = (roleId: number) => {
    setEditingDesignation(null);
    setDesignationFormData({ title: '', role_id: roleId });
    setShowDesignationModal(true);
  };

  const handleEditDesignation = (designation: any) => {
    setEditingDesignation(designation);
    setDesignationFormData({ title: designation.title, role_id: designation.role_id || 0 });
    setShowDesignationModal(true);
  };

  const handleDeleteDesignation = async (designationId: number) => {
    if (!window.confirm('Are you sure you want to delete this designation?')) {
      return;
    }

    try {
      await designationAPI.delete(designationId);
      await loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to delete designation');
    }
  };

  const handleDesignationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editingDesignation) {
        await designationAPI.update(editingDesignation.desig_id, { 
          title: designationFormData.title, 
          role_id: designationFormData.role_id 
        });
      } else {
        await designationAPI.create({ 
          title: designationFormData.title, 
          role_id: designationFormData.role_id 
        });
      }
      
      await loadData();
      setShowDesignationModal(false);
      setEditingDesignation(null);
      setDesignationFormData({ title: '', role_id: 0 });
    } catch (error: any) {
      setError(error.message || 'Failed to save designation');
    } finally {
      setLoading(false);
    }
  };

  const handleDesignationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDesignationFormData(prev => ({ ...prev, [name]: value }));
  };

  // Helper function to get designations for a specific role
  const getDesignationsForRole = (roleId: number) => {
    // Filter designations that belong to this specific role
    return designations.filter(designation => designation.role_id === roleId);
  };

  if (loading && roles.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Roles</h2>
        <Button onClick={handleAddRole}>
          Add Role
        </Button>
      </div>

      {/* Roles Cards View */}
      {roles.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const roleDesignations = getDesignationsForRole(role.role_id);
            return (
              <Card key={role.role_id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      role.name === 'HR' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <h3 className="font-semibold text-gray-900 text-lg">{role.name}</h3>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditRole(role)}
                      className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 border border-blue-600 rounded hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role.role_id)}
                      className="text-red-600 hover:text-red-800 text-sm px-2 py-1 border border-red-600 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-900">Designations</h4>
                    <Button
                      size="sm"
                      onClick={() => handleAddDesignation(role.role_id)}
                    >
                      Add Designation
                    </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {roleDesignations.map((designation) => (
                      <div key={designation.desig_id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                        <span className="text-gray-700">{designation.title}</span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEditDesignation(designation)}
                            className="text-blue-600 hover:text-blue-800 text-xs px-1 py-0.5"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteDesignation(designation.desig_id)}
                            className="text-red-600 hover:text-red-800 text-xs px-1 py-0.5"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {roleDesignations.length === 0 && (
                      <p className="text-xs text-gray-500 italic">No designations found. Add a designation to get started.</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No roles found</p>
            <p className="text-gray-400 mt-2">Add your first role to get started</p>
          </div>
        )
      )}

      {/* Role Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title={`${editingRole ? 'Edit' : 'Add'} Role`}
      >
        <form onSubmit={handleRoleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Role Name
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              value={roleFormData.name}
              onChange={handleRoleChange}
              required
              placeholder="Enter role name"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRoleModal(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Saving...' : (editingRole ? 'Update' : 'Add')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Designation Modal */}
      <Modal
        isOpen={showDesignationModal}
        onClose={() => setShowDesignationModal(false)}
        title={`${editingDesignation ? 'Edit' : 'Add'} Designation`}
      >
        <form onSubmit={handleDesignationSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Designation Title
            </label>
            <Input
              id="title"
              name="title"
              type="text"
              value={designationFormData.title}
              onChange={handleDesignationChange}
              required
              placeholder="Enter designation title"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDesignationModal(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Saving...' : (editingDesignation ? 'Update' : 'Add')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
