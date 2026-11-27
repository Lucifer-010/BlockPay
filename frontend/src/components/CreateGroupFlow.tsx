import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Globe,
  Info,
  MapPin,
  Share2,
  Sparkles,
  Tag,
  Users,
  Wallet,
} from 'lucide-react';
import { CreateGroupInput, Group, UserSession } from '../types';
import { AvatarBadge } from './BrandPrimitives';
import { WelcomeReadyIllustration } from './Illustrations';
import { buildInviteLink, formatInviteDisplay } from '../utils/inviteLink';

export interface CreateGroupParams extends CreateGroupInput {}

interface CreateGroupScreenProps {
  user?: UserSession;
  onCancel: () => void;
  onCreate: (params: CreateGroupParams) => void;
}

interface CategoryOption {
  id: string;
  label: string;
  icon: string;
  defaultDesc: string;
}

const CATEGORIES: CategoryOption[] = [
  {
    id: 'home',
    label: 'Home & Rent',
    icon: '🏠',
    defaultDesc: 'Rent, utility bills, Wi-Fi, and weekly household groceries.',
  },
  {
    id: 'trip',
    label: 'Trip & Travel',
    icon: '✈️',
    defaultDesc: 'Flights, hotel stays, rental cars, and shared vacation tours.',
  },
  {
    id: 'dining',
    label: 'Dining & Drinks',
    icon: '🍕',
    defaultDesc: 'Weekend dinners, group drinks, takeout orders, and celebratory meals.',
  },
  {
    id: 'events',
    label: 'Events & Parties',
    icon: '🎉',
    defaultDesc: 'Concert tickets, party supplies, group gifts, and festival bookings.',
  },
  {
    id: 'project',
    label: 'Project & Work',
    icon: '💼',
    defaultDesc: 'Coworking space fees, team tools, software licenses, and project meals.',
  },
  {
    id: 'vacation',
    label: 'Vacation House',
    icon: '🏖️',
    defaultDesc: 'Beach house rental, barbecue supplies, gear rentals, and excursions.',
  },
  {
    id: 'sports',
    label: 'Sports & Fitness',
    icon: '⚽',
    defaultDesc: 'Court rentals, tournament entries, group fitness, and league kits.',
  },
  {
    id: 'other',
    label: 'Other Cost',
    icon: '✨',
    defaultDesc: 'Any shared cost among friends, settled smoothly in USDC.',
  },
];

interface ThemeColorOption {
  id: string;
  name: string;
  gradient: string;
  bgHex: string;
  badgeHex: string;
  accentBorder: string;
}

const THEME_COLORS: ThemeColorOption[] = [
  {
    id: 'emerald',
    name: 'Emerald Forest',
    gradient: 'from-[#15803D] via-[#166534] to-[#052E16]',
    bgHex: '#15803D',
    badgeHex: '#33C773',
    accentBorder: '#86EFAC',
  },
  {
    id: 'ocean',
    name: 'Ocean Wave',
    gradient: 'from-[#0284C7] via-[#0369A1] to-[#082F49]',
    bgHex: '#0284C7',
    badgeHex: '#38BDF8',
    accentBorder: '#7DD3FC',
  },
  {
    id: 'sunset',
    name: 'Sunset Amber',
    gradient: 'from-[#EA580C] via-[#C2410C] to-[#431407]',
    bgHex: '#EA580C',
    badgeHex: '#FB923C',
    accentBorder: '#FDBA74',
  },
  {
    id: 'violet',
    name: 'Royal Violet',
    gradient: 'from-[#7C3AED] via-[#6D28D9] to-[#2E1065]',
    bgHex: '#7C3AED',
    badgeHex: '#A78BFA',
    accentBorder: '#C4B5FD',
  },
  {
    id: 'rose',
    name: 'Electric Rose',
    gradient: 'from-[#E11D48] via-[#BE123C] to-[#4C0519]',
    bgHex: '#E11D48',
    badgeHex: '#FB7185',
    accentBorder: '#FDA4AF',
  },
  {
    id: 'amber',
    name: 'Warm Honey',
    gradient: 'from-[#D97706] via-[#B45309] to-[#451A03]',
    bgHex: '#D97706',
    badgeHex: '#FBBF24',
    accentBorder: '#FDE68A',
  },
  {
    id: 'midnight',
    name: 'Midnight Dark',
    gradient: 'from-[#1C1917] via-[#292524] to-[#0C0A09]',
    bgHex: '#1C1917',
    badgeHex: '#34D399',
    accentBorder: '#A8A29E',
  },
];

