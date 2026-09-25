import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "../Components/ProtectedRoute";

import Home from "../pages/Home";
import Login from "../pages/Auth/Login";
import Signup from "../pages/Auth/Signup";
import ForgotPassword from "../pages/Auth/ForgotPassword";
import DoctorRegistrationStep1 from "../pages/Auth/DoctorRegistrationStep1";
import DoctorRegistrationStep2 from "../pages/Auth/DoctorRegistrationStep2";
import DoctorRegistrationConfirmation from "../pages/Auth/DoctorRegistrationConfirmation";
import ResetPassword from "../pages/Auth/ResetPassword";
import ResetPasswordFromLink from "../pages/Auth/ResetPasswordFromLink";
import HowItWorks from "../pages/HowItWorks";
import PublicDoctorProfile from "../pages/DoctorProfile";
import PrivacyPolicy from "../pages/PrivacyPolicy";
import TermsOfService from "../pages/TermsOfService";

import DoctorLayout from "../Layouts/DoctorLayout";
import DoctorDashboard from "../pages/Doctor/Dashboard";
import DoctorProfile from "../pages/Doctor/Profile";
import DoctorCalendar from "../pages/Doctor/Calendar";
import DoctorBooking from "../pages/Doctor/Booking";
import DoctorReport from "../pages/Doctor/Report";
import DoctorSettings from "../pages/Doctor/Settings";

import PatientLayout from "../Layouts/PatientLayout";
import PatientDashboard from "../pages/Patient/Dashboard";
import BrowseServices from "../pages/Patient/Browse";
import MyBookings from "../pages/Patient/Booking";
import PatientCalendar from "../pages/Patient/Calender";
import PatientProfile from "../pages/Patient/Profile";
import PatientMedicalHistory from "../pages/Patient/MedicalHistory";
import LiveQueueDashboard from "../pages/Patient/LiveQueueDashboard";

import AdminLayout from "../Layouts/AdminLayout";
import AdminDashboard from "../pages/Admin/Dashboard";
import ManageDoctors from "../pages/Admin/ManageDoctors";
import ManagePatients from "../pages/Admin/ManagePatients";
import PatientProfileView from "../pages/Admin/PatientProfileView";
import ManageAppointments from "../pages/Admin/ManageAppointments";
import AppointmentDetails from "../pages/Admin/AppointmentDetails";
import DoctorApproval from "../pages/Admin/DoctorApproval";
import ReportPage from "../pages/Admin/ReportPage";
import Settings from "../pages/Admin/Seting";
import AdminProfileSettings from "../pages/Admin/ProfileSettings";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/doctor-registration/step1" element={<DoctorRegistrationStep1 />} />
      <Route path="/doctor-registration/step2" element={<DoctorRegistrationStep2 />} />
      <Route path="/doctor-registration/confirmation" element={<DoctorRegistrationConfirmation />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/reset-password/:token" element={<ResetPasswordFromLink />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/browse-doctors" element={<BrowseServices />} />
      <Route path="/doctor/:id" element={<PublicDoctorProfile />} />

      <Route path="/doctor" element={<ProtectedRoute requiredRole="doctor"><DoctorLayout /></ProtectedRoute>}>
        <Route index element={<DoctorDashboard />} />
        <Route path="profile" element={<DoctorProfile />} />
        <Route path="calendar" element={<DoctorCalendar />} />
        <Route path="bookings" element={<DoctorBooking />} />
        <Route path="report" element={<DoctorReport />} />
        <Route path="settings" element={<DoctorSettings />} />
      </Route>

      <Route path="/patient" element={<ProtectedRoute requiredRole="patient"><PatientLayout /></ProtectedRoute>}>
        <Route index element={<PatientDashboard />} />
        <Route path="profile" element={<PatientProfile />} />
        <Route path="browse-services" element={<BrowseServices />} />
        <Route path="doctor/:id" element={<PublicDoctorProfile />} />
        <Route path="appointments" element={<MyBookings />} />
        <Route path="medical-history" element={<PatientMedicalHistory />} />
        <Route path="calendar/:id" element={<PatientCalendar />} />
        <Route path="queue/:doctorId/:date" element={<LiveQueueDashboard />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="profile" element={<AdminProfileSettings />} />
        <Route path="doctors" element={<ManageDoctors />} />
        <Route path="doctor-approval" element={<DoctorApproval />} />
        <Route path="patients" element={<ManagePatients />} />
        <Route path="patients/:id" element={<PatientProfileView />} />
        <Route path="appointments" element={<ManageAppointments />} />
        <Route path="appointments/:id" element={<AppointmentDetails />} />
        <Route path="report" element={<ReportPage />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
