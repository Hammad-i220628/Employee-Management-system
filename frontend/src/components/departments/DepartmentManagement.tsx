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
  const tabs = [
    { key: 'departments', label: 'Departments' },
    { key: 'sections', label: 'Sections' },
    { key: 'designations', label: 'Designations' },
    { key: 'roles', label: 'Roles' }
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
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [sectionFormData, setSectionFormData] = useState({ name: '', dept_id: 0 });

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
      name: item.name,
      title: item.title,
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

  // Section management handlers
  const handleAddSection = (departmentId: number) => {
    setEditingSection(null);
    setSectionFormData({ name: '', dept_id: departmentId });
    setShowSectionModal(true);
  };

  const handleEditSection = (section: any) => {
    setEditingSection(section);
    setSectionFormData({ name: section.name, dept_id: section.dept_id });
    setShowSectionModal(true);
  };

  const handleDeleteSection = async (sectionId: number) => {
    if (!window.confirm('Are you sure you want to delete this section?')) {
      return;
    }

    try {
      await sectionAPI.delete(sectionId);
      await loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to delete section');
    }
  };

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editingSection) {
        await sectionAPI.update(editingSection.section_id, sectionFormData);
      } else {
        await sectionAPI.create(sectionFormData);
      }
      
      await loadData();
      setShowSectionModal(false);
      setEditingSection(null);
      setSectionFormData({ name: '', dept_id: 0 });
    } catch (error: any) {
      setError(error.message || 'Failed to save section');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSectionFormData(prev => ({ ...prev, [name]: value }));
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

      {/* Add Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">{getTabTitle()}</h2>
        <Button onClick={handleAdd}>
          Add {getTabTitle().slice(0, -1)}
        </Button>
      </div>

      {/* Dynamic Content */}
      {activeTab === 'departments' && departments.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => {
            const deptSections = sections.filter(section => section.dept_id === dept.dept_id);
            return (
              <Card key={dept.dept_id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(dept)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(dept.dept_id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {deptSections.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Sections:</p>
                    <ul className="ml-4 list-disc text-gray-700 text-sm">
                      {deptSections.map((section) => (
                        <li key={section.section_id}>{section.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Other tabs content */}
      {activeTab !== 'departments' && getCurrentData().length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid gap-4">
              {getCurrentData().map((item: any) => (
                <div key={getItemId(item)} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{getItemName(item)}</h3>
                    {activeTab === 'sections' && item.department_name && (
                      <p className="text-sm text-gray-600">Department: {item.department_name}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 border border-blue-600 rounded hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(getItemId(item))}
                      className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-600 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {getCurrentData().length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No {activeTab} found</p>
          <p className="text-gray-400 mt-2">Add your first {activeTab.slice(0, -1)} to get started</p>
        </div>
      )}

      {/* Main Modal */}
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
            <label htmlFor={activeTab === 'designations' ? 'title' : 'name'} className="block text-sm font-medium text-gray-700 mb-1">
              {activeTab === 'designations' ? 'Title' : 'Name'}
            </label>
            <Input
              id={activeTab === 'designations' ? 'title' : 'name'}
              name={activeTab === 'designations' ? 'title' : 'name'}
              type="text"
              value={activeTab === 'designations' ? (formData.title || '') : (formData.name || '')}
              onChange={handleChange}
              required
              placeholder={`Enter ${activeTab === 'designations' ? 'title' : 'name'}`}
            />
          </div>

          {/* Section Management for Department Edit */}
          {activeTab === 'departments' && editingItem && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-medium text-gray-900">Sections</h4>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleAddSection(editingItem.dept_id)}
                >
                  Add Section
                </Button>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sections.filter(section => section.dept_id === editingItem.dept_id).map((section) => (
                  <div key={section.section_id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{section.name}</span>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEditSection(section)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSection(section.section_id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {sections.filter(section => section.dept_id === editingItem.dept_id).length === 0 && (
                  <p className="text-sm text-gray-500 italic">No sections found. Add a section to get started.</p>
                )}
              </div>
            </div>
          )}

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

      {/* Section Modal */}
      <Modal
        isOpen={showSectionModal}
        onClose={() => setShowSectionModal(false)}
        title={`${editingSection ? 'Edit' : 'Add'} Section`}
      >
        <form onSubmit={handleSectionSubmit} className="space-y-4">
          <div>
            <label htmlFor="sectionName" className="block text-sm font-medium text-gray-700 mb-1">
              Section Name
            </label>
            <Input
              id="sectionName"
              name="name"
              type="text"
              value={sectionFormData.name}
              onChange={handleSectionChange}
              required
              placeholder="Enter section name"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSectionModal(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Saving...' : (editingSection ? 'Update' : 'Add')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};