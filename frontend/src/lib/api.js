import axios from 'axios';

// Use proxy for development to avoid CORS issues
const BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const endpoints = {
  properties: '/properties/',
  contactSubmit: '/contact/submit',
  contactSubmissionsPublic: '/contact/submissions/public',
};
