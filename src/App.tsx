import { Routes, Route, Navigate } from "react-router-dom";
import TabsLayout from "@/pages/TabsLayout";
import Home from "@/pages/Home";
import Parcelles from "@/pages/Parcelles";
import Irrigation from "@/pages/Irrigation";
import Fertilisation from "@/pages/Fertilisation";
import Programmes from "@/pages/Programmes";
import Recommandations from "@/pages/Recommandations";
import Tache from "@/pages/Tache";
import Profil from "@/pages/Profil";
import Anomalie from "@/pages/Anomalie";
import Anomalies from "@/pages/Anomalies";
import Historique from "@/pages/Historique";
import Maintenance from "@/pages/Maintenance";
import Rappels from "@/pages/Rappels";
import Parcelle from "@/pages/Parcelle";
import Login from "@/pages/Login";
import Configuration from "@/pages/Configuration";
import NotFound from "@/pages/NotFound";
import DonneesEnAttente from "@/pages/DonneesEnAttente";
import ManageUsers from "@/pages/ManageUsers";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/configuration" element={<Configuration />} />
      <Route path="/parcelle/:id" element={<Parcelle />} />
      <Route element={<TabsLayout />}>
        <Route index element={<Home />} />
        <Route path="parcelles" element={<Parcelles />} />
        <Route path="irrigation" element={<Irrigation />} />
        <Route path="fertilisation" element={<Fertilisation />} />
        <Route path="programmes" element={<Programmes />} />
        <Route path="recommandations" element={<Recommandations />} />
        <Route path="tache" element={<Tache />} />
        <Route path="profil" element={<Profil />} />
        <Route path="anomalie" element={<Anomalie />} />
        <Route path="anomalies" element={<Anomalies />} />
        <Route path="historique" element={<Historique />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="rappels" element={<Rappels />} />
        <Route path="donnees-en-attente" element={<DonneesEnAttente />} />
        <Route path="utilisateurs" element={<ManageUsers />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
