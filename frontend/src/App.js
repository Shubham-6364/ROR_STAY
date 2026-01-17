import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { Listings } from "./components/Listings";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import { Toaster } from "sonner";
import { AdminSubmissions } from "./components/AdminSubmissions";
import { AdminContacts } from "./components/AdminContacts";
import { AdminNewListing } from "./components/AdminNewListing";
import { AdminListings } from "./components/AdminListings";
import { AdminGuard } from "./components/AdminGuard";

const Home = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <Features />
      <Listings />
      <Contact />
      <Footer />
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Toaster richColors position="top-center" />
        <Routes>
          <Route path="/" element={<Home />}>
            <Route index element={<Home />} />
          </Route>
          <Route path="/admin/submissions" element={<AdminGuard><AdminSubmissions /></AdminGuard>} />
          <Route path="/admin/listings" element={<AdminGuard><AdminListings /></AdminGuard>} />
          <Route path="/admin/listings/new" element={<AdminGuard><AdminNewListing /></AdminGuard>} />
          <Route path="/admin/contacts" element={<AdminGuard><AdminContacts /></AdminGuard>} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;