import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, endpoints } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';

export const AdminContacts = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('__all__');
  const [query, setQuery] = useState('');
  
  // Delete state
  const [deletingId, setDeletingId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchSubmissions = useCallback(async () => {
    let cancelled = false;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`${endpoints.contactSubmissionsPublic}`, {
        params: {
          limit: 200,
          status_filter: statusFilter === '__all__' ? undefined : statusFilter,
        },
      });
      if (!cancelled) setSubmissions(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      if (!cancelled) setError('Failed to load contact submissions.');
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => { cancelled = true; };
  }, [statusFilter]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = submissions;
    // Apply client-side status filter as well, for robustness
    if (statusFilter && statusFilter !== '__all__') {
      arr = arr.filter(s => String(s.status || '').toLowerCase() === statusFilter);
    }
    if (q) {
      arr = arr.filter((s) => {
        const fields = [s.name, s.email, s.phone, s.message, s.preferred_location].map(v => String(v || '').toLowerCase());
        return fields.some(f => f.includes(q));
      });
    }
    return arr;
  }, [submissions, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => { setPage(1); }, [query, statusFilter]);

  const STATUS_OPTIONS = ['new', 'in_progress', 'contacted', 'resolved', 'closed'];

  const updateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      await api.put(`/contact/submissions/public/${id}/status`, null, {
        params: { new_status: newStatus },
      });
      // Optimistic update
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
      // Auto-refresh from server
      await fetchSubmissions();
    } catch (e) {
      console.error('Failed to update status', e);
      alert('Failed to update status.');
    } finally {
      setUpdatingId('');
    }
  };

  const deleteSubmission = async (submissionId) => {
    setDeletingId(submissionId);
    try {
      await api.delete(`/contact/submissions/public/${submissionId}`);
      
      // Remove from local state
      setSubmissions(prev => prev.filter(s => s.id !== submissionId));
      setConfirmDeleteId('');
      
      // Refresh data to be sure
      await fetchSubmissions();
    } catch (e) {
      console.error('Failed to delete submission', e);
      alert('Failed to delete submission.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Contact Submissions</h1>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search name, email, phone, message..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-72"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Statuses</SelectItem>
                <SelectItem value="new">new</SelectItem>
                <SelectItem value="in_progress">in_progress</SelectItem>
                <SelectItem value="contacted">contacted</SelectItem>
                <SelectItem value="resolved">resolved</SelectItem>
                <SelectItem value="closed">closed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setStatusFilter('__all__'); setQuery(''); }}>Reset</Button>
            <Button onClick={fetchSubmissions}>Refresh</Button>
          </div>
        </div>

        {loading && <div className="text-slate-600">Loading…</div>}
        {error && <div className="text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full divide-y divide-slate-200 table-fixed">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 w-32">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 w-48">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 w-32">Phone</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 w-24">Property ID</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Message</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 w-40">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 w-32">Created</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paged.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-sm text-slate-800">{s.name}</td>
                    <td className="px-4 py-2 text-sm text-slate-700">{s.email}</td>
                    <td className="px-4 py-2 text-sm text-slate-700">{s.phone}</td>
                    <td className="px-4 py-2 text-sm text-slate-700">{s.property_id || '-'}</td>
                    <td className="px-4 py-2 text-sm text-slate-700 max-w-md break-words">{s.message}</td>
                    <td className="px-4 py-2 text-sm">
                      <Select value={String(s.status || '')} onValueChange={(val) => updateStatus(s.id, val)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(st => (
                            <SelectItem key={st} value={st}>{st}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {updatingId === s.id && (
                        <span className="ml-2 text-xs text-slate-500">Updating…</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600">{s.created_at ? new Date(s.created_at).toLocaleString() : '-'}</td>
                    <td className="px-4 py-2 text-sm">
                      {confirmDeleteId === s.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteSubmission(s.id)}
                            disabled={deletingId === s.id}
                          >
                            {deletingId === s.id ? 'Deleting...' : 'Confirm'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmDeleteId('')}
                            disabled={deletingId === s.id}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmDeleteId(s.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">No submissions found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
            <div className="text-slate-600 text-sm">Page {page} of {totalPages}</div>
            <Button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
};
