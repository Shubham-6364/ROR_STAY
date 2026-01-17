import React, { useEffect, useMemo, useState } from 'react';
import { api, endpoints } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export const AdminSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { limit: 500 };
      if (statusFilter && statusFilter !== 'all') params.status_filter = statusFilter;
      if (query) params.q = query;
      if (fromDate) params.from_date = fromDate; // YYYY-MM-DD
      if (toDate) params.to_date = toDate;       // YYYY-MM-DD
      const res = await api.get(endpoints.contactSubmissionsPublic, { params });
      setSubmissions(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError('Failed to load submissions.');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter, query, fromDate, toDate]);

  // Pagination
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return submissions.slice(start, end);
  }, [submissions, page, pageSize]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil((submissions?.length || 0) / pageSize)), [submissions, pageSize]);
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const gotoFirst = () => setPage(1);
  const gotoPrev = () => setPage(p => Math.max(1, p - 1));
  const gotoNext = () => setPage(p => Math.min(totalPages, p + 1));
  const gotoLast = () => setPage(totalPages);

  const csvData = useMemo(() => {
    if (!submissions?.length) return '';
    const headers = [
      'id','name','email','phone','preferred_location','map_latitude','map_longitude','message','status','created_at'
    ];
    const rows = submissions.map(s => [
      s.id || '',
      s.name || '',
      s.email || '',
      s.phone || '',
      s.preferred_location || '',
      s.map_pin?.latitude ?? '',
      s.map_pin?.longitude ?? '',
      (s.message || '').replace(/\n/g, ' '),
      s.status || '',
      s.created_at || ''
    ]);
    return [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  }, [submissions]);

  const downloadCsv = () => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contact_submissions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.put(`/contact/submissions/public/${id}/status`, null, { params: { new_status: newStatus } });
      await load();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  return (
    <section className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Contact Submissions</CardTitle>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Input
                placeholder="Search name/email/phone"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="md:w-72"
              />
              <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
              <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="new">new</SelectItem>
                  <SelectItem value="in_progress">in_progress</SelectItem>
                  <SelectItem value="contacted">contacted</SelectItem>
                  <SelectItem value="resolved">resolved</SelectItem>
                  <SelectItem value="closed">closed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={load}>Refresh</Button>
              <Button onClick={downloadCsv} disabled={!csvData}>Copy to CSV</Button>
              <Badge variant="outline">{loading ? 'Loading…' : `${submissions.length} items`}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 text-red-600 text-sm">{error}</div>
            )}
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Preferred Location</TableHead>
                    <TableHead>Map Pin</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!loading && paginated.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs truncate max-w-[240px]" title={s.id}>{s.id}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell>{s.phone}</TableCell>
                      <TableCell>{s.preferred_location || '-'}</TableCell>
                      <TableCell>
                        {s.map_pin ? `${s.map_pin.latitude}, ${s.map_pin.longitude}` : '-'}
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate" title={s.message}>{s.message}</TableCell>
                      <TableCell>
                        <Badge>{s.status || 'new'}</Badge>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" variant="outline" onClick={() => updateStatus(s.id, 'contacted')}>Mark Contacted</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(s.id, 'in_progress')}>In Progress</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(s.id, 'resolved')}>Resolve</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(s.id, 'closed')}>Close</Button>
                      </TableCell>
                      <TableCell>{s.created_at ? new Date(s.created_at).toLocaleString() : '-'}</TableCell>
                    </TableRow>
                  ))}
                  {!loading && submissions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-slate-500 py-6">No submissions found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={gotoFirst} disabled={!canPrev}>
                  « First
                </Button>
                <Button variant="outline" onClick={gotoPrev} disabled={!canPrev}>
                  ‹ Prev
                </Button>
                <div className="text-sm text-slate-600">
                  Page {page} of {totalPages}
                </div>
                <Button variant="outline" onClick={gotoNext} disabled={!canNext}>
                  Next ›
                </Button>
                <Button variant="outline" onClick={gotoLast} disabled={!canNext}>
                  Last »
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Rows per page</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
