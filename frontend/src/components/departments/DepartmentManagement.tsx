import React, { useState, useEffect } from 'react';
import { Department, Section, Designation, Role } from '../../types';
import { departmentAPI, sectionAPI, designationAPI, roleAPI } from '../../services/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';

type ManagementType = 'departments' | 'sections' | 'designations' | 'roles';

interface FormData {
  name?: string;
  title?: string;
  dept_id?: number;
}

export const DepartmentManagement: React.FC = () => {
  // Remove tabs for Sections, Designations, and Roles
  // Only show Departments
  const tabs = [
    { key: 'departments', label: 'Departments' }
  ];
  const [activeTab, setActiveTab] = useState('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [depts, sects, desigs, rols] = await Promise.all([
        departmentAPI.getAll(),
        sectionAPI.getAll(),
        designationAPI.getAll(),
        roleAPI.getAll()
      ]);

      setDepartments(depts);
      setSections(sects);
      setDesignations(desigs);
      setRoles(rols);
    } catch (error: any) {
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({});
    setShowModal(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name || item.title,
      dept_id: item.dept_id
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      switch (activeTab) {
        case 'departments':
          await departmentAPI.delete(id);
          break;
        case 'sections':
          await sectionAPI.delete(id);
          break;
        case 'designations':
          await designationAPI.delete(id);
          break;
        case 'roles':
          await roleAPI.delete(id);
          break;
      }
      await loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to delete item');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      switch (activeTab) {
        case 'departments':
          if (editingItem) {
            await departmentAPI.update(editingItem.dept_id, { name: formData.name! });
          } else {
            await departmentAPI.create({ name: formData.name! });
          }
          break;
        case 'sections':
          if (editingItem) {
            await sectionAPI.update(editingItem.section_id, { 
              name: formData.name!, 
              dept_id: formData.dept_id! 
            });
          } else {
            await sectionAPI.create({ 
              name: formData.name!, 
              dept_id: formData.dept_id! 
            });
          }
          break;
        case 'designations':
          if (editingItem) {
            await designationAPI.update(editingItem.desig_id, { title: formData.title! });
          } else {
            await designationAPI.create({ title: formData.title! });
          }
          break;
        case 'roles':
          if (editingItem) {
            await roleAPI.update(editingItem.role_id, { name: formData.name! });
          } else {
            await roleAPI.create({ name: formData.name! });
          }
          break;
      }
      
      await loadData();
      setShowModal(false);
      setEditingItem(null);
      setFormData({});
    } catch (error: any) {
      setError(error.message || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'dept_id' ? parseInt(value) : value
    }));
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'departments':
        return departments;
      case 'sections':
        return sections;
      case 'designations':
        return designations;
      case 'roles':
        return roles;
      default:
        return [];
    }
  };

  const getItemId = (item: any) => {
    switch (activeTab) {
      case 'departments':
        return item.dept_id;
      case 'sections':
        return item.section_id;
      case 'designations':
        return item.desig_id;
      case 'roles':
        return item.role_id;
      default:
        return 0;
    }
  };

  const getItemName = (item: any) => {
    return item.name || item.title || '';
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'departments':
        return 'Departments';
      case 'sections':
        return 'Sections';
      case 'designations':
        return 'Designations';
      case 'roles':
        return 'Roles';
      default:
        return '';
    }
  };

  if (loading && getCurrentData().length === 0) {
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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Departments with Sections (Hardcoded) */}
      {activeTab === 'departments' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="p-4">
            <div>
              <h3 className="font-semibold text-gray-900">HR (Human Resources)</h3>
              <ul className="ml-4 mt-2 list-disc text-gray-700 text-sm">
                <li>Recruitment</li>
                <li>Employee Relations</li>
              </ul>
            </div>
          </Card>
          <Card className="p-4">
            <div>
              <h3 className="font-semibold text-gray-900">IT (Information Technology)</h3>
              <ul className="ml-4 mt-2 list-disc text-gray-700 text-sm">
                <li>Software Development</li>
                <li>IT Support</li>
              </ul>
            </div>
          </Card>
          <Card className="p-4">
            <div>
              <h3 className="font-semibold text-gray-900">Finance</h3>
              <ul className="ml-4 mt-2 list-disc text-gray-700 text-sm">
                <li>Accounts Payable</li>
                <li>Budgeting & Planning</li>
              </ul>
            </div>
          </Card>
        </div>
      )}

      {getCurrentData().length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No {activeTab} found</p>
          <p className="text-gray-400 mt-2">Add your first {activeTab.slice(0, -1)} to get started</p>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`${editingItem ? 'Edit' : 'Add'} ${getTabTitle().slice(0, -1)}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'sections' && (
            <div>
              <label htmlFor="dept_id" className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <Select
                id="dept_id"
                name="dept_id"
                value={formData.dept_id || ''}
                onChange={handleChange}
                required
                options={[
                  { value: '', label: 'Select Department' },
                  ...departments.map(dept => ({ value: dept.dept_id, label: dept.name }))
                ]}
              />
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              {activeTab === 'designations' ? 'Title' : 'Name'}
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name || formData.title || ''}
              onChange={handleChange}
              required
              placeholder={`Enter ${activeTab === 'designations' ? 'title' : 'name'}`}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Saving...' : (editingItem ? 'Update' : 'Add')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};