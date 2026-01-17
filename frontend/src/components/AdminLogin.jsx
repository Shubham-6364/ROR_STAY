import React, { useState } from 'react';
import { api } from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export const AdminLogin = ({ isOpen, onClose, onLoginSuccess }) => {
  const [credentials, setCredentials] = useState({
    email: 'admin@rorstay.com',
    password: 'admin123'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', credentials);
      const { access_token } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('token', access_token);
      
      // Call success callback
      if (onLoginSuccess) {
        onLoginSuccess(access_token);
      }
      
      // Close modal
      onClose();
    } catch (err) {
      console.error('Login error:', err);
      const message = err?.response?.data?.detail || err?.message || 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Admin Login Required</DialogTitle>
        </DialogHeader>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 text-red-600 bg-red-50 border border-red-200 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  name="email"
                  value={credentials.email}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">Default Admin Credentials:</div>
                <div>Email: admin@rorstay.com</div>
                <div>Password: admin123</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default AdminLogin;
