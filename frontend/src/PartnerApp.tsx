import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PartnerProvider } from './partner/PartnerContext';
import { PartnerShell } from './partner/PartnerShell';
import { Dashboard } from './partner/screens/Dashboard';
import { OrderDetail } from './partner/screens/OrderDetail';
import { Orders } from './partner/screens/Orders';
import { Earnings } from './partner/screens/Earnings';
import { History } from './partner/screens/History';
import { Notifications } from './partner/screens/Notifications';
import { Profile } from './partner/screens/Profile';
import { ForgotPassword } from './partner/screens/ForgotPassword';

interface Props {
  onLogout: () => void;
}

/**
 * The /partner/* tree — the delivery-partner web app. Reached only by a staff
 * user whose role is 'Delivery' (gated in App.tsx). Mobile-first; shares the
 * staff login page, backed entirely by the existing /api/delivery/* endpoints.
 */
const PartnerApp: React.FC<Props> = ({ onLogout }) => (
  <PartnerProvider>
    <Routes>
      <Route path="/partner" element={<Navigate to="/partner/dashboard" replace />} />
      <Route path="/partner/forgot" element={<ForgotPassword />} />
      <Route
        path="/partner/dashboard"
        element={<PartnerShell onLogout={onLogout}><Dashboard /></PartnerShell>}
      />
      <Route
        path="/partner/orders/:orderId"
        element={<PartnerShell onLogout={onLogout}><OrderDetail /></PartnerShell>}
      />
      <Route
        path="/partner/earnings"
        element={<PartnerShell onLogout={onLogout}><Earnings /></PartnerShell>}
      />
      <Route
        path="/partner/orders"
        element={<PartnerShell onLogout={onLogout}><Orders /></PartnerShell>}
      />
      <Route
        path="/partner/history"
        element={<PartnerShell onLogout={onLogout}><History /></PartnerShell>}
      />
      <Route
        path="/partner/notifications"
        element={<PartnerShell onLogout={onLogout}><Notifications /></PartnerShell>}
      />
      <Route
        path="/partner/profile"
        element={<PartnerShell onLogout={onLogout}><Profile onLogout={onLogout} /></PartnerShell>}
      />
      <Route path="*" element={<Navigate to="/partner/dashboard" replace />} />
    </Routes>
  </PartnerProvider>
);

export default PartnerApp;
