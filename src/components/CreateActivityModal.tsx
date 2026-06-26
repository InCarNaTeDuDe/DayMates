/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import React, { useState } from "react";
import { createActivity } from "../services/api";
import { ActivityCategory } from "../shared/types";
import { X, Calendar, Clock, MapPin, Users, Info } from "lucide-react";

interface CreateActivityModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ACTIVITY_PRESETS = [
  {
    icon: "🏃",
    label: "Jogging",
    title: "Saturday Sunrise Jogging Group",
    description:
      "Meeting up for a light 5K jog along the East Lake trails. All fitness levels and paces are welcome! Please wear high-visibility gear or sportswear. We will grab smoothies/coffee right after near the park entrance.",
    category: ActivityCategory.JOGGING,
    location: "Central Park East Gate Entrance",
    slots: 12,
    time: "07:30",
  },
  {
    icon: "🚴",
    label: "Cycling",
    title: "Evening Sunset Bike Ride",
    description:
      "Join us for a relaxing 15km casual ride along the river cycling lanes. Make sure to bring a helmet and bike lights. We will maintain a moderate, leisurely pace, so do not worry if you are a beginner!",
    category: ActivityCategory.CYCLING,
    location: "Downtown Riverside Cycling Trailhead",
    slots: 8,
    time: "18:15",
  },
  {
    icon: "♟️",
    label: "Chess",
    title: "Chess Board Match and Pizza",
    description:
      "A casual chess meetup at the local cafe. Whether you are a grandmaster or absolute beginner, come play a few games, analyze positions, and enjoy some pizza. Boards are provided, but feel free to bring your own!",
    category: ActivityCategory.CHESS,
    location: "Corner Bakery & Coffee House",
    slots: 6,
    time: "19:00",
  },
  {
    icon: "📚",
    label: "Study",
    title: "Kubernetes & Docker Study Group",
    description:
      "Let us get together to prepare for our CKA exam or just share some real-world Kubernetes and Docker tips. Bring your laptop and your active cluster setups. We will discuss pod networking and persistent volumes.",
    category: ActivityCategory.STUDY,
    location: "Public Library Study Room C",
    slots: 10,
    time: "14:30",
  },
  {
    icon: "🍿",
    label: "Movie",
    title: "Friday Movie Night Outing",
    description:
      "Heading to the cinemas to catch the new sci-fi blockbuster! We can meet up 30 minutes earlier at the food court to grab some snacks and chat before booking our seat rows together.",
    category: ActivityCategory.MOVIE,
    location: "Grand Cinema Lobby Multiplex",
    slots: 15,
    time: "20:00",
  },
  {
    icon: "🏸",
    label: "Badminton",
    title: "Casual Badminton Doubles Match",
    description:
      "Booking an indoor court for some high-energy casual badminton doubles matches! Court rental fee will be divided equally. Please bring your own racket if possible, shuttlecocks will be provided!",
    category: ActivityCategory.BADMINTON,
    location: "Sports Hub Indoor Arena Court 4",
    slots: 4,
    time: "17:00",
  },
];

const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
};

export default function CreateActivityModal({
  onClose,
  onSuccess,
}: CreateActivityModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ActivityCategory>(
    ActivityCategory.JOGGING,
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [slots, setSlots] = useState<number>(5);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const applyPreset = (preset: (typeof ACTIVITY_PRESETS)[0]) => {
    setTitle(preset.title);
    setDescription(preset.description);
    setCategory(preset.category);
    setDate(getTomorrowDateString());
    setTime(preset.time);
    setLocation(preset.location);
    setSlots(preset.slots);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (title.trim().length < 5) {
      setError("Title must be at least 5 characters");
      return;
    }
    if (description.trim().length < 10) {
      setError("Description must be at least 10 characters");
      return;
    }
    if (!date || !time) {
      setError("Please select both date and time");
      return;
    }
    if (!location.trim()) {
      setError("Please enter a location");
      return;
    }
    if (slots < 1 || slots > 50) {
      setError("Slots must be between 1 and 50");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await createActivity({
        title: title.trim(),
        description: description.trim(),
        category,
        date,
        time,
        location: location.trim(),
        slots,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create activity");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">
              Propose New Activity
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Host an event and invite buddies nearby
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-grow overflow-y-auto p-6 space-y-5"
        >
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-2.5">
              <Info className="h-5 w-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 dark:text-red-300 font-semibold">
                {error}
              </p>
            </div>
          )}

          {/* Quick Preset Templates */}
          <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/60 rounded-xl p-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
              <span className="text-sky-500 dark:text-sky-400 animate-pulse">
                ⚡
              </span>{" "}
              Quick Fill Presets (1-Click Proposal)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_PRESETS.map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-sky-500 dark:hover:border-sky-500/80 hover:text-sky-600 dark:hover:text-sky-400 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 transition-all cursor-pointer shadow-sm"
                >
                  <span className="mr-0.5 text-sm">{preset.icon}</span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2.5 leading-relaxed">
              Click a preset to automatically pre-fill the entire form
              (including tomorrow's date) instantly.
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Activity Title (Min 5 chars)
            </label>
            <input
              type="text"
              placeholder="e.g. Saturday Evening Cycling or Chess Club meetup"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none shadow-inner"
              required
            />
          </div>

          {/* Choose Activity Type */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
              Choose Activity Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.values(ActivityCategory).map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-2.5 rounded-lg border text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      isSelected
                        ? "bg-sky-500/10 border-sky-500 text-sky-600 dark:text-sky-400 font-bold shadow-sm"
                        : "bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {cat.charAt(0) + cat.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Description (Min 10 chars)
            </label>
            <textarea
              placeholder="Tell buddies what you have planned, where to meet, any gear to bring, and expectations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={4}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none resize-none shadow-inner"
              required
            />
          </div>

          {/* Date and Time (2 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-550" />{" "}
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white transition-all outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-550" />{" "}
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white transition-all outline-none"
                required
              />
            </div>
          </div>

          {/* Location and Slots (2 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-550" />{" "}
                Meeting Spot
              </label>
              <input
                type="text"
                placeholder="e.g. Central Park East Gate or Starbucks Downtown"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-450 dark:placeholder-slate-500 transition-all outline-none shadow-inner"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400 dark:text-slate-550" />{" "}
                Max Spots
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={slots}
                onChange={(e) => setSlots(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white transition-all outline-none shadow-inner"
                required
              />
            </div>
          </div>

          {/* Bottom actions */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-slate-900 hover:text-black font-bold rounded-xl text-xs shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
