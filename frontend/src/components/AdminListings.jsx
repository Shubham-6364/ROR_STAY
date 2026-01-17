import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import AdminLogin from './AdminLogin';

export const AdminListings = () => {
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [editingListing, setEditingListing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Image upload state for edit form
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  
  // Image carousel state for property cards
  const [currentImageIndex, setCurrentImageIndex] = useState({});

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Mapping from ObjectId to actual UUID (temporary fix until API response is corrected)
  const idMapping = {
    '68ce7ad275b8647ccef110ba': '22a9d63e-b0b7-449e-a757-43215814e82e',
    '68ce7ad275b8647ccef110bb': '9efed634-a8bb-4079-9c2a-ab2a90eca4d4', 
    '68ce7ad275b8647ccef110bc': 'b31e354a-ada1-427d-8ef9-1824c608073b',
    '68ce7ad275b8647ccef110bd': '23a71945-3f85-4427-a712-404e6450b0ea',
    '68ce7ad275b8647ccef110be': '5d8dc159-c57b-4fdb-859f-e795e1e420f6'
  };

  // Helper function to get the correct UUID
  const getCorrectId = (listing) => {
    return idMapping[listing.id] || listing.id;
  };

  // Helper function to copy ID to clipboard
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
      console.log(`${type} copied to clipboard: ${text}`);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  // Image handling functions for edit form
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setImageError('');
    
    const currentImageCount = (editForm.images || []).length;
    if (files.length + currentImageCount + selectedImages.length > 10) {
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

  const removeNewImage = (imageId) => {
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

  const removeExistingImage = (imageUrl) => {
    setEditForm(prev => ({
      ...prev,
      images: (prev.images || []).filter(img => img !== imageUrl)
    }));
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

  // Image navigation functions for property cards
  const nextImage = (listingId, totalImages) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [listingId]: ((prev[listingId] || 0) + 1) % totalImages
    }));
  };

  const prevImage = (listingId, totalImages) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [listingId]: ((prev[listingId] || 0) - 1 + totalImages) % totalImages
    }));
  };

  const setImageIndex = (listingId, index) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [listingId]: index
    }));
  };

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Try to get all properties - use public endpoint for development
      const res = await api.get('/properties/');
      const listingsData = Array.isArray(res.data) ? res.data : [];
      setListings(listingsData);
      setFilteredListings(listingsData);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Failed to load listings.';
      setError(String(msg));
      setListings([]);
      setFilteredListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
    // Check if user is authenticated
    setIsAuthenticated(!!token);
  }, [fetchListings, token]);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredListings(listings);
    } else {
      const filtered = listings.filter(listing => {
        const correctId = getCorrectId(listing);
        const searchLower = searchQuery.toLowerCase();
        
        return (
          // Search by ID (both ObjectId and UUID)
          listing.id.toLowerCase().includes(searchLower) ||
          correctId.toLowerCase().includes(searchLower) ||
          // Search by title
          listing.title?.toLowerCase().includes(searchLower) ||
          // Search by property type
          listing.property_type?.toLowerCase().includes(searchLower) ||
          // Search by status
          listing.status?.toLowerCase().includes(searchLower) ||
          // Search by price
          listing.price?.toString().includes(searchQuery) ||
          // Search by address
          listing.address?.street?.toLowerCase().includes(searchLower) ||
          listing.address?.city?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredListings(filtered);
    }
  }, [searchQuery, listings, getCorrectId]);

  const handleLoginSuccess = (accessToken) => {
    setIsAuthenticated(true);
    setShowLogin(false);
    // Refresh listings after login
    fetchListings();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const requireAuth = (callback) => {
    if (!token) {
      setShowLogin(true);
      return;
    }
    callback();
  };

  const deleteListing = async (listing) => {
    if (!listing) return;
    const correctId = getCorrectId(listing);
    setError(''); // Clear previous errors
    try {
      // Use the correct UUID for deletion
      if (token) {
        await api.delete(`/properties/${encodeURIComponent(correctId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // For development, try different endpoints
        try {
          await api.delete(`/properties/public/${encodeURIComponent(correctId)}`);
        } catch (publicError) {
          // If public endpoint doesn't exist, try the regular endpoint
          await api.delete(`/properties/${encodeURIComponent(correctId)}`);
        }
      }
      await fetchListings(); // Refresh list
      setConfirmDeleteId('');
    } catch (e) {
      console.error('Delete error:', e);
      let msg = 'Failed to delete listing.';
      if (e?.response?.data?.detail) {
        msg = e.response.data.detail;
      } else if (e?.response?.status === 404) {
        msg = 'Listing not found. It may have already been deleted.';
      } else if (e?.response?.status === 401 || e?.response?.status === 403) {
        msg = 'Authentication required. Please log in as admin/agent.';
      } else if (e?.message) {
        msg = e.message;
      }
      setError(String(msg));
    }
  };

  const startEdit = (listing) => {
    setEditingListing(listing);
    setEditForm({
      title: listing.title || '',
      property_type: listing.property_type || 'apartment',
      status: listing.status || 'available',
      price: listing.price || '',
      bedrooms: listing.bedrooms || '',
      bathrooms: listing.bathrooms || '',
      square_feet: listing.square_feet || '',
      description: listing.description || '',
      features: listing.features ? listing.features.join(', ') : '',
      address: {
        street: listing.address?.street || '',
        city: listing.address?.city || 'Jaipur',
        state: listing.address?.state || 'Rajasthan',
        zip_code: listing.address?.zip_code || '',
        country: listing.address?.country || 'India'
      },
      coordinates: {
        latitude: listing.coordinates?.latitude || '',
        longitude: listing.coordinates?.longitude || ''
      },
      // Contact information fields
      contact_phone: listing.contact_phone || '',
      alternative_phone: listing.alternative_phone || '',
      contact_email: listing.contact_email || ''
    });
    
    // Reset image upload state
    setSelectedImages([]);
    setImageError('');
  };

  const updateListing = async () => {
    if (!editingListing) return;
    const correctId = getCorrectId(editingListing);
    setUpdateLoading(true);
    setError(''); // Clear previous errors
    try {
      const payload = {
        title: editForm.title,
        property_type: editForm.property_type,
        status: editForm.status,
        price: Number(editForm.price) || 0,
        bedrooms: Number(editForm.bedrooms) || null,
        bathrooms: Number(editForm.bathrooms) || null,
        square_feet: Number(editForm.square_feet) || null,
        description: editForm.description || null,
        features: editForm.features ? editForm.features.split(',').map(s => s.trim()).filter(Boolean) : [],
        address: editForm.address,
        coordinates: editForm.coordinates && editForm.coordinates.latitude && editForm.coordinates.longitude ? {
          latitude: Number(editForm.coordinates.latitude),
          longitude: Number(editForm.coordinates.longitude)
        } : {
          latitude: null,
          longitude: null
        },
        // Contact information fields
        contact_phone: editForm.contact_phone || null,
        alternative_phone: editForm.alternative_phone || null,
        contact_email: editForm.contact_email || null
      };

      // Handle image uploads if any new images are selected
      let uploadedImages = [];
      if (selectedImages.length > 0) {
        try {
          uploadedImages = await uploadImages(correctId);
        } catch (imageError) {
          console.error('Image upload failed:', imageError);
          setError('Property updated but image upload failed. You can try uploading images again.');
        }
      }

      // Combine existing images with newly uploaded ones
      const allImages = [...(editForm.images || []), ...uploadedImages];
      payload.images = allImages;

      console.log('Updating listing with correct UUID:', correctId, 'payload:', payload);

      // Use the correct UUID for update
      let response;
      if (token) {
        response = await api.put(`/properties/${encodeURIComponent(correctId)}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // For development, try different endpoints
        try {
          response = await api.put(`/properties/public/${encodeURIComponent(correctId)}`, payload);
        } catch (publicError) {
          // If public endpoint doesn't exist, try the regular endpoint
          response = await api.put(`/properties/${encodeURIComponent(correctId)}`, payload);
        }
      }
      
      console.log('Update response:', response);
      console.log('Update response data:', response.data);
      
      // Refresh list
      try {
        await fetchListings();
        console.log('Successfully refreshed listings after update');
      } catch (refreshError) {
        console.error('Error refreshing listings:', refreshError);
        // Don't throw error here, update was successful
      }
      
      setEditingListing(null);
      setEditForm({});
      
      // Clean up image previews
      selectedImages.forEach(img => {
        if (img.preview) URL.revokeObjectURL(img.preview);
      });
      setSelectedImages([]);
      setImageError('');
    } catch (e) {
      console.error('Update error:', e);
      console.error('Update error response:', e?.response?.data);
      console.error('Update error status:', e?.response?.status);
      
      let msg = 'Failed to update listing.';
      if (e?.response?.data?.detail) {
        msg = e.response.data.detail;
      } else if (e?.response?.data?.message) {
        msg = e.response.data.message;
      } else if (e?.response?.status === 404) {
        msg = 'Listing not found. It may have been deleted.';
      } else if (e?.response?.status === 401 || e?.response?.status === 403) {
        msg = 'Authentication required. Please log in as admin/agent.';
      } else if (e?.response?.status === 422) {
        msg = 'Invalid data provided. Please check all fields.';
      } else if (e?.message) {
        msg = e.message;
      }
      setError(String(msg));
    } finally {
      setUpdateLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'available': return 'default';
      case 'sold': return 'secondary';
      case 'pending': return 'outline';
      case 'off_market': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <section className="py-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Manage Listings</h1>
          <div className="flex items-center space-x-2">
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Authenticated
                </Badge>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setShowLogin(true)}>
                Login
              </Button>
            )}
            <Link to="/admin/listings/new">
              <Button>Add New Listing</Button>
            </Link>
            <Link to="/admin/submissions">
              <Button variant="outline">Back to Submissions</Button>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="max-w-md">
            <Input
              type="text"
              placeholder="Search by ID, title, type, status, price, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            {searchQuery && (
              <p className="text-sm text-gray-600 mt-2">
                Found {filteredListings.length} of {listings.length} properties
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="text-lg">Loading listings...</div>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredListings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  {searchQuery ? (
                    <div>
                      <p className="text-slate-500 mb-4">No properties found matching "{searchQuery}".</p>
                      <Button variant="outline" onClick={() => setSearchQuery('')}>
                        Clear Search
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-slate-500 mb-4">No listings found.</p>
                      <Link to="/admin/listings/new">
                        <Button>Create Your First Listing</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredListings.map((listing) => (
                <Card key={listing.id} className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl mb-2">{listing.title}</CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getStatusBadgeVariant(listing.status)}>
                            {listing.status}
                          </Badge>
                          <Badge variant="outline">{listing.property_type}</Badge>
                        </div>
                        <div className="text-xs text-slate-500 space-y-1 mb-2">
                          <div 
                            className="font-mono cursor-pointer hover:text-slate-700 hover:bg-slate-100 px-1 py-0.5 rounded break-all"
                            onClick={() => copyToClipboard(listing.id, 'ObjectID')}
                            title="Click to copy ObjectID"
                          >
                            ID: {listing.id}
                          </div>
                          <div 
                            className="font-mono text-blue-600 cursor-pointer hover:text-blue-800 hover:bg-blue-50 px-1 py-0.5 rounded break-all"
                            onClick={() => copyToClipboard(getCorrectId(listing), 'UUID')}
                            title="Click to copy UUID"
                          >
                            UUID: {getCorrectId(listing)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {formatPrice(listing.price)}
                        </div>
                        <div className="text-sm text-slate-500">
                          {listing.bedrooms && `${listing.bedrooms} bed`}
                          {listing.bathrooms && ` • ${listing.bathrooms} bath`}
                          {listing.square_feet && ` • ${listing.square_feet} sq ft`}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {/* Property Images */}
                  {listing.images && listing.images.length > 0 && (
                    <div className="px-6 pb-4">
                      <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                        {(() => {
                          const images = listing.images;
                          const currentIndex = currentImageIndex[listing.id] || 0;
                          const currentImage = images[currentIndex] || images[0];
                          
                          return (
                            <>
                              <img
                                src={currentImage}
                                alt={`${listing.title} - Image ${currentIndex + 1}`}
                                className="w-full h-full object-cover"
                              />
                              
                              {/* Image Navigation - only show if multiple images */}
                              {images.length > 1 && (
                                <>
                                  {/* Previous Button */}
                                  <button
                                    onClick={() => prevImage(listing.id, images.length)}
                                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors"
                                  >
                                    ‹
                                  </button>
                                  
                                  {/* Next Button */}
                                  <button
                                    onClick={() => nextImage(listing.id, images.length)}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors"
                                  >
                                    ›
                                  </button>
                                  
                                  {/* Image Dots Indicator */}
                                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                                    {images.map((_, index) => (
                                      <button
                                        key={index}
                                        onClick={() => setImageIndex(listing.id, index)}
                                        className={`w-2 h-2 rounded-full transition-colors ${
                                          index === currentIndex 
                                            ? 'bg-white' 
                                            : 'bg-white/50 hover:bg-white/75'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  
                                  {/* Image Counter */}
                                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                    {currentIndex + 1}/{images.length}
                                  </div>
                                </>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Description</h4>
                        <p className="text-sm text-slate-600 mb-4">
                          {listing.description || 'No description provided.'}
                        </p>
                        
                        {listing.address && (
                          <div>
                            <h4 className="font-medium mb-2">Address</h4>
                            <p className="text-sm text-slate-600">
                              {listing.address.street && `${listing.address.street}, `}
                              {listing.address.city && `${listing.address.city}, `}
                              {listing.address.state && `${listing.address.state} `}
                              {listing.address.zip_code}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        {listing.features && listing.features.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium mb-2">Features</h4>
                            <div className="flex flex-wrap gap-1">
                              {listing.features.map((feature, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="text-xs text-slate-500">
                          <div>Created: {new Date(listing.created_at).toLocaleDateString()}</div>
                          <div>Updated: {new Date(listing.updated_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => requireAuth(() => startEdit(listing))}
                      >
                        Edit
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => requireAuth(() => {})}
                          >
                            Delete
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirm Delete</DialogTitle>
                          </DialogHeader>
                          <p>Are you sure you want to delete "{listing.title}"? This action cannot be undone.</p>
                          <DialogFooter>
                            <Button variant="outline">Cancel</Button>
                            <Button 
                              variant="destructive" 
                              onClick={() => deleteListing(listing)}
                              disabled={loading}
                            >
                              Delete
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingListing} onOpenChange={() => setEditingListing(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Listing - {editingListing?.title}</DialogTitle>
            </DialogHeader>
            
            {editingListing && (
              <div className="grid gap-4">
                {/* Title */}
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                
                {/* Property Type and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Property Type</label>
                    <Select
                      value={editForm.property_type}
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, property_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="condo">Condo</SelectItem>
                        <SelectItem value="townhouse">Townhouse</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={editForm.status}
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="off_market">Off Market</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Price and Property Details */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium">Price (₹)</label>
                    <Input
                      type="number"
                      min="0"
                      value={editForm.price}
                      onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Bedrooms</label>
                    <Input
                      type="number"
                      min="0"
                      value={editForm.bedrooms}
                      onChange={(e) => setEditForm(prev => ({ ...prev, bedrooms: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Bathrooms</label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editForm.bathrooms}
                      onChange={(e) => setEditForm(prev => ({ ...prev, bathrooms: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Square Feet</label>
                    <Input
                      type="number"
                      min="0"
                      value={editForm.square_feet}
                      onChange={(e) => setEditForm(prev => ({ ...prev, square_feet: e.target.value }))}
                    />
                  </div>
                </div>
                
                {/* Description */}
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    rows={4}
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                
                {/* Features */}
                <div>
                  <label className="text-sm font-medium">Features (comma separated)</label>
                  <Input
                    value={editForm.features}
                    onChange={(e) => setEditForm(prev => ({ ...prev, features: e.target.value }))}
                    placeholder="e.g., parking, balcony, gym"
                  />
                </div>
                
                {/* Address Section */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Address</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Street</label>
                      <Input
                        value={editForm.address?.street || ''}
                        onChange={(e) => setEditForm(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, street: e.target.value }
                        }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">City</label>
                      <Input
                        value={editForm.address?.city || ''}
                        onChange={(e) => setEditForm(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, city: e.target.value }
                        }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">State</label>
                      <Input
                        value={editForm.address?.state || ''}
                        onChange={(e) => setEditForm(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, state: e.target.value }
                        }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Zip Code</label>
                      <Input
                        value={editForm.address?.zip_code || ''}
                        onChange={(e) => setEditForm(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, zip_code: e.target.value }
                        }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Country</label>
                      <Input
                        value={editForm.address?.country || ''}
                        onChange={(e) => setEditForm(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, country: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Coordinates Section */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Coordinates (optional)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Latitude</label>
                      <Input
                        type="number"
                        step="any"
                        value={editForm.coordinates?.latitude || ''}
                        onChange={(e) => setEditForm(prev => ({ 
                          ...prev, 
                          coordinates: { ...prev.coordinates, latitude: e.target.value }
                        }))}
                        placeholder="e.g., 26.9124"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Longitude</label>
                      <Input
                        type="number"
                        step="any"
                        value={editForm.coordinates?.longitude || ''}
                        onChange={(e) => setEditForm(prev => ({ 
                          ...prev, 
                          coordinates: { ...prev.coordinates, longitude: e.target.value }
                        }))}
                        placeholder="e.g., 75.7873"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Tip: Provide lat/lng to avoid geocoding dependency in development.
                  </div>
                </div>
                
                {/* Contact Information Section */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Contact Phone *</label>
                      <Input
                        value={editForm.contact_phone || ''}
                        onChange={(e) => setEditForm(prev => ({ 
                          ...prev, 
                          contact_phone: e.target.value 
                        }))}
                        placeholder="e.g., +91-9876543210"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Alternative Phone</label>
                      <Input
                        value={editForm.alternative_phone || ''}
                        onChange={(e) => setEditForm(prev => ({ 
                          ...prev, 
                          alternative_phone: e.target.value 
                        }))}
                        placeholder="e.g., +91-9876543211"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Contact Email</label>
                      <Input
                        type="email"
                        value={editForm.contact_email || ''}
                        onChange={(e) => setEditForm(prev => ({ 
                          ...prev, 
                          contact_email: e.target.value 
                        }))}
                        placeholder="e.g., contact@property.com"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Image Upload Section */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Property Images</h4>
                  
                  {imageError && (
                    <div className="text-red-600 text-sm mb-3">{imageError}</div>
                  )}
                  
                  {/* Existing Images */}
                  {editForm.images && editForm.images.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium mb-2">Current Images:</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {editForm.images.map((imageUrl, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={imageUrl}
                              alt={`Property ${index + 1}`}
                              className="w-full h-20 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => removeExistingImage(imageUrl)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* New Image Upload */}
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="edit-image-upload"
                      disabled={(editForm.images?.length || 0) + selectedImages.length >= 10}
                    />
                    <label
                      htmlFor="edit-image-upload"
                      className={`cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                        (editForm.images?.length || 0) + selectedImages.length >= 10
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      📷 Add Images ({(editForm.images?.length || 0) + selectedImages.length}/10)
                    </label>
                    <p className="text-slate-500 text-xs mt-1">
                      Upload additional images (JPG, PNG, WebP, max 10MB each)
                    </p>
                  </div>

                  {/* New Image Previews */}
                  {selectedImages.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium mb-2">New Images to Upload:</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {selectedImages.map((image) => (
                          <div key={image.id} className="relative group">
                            <img
                              src={image.preview}
                              alt="New upload"
                              className="w-full h-20 object-cover rounded border border-blue-300"
                            />
                            <button
                              type="button"
                              onClick={() => removeNewImage(image.id)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingListing(null)}>
                Cancel
              </Button>
              <Button onClick={updateListing} disabled={updateLoading || imageUploading}>
                {imageUploading ? 'Uploading Images...' : updateLoading ? 'Updating...' : 'Update Listing'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Login Modal */}
        <AdminLogin
          isOpen={showLogin}
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    </section>
  );
};
