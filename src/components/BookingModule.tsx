/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Calendar, Clock, ShieldCheck, Trash2, 
  Sparkles, CheckCircle2, AlertCircle, Building2, User 
} from "lucide-react";
import { User as UserType, UserRole, Asset, Booking } from "../types.js";

interface BookingModuleProps {
  user: UserType;
  onActivityLogged: () => void;
}

export default function BookingModule({ user, onActivityLogged }: BookingModuleProps) {
  const [sharedAssets, setSharedAssets] = useState<Asset[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [employees, setEmployees] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [form, setForm] = useState({
    assetId: "",
    title: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "10:00"
  });

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resAssets, resBook, resEmps] = await Promise.all([
        fetch("/api/assets"),
        fetch("/api/bookings"),
        fetch("/api/employees")
      ]);

      if (resAssets.ok) {
        const allAssets: Asset[] = await resAssets.json();
        setSharedAssets(allAssets.filter(a => a.isShared));
      }
      if (resBook.ok) setBookings(await resBook.json());
      if (resEmps.ok) setEmployees(await resEmps.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!form.assetId || !form.title || !form.date || !form.startTime || !form.endTime) {
      setErrorMsg("Please fill out all scheduling details.");
      return;
    }

    // Combine date + time to ISO strings
    const startIso = new Date(`${form.date}T${form.startTime}:00`).toISOString();
    const endIso = new Date(`${form.date}T${form.endTime}:00`).toISOString();

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: form.assetId,
          userId: user.id,
          title: form.title.trim(),
          startTime: startIso,
          endTime: endIso
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Overlap conflict detected.");
      }

      setSuccessMsg("Resource booking confirmed successfully!");
      setForm({
        assetId: "",
        title: "",
        date: new Date().toISOString().split("T")[0],
        startTime: "09:00",
        endTime: "10:00"
      });
      fetchData();
      onActivityLogged();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorUserId: user.id })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel booking");
      }

      setSuccessMsg("Booking successfully cancelled.");
      fetchData();
      onActivityLogged();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // List of active (non-cancelled) bookings
  const activeBookings = bookings.filter(b => b.status === "Confirmed");

  return (
    <div className="space-y-6">
      {/* Intro info card */}
      <div className="bg-white p-5 rounded-xl border border-neutral-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-800 font-display">Shared Resource Booking Scheduler</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Reserve company-wide shared amenities, boardrooms, projectors, and fleet vehicles. Non-overlapping time protection enforced.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
          <Calendar size={13} />
          <span>{sharedAssets.length} Reservable Resources</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs flex items-center gap-2 font-semibold">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs flex items-center gap-2 font-semibold">
          <Sparkles size={15} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Reservation form panel */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-neutral-200 space-y-4 h-fit">
          <h4 className="font-semibold text-neutral-800 text-sm border-b border-neutral-100 pb-2">Book Shared Resource</h4>
          
          <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs font-medium text-neutral-500">
            <div>
              <label className="block text-neutral-500 mb-1">Select Resource *</label>
              <select
                required
                value={form.assetId}
                onChange={e => setForm({ ...form, assetId: e.target.value })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800 bg-white"
              >
                <option value="">Select Amenities...</option>
                {sharedAssets.map(asset => (
                  <option key={asset.id} value={asset.id}>
                    [{asset.tag}] {asset.name} ({asset.location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-neutral-500 mb-1">Purpose / Title of Booking *</label>
              <input
                type="text"
                required
                placeholder="e.g. Weekly Standup, Client Presentation"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-indigo-600"
              />
            </div>

            <div>
              <label className="block text-neutral-500 mb-1">Date *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-500 mb-1">Start Time *</label>
                <input
                  type="time"
                  required
                  value={form.startTime}
                  onChange={e => setForm({ ...form, startTime: e.target.value })}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800"
                />
              </div>
              <div>
                <label className="block text-neutral-500 mb-1">End Time *</label>
                <input
                  type="time"
                  required
                  value={form.endTime}
                  onChange={e => setForm({ ...form, endTime: e.target.value })}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
              Reserve Slot
            </button>
          </form>
        </div>

        {/* Combined schedules dairy */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-neutral-200 space-y-4">
          <h4 className="font-semibold text-neutral-800 text-sm border-b border-neutral-100 pb-2">Corporate Booking Calendar</h4>

          <div className="space-y-3">
            {activeBookings.length === 0 ? (
              <div className="text-center p-12 text-neutral-400">
                <Calendar size={28} className="mx-auto text-neutral-300 mb-2" />
                <p className="text-xs font-semibold text-neutral-600">No upcoming active reservations scheduled.</p>
              </div>
            ) : (
              activeBookings.map(b => {
                const asset = sharedAssets.find(a => a.id === b.assetId);
                const booker = employees.find(emp => emp.id === b.userId);
                const isOwnBooking = b.userId === user.id;

                return (
                  <div 
                    key={b.id} 
                    className={`p-4 border rounded-xl flex items-center justify-between gap-4 transition duration-150 ${
                      isOwnBooking ? "border-indigo-200 bg-indigo-50/20" : "border-neutral-100 bg-neutral-50/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 rounded-lg bg-white border border-neutral-200 text-neutral-500 shrink-0 shadow-xs">
                        <Building2 size={15} />
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-neutral-800 text-sm">{b.title}</p>
                        <p className="text-neutral-500 mt-1 font-semibold">
                          Resource: <span className="text-neutral-700 font-bold">{asset ? asset.name : "Meeting Room"}</span> [{asset ? asset.tag : "AF-XXXX"}]
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-neutral-400 font-medium">
                          <Clock size={11} />
                          <span>
                            {new Date(b.startTime).toLocaleDateString()} • {new Date(b.startTime).toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"})} - {new Date(b.endTime).toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"})}
                          </span>
                        </div>
                        <p className="text-[10px] text-indigo-600 font-semibold mt-1 flex items-center gap-1 font-mono">
                          <User size={10} />
                          Reserved by {booker ? booker.name : "Employee"} {isOwnBooking && "(You)"}
                        </p>
                      </div>
                    </div>

                    {/* Cancellation controls */}
                    {(isOwnBooking || user.role === UserRole.ADMIN || user.role === UserRole.ASSET_MANAGER) && (
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Cancel reservation"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
