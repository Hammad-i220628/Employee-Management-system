import React, { useState, useEffect } from 'react';
import { Department, Section } from '../../types';
import { departmentAPI, sectionAPI } from '../../services/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';

interface SectionFormData {
  name: string;
  dept_id: number;
}

export const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any>(null);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [departmentFormData, setDepartmentFormData] = useState({ name: '' });
  const [sectionFormData, setSectionFormData] = useState<SectionFormData>({ name: '', dept_id: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [depts, sects] = await Promise.all([
        departmentAPI.getAll(),
        sectionAPI.getAll()
      ]);

      setDepartments(depts);
      setSections(sects);
    } catch (error: any) {
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Department handlers
  const handleAddDepartment = () => {
    setEditingDepartment(null);
    setDepartmentFormData({ name: '' });
    setShowDepartmentModal(true);
  };

  const handleEditDepartment = (department: any) => {
    setEditingDepartment(department);
    setDepartmentFormData({ name: department.name });
    setShowDepartmentModal(true);
  };

  const handleDeleteDepartment = async (departmentId: number) => {
    if (!window.confirm('Are you sure you want to delete this department?')) {
      return;
    }

    try {
      await departmentAPI.delete(departmentId);
      await loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to delete department');
    }
  };

  const handleDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editingDepartment) {
        await departmentAPI.update(editingDepartment.dept_id, { name: departmentFormData.name });
      } else {
        await departmentAPI.create({ name: departmentFormData.name });
      }
      
      await loadData();
      setShowDepartmentModal(false);
      setEditingDepartment(null);
      setDepartmentFormData({ name: '' });
    } catch (error: any) {
      setError(error.message || 'Failed to save department');
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDepartmentFormData(prev => ({ ...prev, [name]: value }));
  };

  // Section handlers
  const handleAddSection = (departmentId: number) => {
    setEditingSection(null);
    setSectionFormData({ name: '', dept_id: departmentId });
    setShowSectionModal(true);
  };

  const handleEditSection = (section: any) => {
    setEditingSection(section);
    setSectionFormData({ name: section.name, dept_id: section.dept_id || 0 });
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
        await sectionAPI.update(editingSection.section_id, { 
          name: sectionFormData.name, 
          dept_id: sectionFormData.dept_id 
        });
      } else {
        await sectionAPI.create({ 
          name: sectionFormData.name, 
          dept_id: sectionFormData.dept_id 
        });
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

  // Helper function to get sections for a specific department
  const getSectionsForDepartment = (departmentId: number) => {
    // Filter sections that belong to this specific department
    return sections.filter(section => section.dept_id === departmentId);
  };

  if (loading && departments.length === 0) {
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
        <h2 className="text-xl font-semibold text-gray-900">Departments</h2>
        <Button onClick={handleAddDepartment}>
          Add Department
        </Button>
      </div>

      {/* Departments Cards View */}
      {departments.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((department) => {
            const departmentSections = getSectionsForDepartment(department.dept_id);
            return (
              <Card key={department.dept_id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      department.name === 'IT Department' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <h3 className="font-semibold text-gray-900 text-lg">{department.name}</h3>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditDepartment(department)}
                      className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 border border-blue-600 rounded hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteDepartment(department.dept_id)}
                      className="text-red-600 hover:text-red-800 text-sm px-2 py-1 border border-red-600 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-900">Sections</h4>
                    <Button
                      size="sm"
                      onClick={() => handleAddSection(department.dept_id)}
                    >
                      Add Section
                    </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {departmentSections.map((section) => (
                      <div key={section.section_id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                        <span className="text-gray-700">{section.name}</span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEditSection(section)}
                            className="text-blue-600 hover:text-blue-800 text-xs px-1 py-0.5"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSection(section.section_id)}
                            className="text-red-600 hover:text-red-800 text-xs px-1 py-0.5"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {departmentSections.length === 0 && (
                      <p className="text-xs text-gray-500 italic">No sections found. Add a section to get started.</p>
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
            <p className="text-gray-500 text-lg">No departments found</p>
            <p className="text-gray-400 mt-2">Add your first department to get started</p>
          </div>
        )
      )}

      {/* Department Modal */}
      <Modal
        isOpen={showDepartmentModal}
        onClose={() => setShowDepartmentModal(false)}
        title={`${editingDepartment ? 'Edit' : 'Add'} Department`}
      >
        <form onSubmit={handleDepartmentSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Department Name
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              value={departmentFormData.name}
              onChange={handleDepartmentChange}
              required
              placeholder="Enter department name"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDepartmentModal(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Saving...' : (editingDepartment ? 'Update' : 'Add')}
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
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Section Name
            </label>
            <Input
              id="title"
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

