import React, { useState, useEffect } from 'react';
import { Designation, Role } from '../../types';
import { designationAPI, roleAPI } from '../../services/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Plus, Award, Shield } from 'lucide-react';

export const Settings: React.FC = () => {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'designation' | 'role'>('designation');
  const [formData, setFormData] = useState({ name: '', title: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [desigData, roleData] = await Promise.all([
        designationAPI.getAll(),
        roleAPI.getAll()
      ]);

      setDesignations(desigData);
      setRoles(roleData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDesignation = () => {
    setModalType('designation');
    setFormData({ name: '', title: '' });
    setIsModalOpen(true);
  };

  const handleAddRole = () => {
    setModalType('role');
    setFormData({ name: '', title: '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (modalType === 'designation') {
        await designationAPI.create({ title: formData.title });
        await loadData();
        setIsModalOpen(false);
      } else if (modalType === 'role') {
        await roleAPI.create({ name: formData.name });
        await loadData();
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error saving data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && designations.length === 0 && roles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Roles</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Employee</h3>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="ml-4 mt-2 list-disc text-gray-700 text-sm">
              <li>Software Engineer</li>
              <li>Accounts Executive</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">HR</h3>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="ml-4 mt-2 list-disc text-gray-700 text-sm">
              <li>HR Manager</li>
              <li>Recruitment Officer</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};