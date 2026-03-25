import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { ListingDetail } from './pages/ListingDetail';
import { Checkout } from './pages/Checkout';
import { ListProperty } from './pages/ListProperty';
import { Profile } from './pages/Profile';
import { AdminReservations } from './pages/AdminReservations';
import { Success } from './pages/Success';

import { CartProvider, useCart } from './context/CartContext';

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/destination/:id" element={<ListingDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/anunciar" element={<ListProperty />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/admin/reservas" element={<AdminReservations />} />
          <Route path="/sucesso" element={<Success />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}
