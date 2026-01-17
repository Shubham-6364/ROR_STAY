import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

// UI dropdown sources
const UI_PROPERTY_TYPES = ['Flat', 'Apartment', 'Condo'];
const UI_SIZES = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK'];
const UI_RESTRICTIONS = ['Only Boys', 'Only Girls', 'Family', 'Working Professionals', 'Students'];
const UI_STATUSES = ['Available', 'Not Available', 'off_market'];

// Mapping from UI -> backend enum values
const mapPropertyTypeToBackend = (val) => {
  const v = (val || '').toLowerCase();
  if (v === 'flat' || v === 'apartment') return 'apartment';
  if (v === 'condo') return 'condo';
  // safe default
  return 'apartment';
};
const mapStatusToBackend = (val) => {
  const v = (val || '').toLowerCase();
  if (v === 'available') return 'available';
  if (v === 'not available') return 'off_market';
  if (v === 'off_market') return 'off_market';
  return 'available';
};

const bedroomsFromSize = (size) => {
  const m = /^\s*(\d)\s*bhk\s*$/i.exec(size || '');
  if (m) return Number(m[1]);
  return '';
};

export const AdminNewListing = () => {
  const [form, setForm] = useState({
    title: '',
    property_type_ui: 'Apartment',
    size_ui: '',
    restrictions_ui: '',
    status_ui: 'Available',
    price: '',
    bedrooms: '',
    bathrooms: '',
    square_feet: '',
    description: '',
    features: '', // comma-separated
    address: {
      street: '', city: 'Jaipur', state: 'Rajasthan', zip_code: '', country: 'India'
    },
    coordinates: { latitude: '', longitude: '' },
    nearby: '',
    location_text: '',
    // Contact information fields
    contact_phone: '',
    alternative_phone: '',
    contact_email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [delId, setDelId] = useState('');
  const [delLoading, setDelLoading] = useState(false);
  const [delMsg, setDelMsg] = useState('');

  // Image upload state
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');

  // My Listings state
  const [myListings, setMyListings] = useState([]);
  const [myLoading, setMyLoading] = useState(false);
  const [myError, setMyError] = useState('');
  const [confirmId, setConfirmId] = useState('');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const deleteOne = async (id) => {
    if (!id) return;
    if (!token) {
      setMyError('Delete requires admin/agent authentication. Please log in.');
      return;
    }
    try {
      await api.delete(`/properties/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Refresh list after delete
      await fetchMyListings();
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Failed to delete listing.';
      setMyError(String(msg));
    } finally {
      setConfirmId('');
    }
  };

  const fetchMyListings = useCallback(async () => {
    if (!token) return;
    setMyLoading(true);
    setMyError('');
    try {
      const res = await api.get('/properties/my/properties', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyListings(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Failed to load your listings.';
      setMyError(String(msg));
    } finally {
      setMyLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMyListings();
  }, [token, fetchMyListings]);

  const deleteListing = async () => {
    setDelMsg('');
    if (!delId.trim()) {
      setDelMsg('Please enter a Listing ID to delete.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setDelMsg('Delete requires admin/agent authentication. Please log in to obtain a token.');
      return;
    }
    try {
      setDelLoading(true);
      await api.delete(`/properties/${encodeURIComponent(delId.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDelMsg(`Listing ${delId.trim()} deleted successfully.`);
      setDelId('');
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Failed to delete listing.';
      setDelMsg(String(msg));
    } finally {
      setDelLoading(false);
    }
  };
  const onAddressChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, address: { ...prev.address, [name]: value } }));
  };
  const onCoordChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, coordinates: { ...prev.coordinates, [name]: value } }));
  };

  // Image handling functions
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setImageError('');
    
    if (files.length + selectedImages.length > 10) {
      setImageError('Maximum 10 images allowed');
      return;
    }
    
    // Validate file types and sizes
    const validFiles = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setImageError('Only image files are allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        setImageError('Image size must be less than 10MB');
        return;
      }
      validFiles.push(file);
    }
    
    // Create preview URLs
    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9)
    }));
    
    setSelectedImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (imageId) => {
    setSelectedImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      // Clean up preview URLs
      prev.forEach(img => {
        if (img.id === imageId && img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
      return updated;
    });
  };

  const uploadImages = async (propertyId) => {
    if (selectedImages.length === 0) return [];
    
    setImageUploading(true);
    try {
      const formData = new FormData();
      selectedImages.forEach(img => {
        formData.append('files', img.file);
      });
      
      const response = await api.post(`/images/upload/${propertyId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data.images || [];
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error('Failed to upload images');
    } finally {
      setImageUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        title: form.title,
        property_type: mapPropertyTypeToBackend(form.property_type_ui),
        status: mapStatusToBackend(form.status_ui),
        price: Number(form.price),
        bedrooms: form.bedrooms ? Number(form.bedrooms) : (bedroomsFromSize(form.size_ui) || null),
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        square_feet: form.square_feet ? Number(form.square_feet) : null,
        description: form.description || null,
        features: (() => {
          const base = form.features ? form.features.split(',').map(s => s.trim()).filter(Boolean) : [];
          if (form.restrictions_ui) base.push(form.restrictions_ui);
          if (form.nearby) base.push(`Nearby: ${form.nearby}`);
          if (form.location_text) base.push(`Location: ${form.location_text}`);
          return base;
        })(),
        images: [], // Will be updated after image upload
        address: {
          street: form.address.street,
          city: form.address.city,
          state: form.address.state,
          zip_code: form.address.zip_code,
          country: form.address.country || 'United States',
        },
      };
      // Include coordinates if both provided to avoid backend geocode dependency
      if (form.coordinates.latitude && form.coordinates.longitude) {
        payload.coordinates = {
          latitude: Number(form.coordinates.latitude),
          longitude: Number(form.coordinates.longitude),
        };
      }

      const token = localStorage.getItem('token');
      let res;
      if (token) {
        res = await api.post('/properties/', payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        // Use dev-only public create endpoint when unauthenticated
        res = await api.post('/properties/public', payload);
      }
      const created = res.data;
      
      // Upload images if any are selected
      let uploadedImages = [];
      if (selectedImages.length > 0) {
        try {
          uploadedImages = await uploadImages(created.id);
          
          // Update the property with image URLs
          const updatePayload = { images: uploadedImages };
          if (token) {
            await api.put(`/properties/${created.id}`, updatePayload, { 
              headers: { Authorization: `Bearer ${token}` } 
            });
          } else {
            await api.put(`/properties/public/${created.id}`, updatePayload);
          }
        } catch (imageError) {
          console.error('Image upload failed:', imageError);
          setError('Property created but image upload failed. You can add images later by editing the property.');
        }
      }
      
      setSuccess(`Listing created with ID: ${created.id}${uploadedImages.length > 0 ? ` and ${uploadedImages.length} images uploaded` : ''}`);
      
      // Reset form and images
      setForm(prev => ({
        ...prev,
        title: '', price: '', bedrooms: '', bathrooms: '', square_feet: '', description: '', features: '',
        size_ui: '', restrictions_ui: '', nearby: '', location_text: '',
        contact_phone: '', alternative_phone: '', contact_email: ''
      }));
      
      // Clean up image previews
      selectedImages.forEach(img => {
        if (img.preview) URL.revokeObjectURL(img.preview);
      });
      setSelectedImages([]);
      setImageError('');
    } catch (e) {
      let msg = e?.response?.data?.detail || e?.message || 'Failed to create listing.';
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        msg += ' (Authentication required. Please log in as agent/admin or use dev public endpoint.)';
      }
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-10 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">New Listing</h1>
          <div className="space-x-2">
            <Link to="/admin/submissions"><Button variant="outline">Back to Submissions</Button></Link>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Listing Details</CardTitle>
          </CardHeader>
          <CardContent>
            {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
            {success && <div className="mb-4 text-green-700 text-sm">{success}</div>}
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Title</label>
                <Input name="title" value={form.title} onChange={onChange} required />
              </div>

              <div>
                <label className="text-sm font-medium">Property Type</label>
                <Select value={form.property_type_ui} onValueChange={(v) => setForm(p => ({...p, property_type_ui: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {UI_PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Size</label>
                <Select value={form.size_ui} onValueChange={(v) => setForm(p => ({...p, size_ui: v, bedrooms: String(bedroomsFromSize(v) || '')}))}>
                  <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    {UI_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={form.status_ui} onValueChange={(v) => setForm(p => ({...p, status_ui: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {UI_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Price (Rupees)</label>
                <Input name="price" type="number" min="0" value={form.price} onChange={onChange} required />
              </div>
              <div>
                <label className="text-sm font-medium">Bedrooms</label>
                <Input name="bedrooms" type="number" min="0" value={form.bedrooms} onChange={onChange} />
              </div>
              <div>
                <label className="text-sm font-medium">Bathrooms</label>
                <Input name="bathrooms" type="number" step="0.5" min="0" value={form.bathrooms} onChange={onChange} />
              </div>
              <div>
                <label className="text-sm font-medium">Square Feet</label>
                <Input name="square_feet" type="number" min="0" value={form.square_feet} onChange={onChange} />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea name="description" rows={4} value={form.description} onChange={onChange} />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">Restrictions</label>
                <Select value={form.restrictions_ui} onValueChange={(v) => setForm(p => ({...p, restrictions_ui: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select restriction" /></SelectTrigger>
                  <SelectContent>
                    {UI_RESTRICTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">Features (comma separated)</label>
                <Input name="features" value={form.features} onChange={onChange} placeholder="e.g., parking, balcony, gym" />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Images</label>
                  <Badge variant="outline">Disabled (stored on S3)</Badge>
                </div>
                <input type="file" multiple disabled className="mt-2 block w-full text-sm text-slate-500" />
                <div className="text-xs text-slate-500">Image upload is disabled for now. The backend expects S3 URLs in the images array.</div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 font-semibold">Address</div>
                <div>
                  <label className="text-sm font-medium">Street</label>
                  <Input name="street" value={form.address.street} onChange={onAddressChange} required />
                </div>
                <div>
                  <label className="text-sm font-medium">City</label>
                  <Input name="city" value={form.address.city} onChange={onAddressChange} required disabled />
                </div>
                <div>
                  <label className="text-sm font-medium">State</label>
                  <Input name="state" value={form.address.state} onChange={onAddressChange} required disabled />
                </div>
                <div>
                  <label className="text-sm font-medium">Zip Code</label>
                  <Input name="zip_code" value={form.address.zip_code} onChange={onAddressChange} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <Input name="country" value={form.address.country} onChange={onAddressChange} disabled />
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Near by</label>
                  <Input name="nearby" value={form.nearby} onChange={onChange} placeholder="e.g., SKIT College" />
                </div>
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <Input name="location_text" value={form.location_text} onChange={onChange} placeholder="e.g., Jagatpura" />
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 font-semibold">Coordinates (optional)</div>
                <div>
                  <label className="text-sm font-medium">Latitude</label>
                  <Input name="latitude" value={form.coordinates.latitude} onChange={onCoordChange} placeholder="e.g., 19.1334" />
                </div>
                <div>
                  <label className="text-sm font-medium">Longitude</label>
                  <Input name="longitude" value={form.coordinates.longitude} onChange={onCoordChange} placeholder="e.g., 72.9133" />
                </div>
                <div className="md:col-span-2 text-xs text-slate-500">Tip: Provide lat/lng to avoid geocoding dependency in dev.</div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3 font-semibold">Contact Information</div>
                <div>
                  <label className="text-sm font-medium">Contact Phone *</label>
                  <Input name="contact_phone" value={form.contact_phone} onChange={onChange} placeholder="e.g., +91-9876543210" />
                </div>
                <div>
                  <label className="text-sm font-medium">Alternative Phone</label>
                  <Input name="alternative_phone" value={form.alternative_phone} onChange={onChange} placeholder="e.g., +91-9876543211" />
                </div>
                <div>
                  <label className="text-sm font-medium">Contact Email</label>
                  <Input name="contact_email" value={form.contact_email} onChange={onChange} placeholder="e.g., contact@property.com" />
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="md:col-span-2 space-y-4">
                <div className="font-semibold">Property Images (Max 10)</div>
                
                {imageError && (
                  <div className="text-red-600 text-sm">{imageError}</div>
                )}
                
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                    disabled={selectedImages.length >= 10}
                  />
                  <label
                    htmlFor="image-upload"
                    className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
                      selectedImages.length >= 10
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    📷 Select Images ({selectedImages.length}/10)
                  </label>
                  <p className="text-slate-500 text-sm mt-2">
                    Upload up to 10 images (JPG, PNG, WebP, max 10MB each)
                  </p>
                </div>

                {/* Image Previews */}
                {selectedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedImages.map((image) => (
                      <div key={image.id} className="relative group">
                        <img
                          src={image.preview}
                          alt="Preview"
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(image.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2 flex items-center gap-2 mt-2">
                <Button type="submit" disabled={loading || imageUploading}>
                  {loading ? 'Creating Property...' : imageUploading ? 'Uploading Images...' : 'Create Listing'}
                </Button>
                <Link to="/admin/submissions"><Button type="button" variant="outline">Cancel</Button></Link>
                <Link to="/admin/listings"><Button type="button" variant="secondary">Manage Listings</Button></Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* My Listings */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Listings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Your property listings will appear here.</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};