const QUICK_NAMES: { name: string; category: string; icon: string; location: string }[] = [
  { name: 'Housemates', category: 'Home & Rent', icon: '🏠', location: 'Apartment 4B' },
  { name: 'Lisbon Trip 2026', category: 'Trip & Travel', icon: '✈️', location: 'Lisbon, Portugal' },
  { name: 'Friday Foodies', category: 'Dining & Drinks', icon: '🍕', location: 'Downtown' },
  { name: 'Summer Beach Villa', category: 'Vacation House', icon: '🏖️', location: 'Amalfi Coast' },
  { name: 'Ski Chalet Crew', category: 'Sports & Fitness', icon: '🎿', location: 'Lake Tahoe, CA' },
  { name: 'Hackathon Squad', category: 'Project & Work', icon: '💼', location: 'San Francisco, CA' },
];

const EMOJI_OPTIONS = ['🏠', '✈️', '🍕', '🎉', '🏖️', '🎿', '☕', '⛵', '🍻', '🌿', '🎸', '🚗', '🎮', '💡', '🌮', '⛺'];

export const CreateGroupScreen: React.FC<CreateGroupScreenProps> = ({
  user,
  onCancel,
  onCreate,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('Housemates');
  const [category, setCategory] = useState('Home & Rent');
  const [icon, setIcon] = useState('🏠');
  const [location, setLocation] = useState('Apartment 4B');
  const [description, setDescription] = useState(
    'Monthly rent, utilities, household essentials, and communal groceries.'
  );
  const [selectedThemeId, setSelectedThemeId] = useState('emerald');
  const [firstMember, setFirstMember] = useState('');
  const [error, setError] = useState('');

  const currentTheme = useMemo(
    () => THEME_COLORS.find((t) => t.id === selectedThemeId) || THEME_COLORS[0],
    [selectedThemeId]
  );

  const handleSelectQuickName = (item: (typeof QUICK_NAMES)[0]) => {
    setName(item.name);
    setCategory(item.category);
    setIcon(item.icon);
    setLocation(item.location);
    const catObj = CATEGORIES.find((c) => c.label === item.category);
    if (catObj) {
      setDescription(catObj.defaultDesc);
    }
    setError('');
  };

  const handleSelectCategory = (cat: CategoryOption) => {
    setCategory(cat.label);
    setIcon(cat.icon);
    if (!description || description === CATEGORIES.find((c) => c.label === category)?.defaultDesc) {
      setDescription(cat.defaultDesc);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a group name.');
      setStep(1);
      return;
    }

    onCreate({
      name: name.trim(),
      description: description.trim() || 'Shared expenses settled in simulated USDC.',
      category,
      location: location.trim(),
      icon,
      coverColor: currentTheme.bgHex,
      firstMember: firstMember.trim(),
    });
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-[1080px] mx-auto">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#1C1917] hover:text-[#15803D] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Groups</span>
        </button>

        {/* Step tracker */}
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#57534E]">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              step === 1 ? 'bg-[#DCFCE7] text-[#14532D]' : 'bg-[#F5F5F4] text-[#78716C]'
            }`}
          >
            1. Details & Theme
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[#A8A29E]" />
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              step === 2 ? 'bg-[#DCFCE7] text-[#14532D]' : 'bg-[#F5F5F4] text-[#78716C]'
            }`}
          >
            2. Location & Review
          </span>
        </div>
      </div>

      {/* Main Grid: Form on Left, Live Preview Card on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* FORM COLUMN */}
        <div className="lg:col-span-7 bg-white/95 rounded-[20px] border border-[#0F4024]/[0.08] shadow-glass-card p-6 sm:p-8 space-y-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDF3E4] text-[#14532D] text-[12px] font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              New Expense Group
            </span>
            <h1 className="text-[26px] font-semibold tracking-tight text-[#1C1917] leading-8">
              {step === 1 ? 'Design your shared group' : 'Location & settlement context'}
            </h1>
            <p className="text-[14px] text-[#57534E] mt-1">
              {step === 1
                ? 'Set a memorable name, category, icon, and theme gradient.'
                : 'Add location details and customize your group’s settlement purpose.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <div className="space-y-5">
                {/* Quick Inspiration Pills */}
                <div className="space-y-2">
                  <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#78716C]">
                    Quick Suggestions
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_NAMES.map((q) => (
                      <button
                        key={q.name}
                        type="button"
                        onClick={() => handleSelectQuickName(q)}
                        className={`text-[12px] px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                          name === q.name
                            ? 'bg-[#15803D] text-white border-[#15803D] shadow-sm'
                            : 'bg-[#FAFAF9] hover:bg-[#F5F5F4] text-[#1C1917] border-black/[0.08]'
                        }`}
                      >
                        <span className="mr-1">{q.icon}</span>
                        {q.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Group Name */}
                <div className="space-y-1.5">
                  <label htmlFor="group-name" className="block text-[14px] font-semibold text-[#1C1917]">
                    Group Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="group-name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setError('');
                      }}
                      placeholder="e.g. Housemates, Lisbon Trip, Friday Dinners"
                      className="w-full h-12 pl-4 pr-12 rounded-[12px] bg-[#FAFAF9] border border-[#0F4024]/15 focus:bg-white focus:border-[#15803D] focus:ring-2 focus:ring-[#15803D]/10 focus:outline-none text-[15px] font-medium text-[#1C1917] transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xl select-none">
                      {icon}
                    </div>
                  </div>
                  {error && <p className="text-[13px] text-[#DC2626] font-medium">{error}</p>}
                </div>

                {/* Category Selection */}
                <div className="space-y-2">
                  <label className="block text-[14px] font-semibold text-[#1C1917]">
                    Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CATEGORIES.map((cat) => {
                      const isSelected = category === cat.label;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectCategory(cat)}
                          className={`p-2.5 rounded-[12px] border text-left flex items-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#DCFCE7] border-[#15803D] shadow-sm text-[#14532D]'
                              : 'bg-[#FAFAF9] hover:bg-[#F5F5F4] border-black/[0.06] text-[#44403C]'
                          }`}
                        >
                          <span className="text-lg">{cat.icon}</span>
                          <span className="text-[12px] font-semibold truncate leading-tight">
                            {cat.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Emoji / Icon Selector */}
                <div className="space-y-2">
                  <label className="block text-[14px] font-semibold text-[#1C1917]">
                    Group Icon Emoji
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {EMOJI_OPTIONS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setIcon(em)}
                        className={`w-10 h-10 rounded-[10px] text-lg flex items-center justify-center transition-all cursor-pointer ${
                          icon === em
                            ? 'bg-white border-2 border-[#15803D] shadow-md scale-110'
                            : 'bg-[#FAFAF9] hover:bg-[#F5F5F4] border border-black/[0.06]'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme Color Gradient Selector */}
                <div className="space-y-2">
                  <label className="block text-[14px] font-semibold text-[#1C1917]">
                    Card Theme Style
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {THEME_COLORS.map((th) => {
                      const isSelected = selectedThemeId === th.id;
                      return (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => setSelectedThemeId(th.id)}
                          className={`relative p-2.5 rounded-[12px] border text-left transition-all cursor-pointer overflow-hidden ${
                            isSelected
                              ? 'ring-2 ring-offset-1 ring-[#15803D] border-transparent shadow-sm'
                              : 'border-black/[0.08] hover:border-black/20'
                          }`}
                        >
                          <div className={`h-6 rounded-[8px] bg-gradient-to-r ${th.gradient} mb-1.5`} />
                          <span className="text-[11px] font-semibold text-[#1C1917] truncate block">
                            {th.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Next Step CTA */}
                <div className="flex items-center justify-between pt-4 border-t border-black/[0.06]">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-5 h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[14px] font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!name.trim()) {
                        setError('Please provide a group name.');
                        return;
                      }
                      setStep(2);
                    }}
                    className="inline-flex items-center gap-2 px-6 h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[14px] font-semibold shadow-btn-primary transition-all cursor-pointer"
                  >
                    <span>Next: Details & Context</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                {/* Location */}
                <div className="space-y-1.5">
                  <label htmlFor="group-location" className="block text-[14px] font-semibold text-[#1C1917]">
                    Location / Place <span className="text-xs font-normal text-[#78716C]">(optional)</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
                    <input
                      id="group-location"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Apartment 4B, Brooklyn, NY or Lake Tahoe"
                      className="w-full h-12 pl-10 pr-4 rounded-[12px] bg-[#FAFAF9] border border-[#0F4024]/15 focus:bg-white focus:border-[#15803D] focus:ring-2 focus:ring-[#15803D]/10 focus:outline-none text-[15px] font-medium text-[#1C1917] transition-all"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label htmlFor="group-desc" className="block text-[14px] font-semibold text-[#1C1917]">
                    Group Purpose & Description
                  </label>
                  <textarea
                    id="group-desc"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what expenses this group will split..."
                    className="w-full p-3 rounded-[12px] bg-[#FAFAF9] border border-[#0F4024]/15 focus:bg-white focus:border-[#15803D] focus:ring-2 focus:ring-[#15803D]/10 focus:outline-none text-[14px] text-[#1C1917] transition-all resize-none"
                  />
                </div>

                {/* Optional Invite Note */}
                <div className="space-y-1.5">
                  <label htmlFor="first-member" className="block text-[14px] font-semibold text-[#1C1917]">
                    Invite first member <span className="text-xs font-normal text-[#78716C]">(optional)</span>
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
                    <input
                      id="first-member"
                      type="text"
                      value={firstMember}
                      onChange={(e) => setFirstMember(e.target.value)}
                      placeholder="e.g. Alex (alex@example.com or G... address)"
                      className="w-full h-12 pl-10 pr-4 rounded-[12px] bg-[#FAFAF9] border border-[#0F4024]/15 focus:bg-white focus:border-[#15803D] focus:ring-2 focus:ring-[#15803D]/10 focus:outline-none text-[14px] text-[#1C1917] transition-all"
                    />
                  </div>
                  <p className="text-[12px] text-[#78716C]">
                    You can also generate and copy a join link at any time after creating the group.
                  </p>
                </div>

                {/* Settlement badge info */}
                <div className="rounded-[12px] bg-[#F0FDF4] border border-[#BBF7D0] p-3.5 flex items-start gap-3">
                  <Wallet className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
                  <div className="text-[13px] text-[#166534] leading-5">
                    <span className="font-semibold">Simulated USDC on Stellar Testnet</span>
                    <p className="text-[12px] text-[#15803D]/90 mt-0.5">
                      All group splits and balance settlements are simulated on the Stellar test network. Zero real money moves.
                    </p>
                  </div>
                </div>

                {/* Button controls */}
                <div className="flex items-center justify-between pt-4 border-t border-black/[0.06]">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 px-4 h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[14px] font-semibold transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Design</span>
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-7 h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[15px] font-semibold shadow-btn-primary transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Create & Launch Group</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* LIVE PREVIEW COLUMN */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[#78716C] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              Live Group Preview
            </span>
            <span className="text-[11px] text-[#57534E] font-medium">Updates in real time</span>
          </div>

          {/* PREVIEW CARD */}
          <div className="rounded-[20px] bg-white border border-[#0F4024]/[0.10] shadow-[0_12px_36px_rgba(0,0,0,0.08)] overflow-hidden transition-all duration-300">
            {/* Dynamic Theme Banner */}
            <div className={`relative h-28 bg-gradient-to-r ${currentTheme.gradient} p-4 flex flex-col justify-between text-white overflow-hidden`}>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-semibold">
                  <Tag className="w-3 h-3" />
                  {category}
                </span>

                {location && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-md text-white/95 text-[11px] font-medium truncate max-w-[150px]">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{location}</span>
                  </span>
                )}
              </div>

              {/* Floating Large Icon */}
              <div className="absolute -bottom-3 right-4 w-14 h-14 rounded-2xl bg-white/90 backdrop-blur-md shadow-lg flex items-center justify-center text-3xl border border-white/50">
                {icon}
              </div>
            </div>

            {/* Card Body */}
            <div className="p-5 pt-4 space-y-4">
              <div>
                <h3 className="text-[20px] font-bold text-[#1C1917] tracking-tight leading-6 truncate">
                  {name || 'Untitled Group'}
                </h3>
                <p className="text-[13px] text-[#57534E] mt-1 line-clamp-2 leading-relaxed">
                  {description || 'Shared expenses settled in simulated USDC.'}
                </p>
              </div>

              {/* Simulated Balance Box */}
              <div className="rounded-[14px] p-3.5 bg-gradient-to-br from-[#FAFAF9] to-[#F5F5F4] border border-[#0F4024]/[0.06] space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#78716C]">
                  <span>GROUP STATUS</span>
                  <span className="text-[#15803D] flex items-center gap-1 font-num">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                    Stellar Testnet
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[20px] font-bold text-[#1C1917] font-num">
                    0.00 <span className="text-[13px] font-medium text-[#78716C]">USDC</span>
                  </span>
                  <span className="text-[12px] font-medium text-[#78716C]">
                    All settled up
                  </span>
                </div>
              </div>

              {/* Group Members Preview Stack */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <AvatarBadge
                      initial={(user?.name?.[0] || 'Y').toUpperCase()}
                      bg="#166534"
                      text="#FFFFFF"
                      size="sm"
                    />
                    {firstMember && (
                      <AvatarBadge
                        initial={(firstMember[0] || 'A').toUpperCase()}
                        bg="#0284C7"
                        text="#FFFFFF"
                        size="sm"
                      />
                    )}
                    <span className="w-7 h-7 rounded-full bg-[#F5F5F4] border-2 border-white flex items-center justify-center text-[10px] font-semibold text-[#78716C]">
                      +1
                    </span>
                  </div>
                  <span className="text-[12px] font-medium text-[#57534E]">
                    {firstMember ? '2 members' : '1 member (you)'}
                  </span>
                </div>

                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#14532D]">
                  Admin
                </span>
              </div>

              {/* Simulated Invite Code Pill */}
              <div className="pt-2 border-t border-black/[0.06] flex items-center justify-between text-[12px] text-[#78716C]">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Globe className="w-3.5 h-3.5 text-[#15803D]" />
                  raba.pay/join/{name ? name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4) || 'grp' : 'grp'}…
                </span>
                <span className="text-[11px] font-semibold text-[#15803D]">
                  Invite link
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-[12px] bg-[#FAFAF9] border border-black/[0.06] text-[12px] text-[#57534E] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
            <p>
              This card reflects how your group will appear in your groups directory and on member invitations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface GroupCreatedScreenProps {
  group?: Group;
  onOpenGroup: () => void;
  onBackToGroups: () => void;
}

export const GroupCreatedScreen: React.FC<GroupCreatedScreenProps> = ({
  group,
  onOpenGroup,
  onBackToGroups,
}) => {
  const [copied, setCopied] = useState(false);
  const [sharedFeedback, setSharedFeedback] = useState(false);
  const inviteCode = group?.inviteCode ?? 'raba.pay/join/h8k2x9';
  const inviteFullLink = buildInviteLink(inviteCode);
  const inviteDisplay = formatInviteDisplay(inviteCode);

  const handleCopy = () => {
    navigator.clipboard?.writeText(inviteFullLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `Join ${group?.name || 'Group'} on Raba Pay`,
          text: `Split expenses in simulated USDC for ${group?.name || 'Group'} on Raba Pay.`,
          url: inviteFullLink,
        })
        .catch(() => {});
    } else {
      handleCopy();
      setSharedFeedback(true);
      setTimeout(() => setSharedFeedback(false), 1800);
    }
  };

  if (!group) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-[#57534E]">Loading group details...</p>
        <button
          type="button"
          onClick={onBackToGroups}
          className="px-5 h-11 rounded-[12px] bg-[#15803D] text-white font-semibold cursor-pointer"
        >
          View Groups
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8 max-w-[620px] mx-auto">
      <div className="md:hidden">
        <button
          type="button"
          onClick={onBackToGroups}
          className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[#1C1917] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Groups</span>
        </button>
      </div>

      <div className="rounded-[20px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card overflow-hidden">
        {/* Banner with Group Details */}
        <div
          className="p-6 sm:p-8 text-center space-y-4 text-white relative overflow-hidden"
          style={{
            backgroundColor: group.coverColor || '#15803D',
            backgroundImage: `linear-gradient(135deg, ${group.coverColor || '#15803D'} 0%, #052E16 100%)`,
          }}
        >
          <span className="text-5xl block animate-bounce">{group.icon || '🏠'}</span>
          <div className="space-y-1">
            <h1 className="text-[28px] font-bold tracking-tight text-white leading-8">
              {group.name} is ready!
            </h1>
            <p className="text-[14px] text-white/85">
              {group.category ? `${group.category} · ` : ''}
              {group.location ? `📍 ${group.location}` : 'Ready to split bills'}
            </p>
          </div>
        </div>

        {/* Content Box */}
        <div className="p-6 sm:p-8 space-y-5">
          <div className="rounded-[14px] bg-[#FAFAF9] border border-[#0F4024]/10 p-4 space-y-3">
            <div className="flex items-center justify-between text-[12px] font-semibold text-[#78716C]">
              <span>INVITE LINK</span>
              <span className="text-[#15803D]">Share with friends or housemates</span>
            </div>
            <p
              className="font-num text-[14px] font-semibold text-[#1C1917] truncate bg-white p-2.5 rounded-[10px] border border-black/[0.06] select-all cursor-pointer"
              title={inviteFullLink}
              onClick={handleCopy}
            >
              {inviteFullLink}
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="h-11 rounded-[10px] bg-white border border-[#0F4024]/15 hover:bg-[#F5F5F4] text-[#1C1917] text-[14px] font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-[#15803D]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Link Copied!' : 'Copy invite link'}</span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="h-11 rounded-[10px] bg-white border border-[#0F4024]/15 hover:bg-[#F5F5F4] text-[#1C1917] text-[14px] font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>{sharedFeedback ? 'Link copied' : 'Share invite'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenGroup}
              className="w-full sm:flex-1 h-12 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[15px] font-semibold shadow-btn-primary transition-all cursor-pointer"
            >
              Open Group Ledger
            </button>
            <button
              type="button"
              onClick={onBackToGroups}
              className="w-full sm:w-auto px-6 h-12 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold transition-colors cursor-pointer"
            >
              All Groups
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
